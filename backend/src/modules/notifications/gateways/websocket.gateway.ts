import {
  WebSocketGateway as BaseWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { Notification } from '../../../database/entities/notification.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: User;
}

interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  socketIds: Set<string>;
  currentRoom?: string;
  metadata?: {
    platform?: string;
    version?: string;
    timezone?: string;
  };
}

@BaseWebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private readonly connectedUsers = new Map<string, UserPresence>();
  private readonly socketUserMap = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.user = user;
      this.socketUserMap.set(client.id, user.id);

      // Update user presence
      this.updateUserPresence(user.id, client.id, 'online');

      // Join user to their personal room
      client.join(`user:${user.id}`);

      // Join organization room if applicable
      if (user.organizationId) {
        client.join(`org:${user.organizationId}`);
      }

      // Send initial data
      await this.sendInitialData(client);

      // Broadcast user online status
      this.broadcastPresenceUpdate(user.id, 'online');

      this.logger.log(`User ${user.id} connected with socket ${client.id}`);
    } catch (error) {
      this.logger.error('Connection authentication failed', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.socketUserMap.get(client.id);
    if (userId) {
      this.socketUserMap.delete(client.id);
      this.updateUserPresence(userId, client.id, 'offline');
      
      // Check if user has other active connections
      const userPresence = this.connectedUsers.get(userId);
      if (userPresence && userPresence.socketIds.size === 0) {
        userPresence.status = 'offline';
        userPresence.lastSeen = new Date();
        this.broadcastPresenceUpdate(userId, 'offline');
      }

      this.logger.log(`User ${userId} disconnected socket ${client.id}`);
    }
  }

  // Event listeners for real-time notifications
  @OnEvent('notification.in_app')
  handleInAppNotification(data: { userId: string; notification: any }) {
    this.server.to(`user:${data.userId}`).emit('notification', {
      type: 'notification',
      data: data.notification,
    });

    this.logger.log(`Sent in-app notification to user ${data.userId}`);
  }

  @OnEvent('application.status.updated')
  handleApplicationStatusUpdate(data: { 
    applicationId: string; 
    status: string; 
    candidateId?: string;
    recruiterId?: string;
    organizationId?: string;
  }) {
    // Notify candidate
    if (data.candidateId) {
      this.server.to(`user:${data.candidateId}`).emit('application_update', {
        type: 'application_status_changed',
        applicationId: data.applicationId,
        status: data.status,
        timestamp: new Date(),
      });
    }

    // Notify recruiter
    if (data.recruiterId) {
      this.server.to(`user:${data.recruiterId}`).emit('application_update', {
        type: 'application_status_changed',
        applicationId: data.applicationId,
        status: data.status,
        timestamp: new Date(),
      });
    }

    // Notify organization
    if (data.organizationId) {
      this.server.to(`org:${data.organizationId}`).emit('application_update', {
        type: 'application_status_changed',
        applicationId: data.applicationId,
        status: data.status,
        timestamp: new Date(),
      });
    }
  }

  @OnEvent('interview.scheduled')
  handleInterviewScheduled(data: {
    interviewId: string;
    candidateId: string;
    interviewerId: string;
    scheduledAt: Date;
  }) {
    // Notify candidate
    this.server.to(`user:${data.candidateId}`).emit('interview_update', {
      type: 'interview_scheduled',
      interviewId: data.interviewId,
      scheduledAt: data.scheduledAt,
      timestamp: new Date(),
    });

    // Notify interviewer
    this.server.to(`user:${data.interviewerId}`).emit('interview_update', {
      type: 'interview_scheduled',
      interviewId: data.interviewId,
      scheduledAt: data.scheduledAt,
      timestamp: new Date(),
    });
  }

  @OnEvent('interview.started')
  handleInterviewStarted(data: {
    interviewId: string;
    roomId: string;
    participants: string[];
  }) {
    // Create interview room
    data.participants.forEach(userId => {
      this.server.to(`user:${userId}`).emit('interview_started', {
        type: 'interview_started',
        interviewId: data.interviewId,
        roomId: data.roomId,
        timestamp: new Date(),
      });
    });
  }

  @OnEvent('course.enrollment')
  handleCourseEnrollment(data: {
    courseId: string;
    userId: string;
    instructorId: string;
  }) {
    // Notify student
    this.server.to(`user:${data.userId}`).emit('course_update', {
      type: 'enrollment_confirmed',
      courseId: data.courseId,
      timestamp: new Date(),
    });

    // Notify instructor
    this.server.to(`user:${data.instructorId}`).emit('course_update', {
      type: 'new_enrollment',
      courseId: data.courseId,
      studentId: data.userId,
      timestamp: new Date(),
    });
  }

  // Socket message handlers
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; roomType: 'interview' | 'course' | 'organization' }
  ) {
    if (!client.userId) return;

    client.join(data.roomId);
    
    // Update user presence
    const userPresence = this.connectedUsers.get(client.userId);
    if (userPresence) {
      userPresence.currentRoom = data.roomId;
    }

    // Notify others in the room
    client.to(data.roomId).emit('user_joined_room', {
      userId: client.userId,
      userName: client.user?.firstName + ' ' + client.user?.lastName,
      timestamp: new Date(),
    });

    this.logger.log(`User ${client.userId} joined room ${data.roomId}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string }
  ) {
    if (!client.userId) return;

    client.leave(data.roomId);
    
    // Update user presence
    const userPresence = this.connectedUsers.get(client.userId);
    if (userPresence && userPresence.currentRoom === data.roomId) {
      userPresence.currentRoom = undefined;
    }

    // Notify others in the room
    client.to(data.roomId).emit('user_left_room', {
      userId: client.userId,
      userName: client.user?.firstName + ' ' + client.user?.lastName,
      timestamp: new Date(),
    });

    this.logger.log(`User ${client.userId} left room ${data.roomId}`);
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string }
  ) {
    if (!client.userId) return;

    client.to(data.roomId).emit('user_typing', {
      userId: client.userId,
      userName: client.user?.firstName + ' ' + client.user?.lastName,
      isTyping: true,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string }
  ) {
    if (!client.userId) return;

    client.to(data.roomId).emit('user_typing', {
      userId: client.userId,
      userName: client.user?.firstName + ' ' + client.user?.lastName,
      isTyping: false,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('update_presence')
  handleUpdatePresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: 'online' | 'away' | 'busy'; metadata?: any }
  ) {
    if (!client.userId) return;

    this.updateUserPresence(client.userId, client.id, data.status, data.metadata);
    this.broadcastPresenceUpdate(client.userId, data.status);
  }

  @SubscribeMessage('mark_notification_read')
  async handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string }
  ) {
    if (!client.userId) return;

    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: data.notificationId, userId: client.userId },
      });

      if (notification && !notification.isRead) {
        notification.markAsRead();
        await this.notificationRepository.save(notification);

        client.emit('notification_read_confirmed', {
          notificationId: data.notificationId,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Failed to mark notification as read', error);
    }
  }

  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { organizationId?: string; roomId?: string }
  ) {
    if (!client.userId) return;

    const onlineUsers: Array<{ userId: string; status: string; lastSeen: Date }> = [];

    for (const [userId, presence] of this.connectedUsers.entries()) {
      if (presence.status !== 'offline') {
        // Filter by organization if specified
        if (data.organizationId) {
          // Would need to check user's organization - simplified for now
          onlineUsers.push({
            userId,
            status: presence.status,
            lastSeen: presence.lastSeen,
          });
        } else {
          onlineUsers.push({
            userId,
            status: presence.status,
            lastSeen: presence.lastSeen,
          });
        }
      }
    }

    client.emit('online_users', {
      users: onlineUsers,
      timestamp: new Date(),
    });
  }

  // Public methods for external use
  sendNotificationToUser(userId: string, notification: any): void {
    this.server.to(`user:${userId}`).emit('notification', {
      type: 'notification',
      data: notification,
    });
  }

  sendMessageToRoom(roomId: string, message: any): void {
    this.server.to(roomId).emit('room_message', message);
  }

  broadcastToOrganization(organizationId: string, event: string, data: any): void {
    this.server.to(`org:${organizationId}`).emit(event, data);
  }

  getUserPresence(userId: string): UserPresence | undefined {
    return this.connectedUsers.get(userId);
  }

  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys()).filter(userId => {
      const presence = this.connectedUsers.get(userId);
      return presence && presence.status !== 'offline';
    });
  }

  // Private helper methods
  private extractTokenFromSocket(client: Socket): string | null {
    const token = client.handshake.auth?.token || 
                 client.handshake.headers?.authorization?.replace('Bearer ', '') ||
                 client.request.headers?.authorization?.replace('Bearer ', '');
    
    return token || null;
  }

  private updateUserPresence(
    userId: string, 
    socketId: string, 
    status: 'online' | 'away' | 'busy' | 'offline',
    metadata?: any
  ): void {
    let presence = this.connectedUsers.get(userId);
    
    if (!presence) {
      presence = {
        userId,
        status: 'offline',
        lastSeen: new Date(),
        socketIds: new Set(),
      };
      this.connectedUsers.set(userId, presence);
    }

    if (status === 'offline') {
      presence.socketIds.delete(socketId);
      if (presence.socketIds.size === 0) {
        presence.status = 'offline';
        presence.lastSeen = new Date();
      }
    } else {
      presence.socketIds.add(socketId);
      presence.status = status;
      presence.lastSeen = new Date();
      
      if (metadata) {
        presence.metadata = { ...presence.metadata, ...metadata };
      }
    }
  }

  private broadcastPresenceUpdate(userId: string, status: string): void {
    // Broadcast to user's organization and active rooms
    const presence = this.connectedUsers.get(userId);
    if (presence) {
      this.server.emit('presence_update', {
        userId,
        status,
        timestamp: new Date(),
      });
    }
  }

  private async sendInitialData(client: AuthenticatedSocket): Promise<void> {
    if (!client.userId) return;

    try {
      // Send unread notification count
      const unreadCount = await this.notificationRepository.count({
        where: {
          userId: client.userId,
          readAt: null,
        },
      });

      client.emit('initial_data', {
        unreadNotifications: unreadCount,
        onlineUsers: this.getOnlineUsers().length,
        timestamp: new Date(),
      });

      // Send recent notifications
      const recentNotifications = await this.notificationRepository.find({
        where: { userId: client.userId },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      client.emit('recent_notifications', {
        notifications: recentNotifications.map(n => ({
          id: n.id,
          subject: n.subject,
          body: n.body,
          priority: n.priority,
          channel: n.channel,
          isRead: n.isRead,
          createdAt: n.createdAt,
        })),
      });
    } catch (error) {
      this.logger.error('Failed to send initial data', error);
    }
  }

  // Cleanup method for graceful shutdown
  onModuleDestroy(): void {
    this.connectedUsers.clear();
    this.socketUserMap.clear();
    this.logger.log('WebSocket Gateway destroyed');
  }
}
