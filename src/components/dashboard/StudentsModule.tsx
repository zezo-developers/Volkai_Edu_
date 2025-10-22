import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Mail, 
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  User
} from 'lucide-react';

// Mock student data
const mockStudents = [
  {
    id: 1,
    name: 'Priya Sharma',
    email: 'priya.sharma@college.edu',
    phone: '+91 98765 43210',
    department: 'Computer Science',
    year: '4th Year',
    resumeStatus: 'completed',
    interviewStatus: 'completed',
    readinessScore: 85,
    instructor: 'Dr. Kumar',
    lastActive: '2 hours ago'
  },
  {
    id: 2,
    name: 'Arjun Patel',
    email: 'arjun.patel@college.edu',
    phone: '+91 98765 43211',
    department: 'Mechanical Engineering',
    year: '3rd Year',
    resumeStatus: 'in-progress',
    interviewStatus: 'scheduled',
    readinessScore: 72,
    instructor: 'Prof. Singh',
    lastActive: '1 day ago'
  },
  {
    id: 3,
    name: 'Sneha Verma',
    email: 'sneha.verma@college.edu',
    phone: '+91 98765 43212',
    department: 'Electronics',
    year: '4th Year',
    resumeStatus: 'completed',
    interviewStatus: 'not-taken',
    readinessScore: 68,
    instructor: 'Dr. Kumar',
    lastActive: '3 hours ago'
  },
  {
    id: 4,
    name: 'Rohit Gupta',
    email: 'rohit.gupta@college.edu',
    phone: '+91 98765 43213',
    department: 'Computer Science',
    year: '4th Year',
    resumeStatus: 'not-started',
    interviewStatus: 'not-taken',
    readinessScore: 45,
    instructor: 'Dr. Kumar',
    lastActive: '5 days ago'
  },
  {
    id: 5,
    name: 'Anjali Singh',
    email: 'anjali.singh@college.edu',
    phone: '+91 98765 43214',
    department: 'Civil Engineering',
    year: '3rd Year',
    resumeStatus: 'completed',
    interviewStatus: 'completed',
    readinessScore: 92,
    instructor: 'Prof. Mehta',
    lastActive: '1 hour ago'
  }
];

const getStatusBadge = (status: string, type: 'resume' | 'interview') => {
  const statusConfig = {
    'completed': { variant: 'default', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
    'in-progress': { variant: 'secondary', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
    'scheduled': { variant: 'secondary', icon: Clock, color: 'bg-blue-100 text-blue-700' },
    'not-started': { variant: 'outline', icon: XCircle, color: 'bg-gray-100 text-gray-700' },
    'not-taken': { variant: 'outline', icon: XCircle, color: 'bg-gray-100 text-gray-700' }
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{status.replace('-', ' ')}</span>
    </div>
  );
};

const getReadinessColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

export function StudentsModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || student.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || student.resumeStatus === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => setSelectedStudent(null)}
          className="mb-4"
        >
          ← Back to Students
        </Button>

        {/* Student Profile */}
        <Card className="p-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-16 w-16 bg-orange-500 text-white text-xl">
              {selectedStudent.name.charAt(0)}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedStudent.name}</h2>
                  <p className="text-muted-foreground">{selectedStudent.department} • {selectedStudent.year}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-500">{selectedStudent.readinessScore}%</div>
                  <div className="text-sm text-muted-foreground">Readiness Score</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Student Details Tabs */}
        <Tabs defaultValue="resume" className="space-y-4">
          <TabsList>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Resume Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  {getStatusBadge(selectedStudent.resumeStatus, 'resume')}
                </div>
                <div className="flex items-center justify-between">
                  <span>ATS Score:</span>
                  <span className="font-semibold">8.5/10</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Updated:</span>
                  <span className="text-muted-foreground">2 days ago</span>
                </div>
                <Button className="w-full">Download Resume</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="interviews" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Interview History</h3>
              <div className="space-y-4">
                {[
                  { type: 'Technical', date: '2024-01-15', score: 85, status: 'Completed' },
                  { type: 'HR Round', date: '2024-01-10', score: 78, status: 'Completed' },
                  { type: 'Group Discussion', date: '2024-01-05', score: 82, status: 'Completed' }
                ].map((interview, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{interview.type}</div>
                      <div className="text-sm text-muted-foreground">{interview.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{interview.score}/100</div>
                      <div className="text-sm text-muted-foreground">{interview.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Progress Reports</h3>
              <p className="text-muted-foreground">Progress tracking charts and analytics would go here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Instructor Notes</h3>
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Dr. Kumar</span>
                    <span className="text-sm text-muted-foreground">2 days ago</span>
                  </div>
                  <p className="text-sm">Student shows excellent technical skills. Recommend for advanced placement opportunities.</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">Manage and track student preparation progress</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Students
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value="all">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
            <option value="Electronics">Electronics</option>
            <option value="Civil Engineering">Civil Engineering</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="not-started">Not Started</option>
          </select>
        </div>
      </Card>

      {/* Students Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Resume Status</TableHead>
              <TableHead>Interview Status</TableHead>
              <TableHead>Readiness Score</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8 bg-orange-500 text-white">
                      {student.name.charAt(0)}
                    </Avatar>
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{student.department}</div>
                    <div className="text-sm text-muted-foreground">{student.year}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(student.resumeStatus, 'resume')}
                </TableCell>
                <TableCell>
                  {getStatusBadge(student.interviewStatus, 'interview')}
                </TableCell>
                <TableCell>
                  <span className={`font-semibold ${getReadinessColor(student.readinessScore)}`}>
                    {student.readinessScore}%
                  </span>
                </TableCell>
                <TableCell>{student.instructor}</TableCell>
                <TableCell className="text-muted-foreground">{student.lastActive}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedStudent(student)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send WhatsApp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{filteredStudents.length}</div>
          <div className="text-sm text-muted-foreground">Total Students</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {filteredStudents.filter(s => s.resumeStatus === 'completed').length}
          </div>
          <div className="text-sm text-muted-foreground">Resumes Completed</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {filteredStudents.filter(s => s.interviewStatus === 'completed').length}
          </div>
          <div className="text-sm text-muted-foreground">Interviews Completed</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">
            {Math.round(filteredStudents.reduce((acc, s) => acc + s.readinessScore, 0) / filteredStudents.length)}%
          </div>
          <div className="text-sm text-muted-foreground">Avg Readiness</div>
        </Card>
      </div>
    </div>
  );
}