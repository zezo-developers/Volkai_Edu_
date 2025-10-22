import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@database/entities/user.entity';
import { Organization } from '@database/entities/organization.entity';
import { OrganizationMembership } from '@database/entities/organization-membership.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

/**
 * Authentication Module
 * Provides complete authentication functionality including JWT tokens,
 * user registration, login, password management, and RBAC
 */
@Module({
  imports: [
    // Import required entities
    TypeOrmModule.forFeature([User, Organization, OrganizationMembership]),
    
    // Passport configuration
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // JWT configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
