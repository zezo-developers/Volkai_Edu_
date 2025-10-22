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
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Mail, 
  Users,
  TrendingUp,
  CheckCircle,
  UserPlus
} from 'lucide-react';

// Mock instructor data
const mockInstructors = [
  {
    id: 1,
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@college.edu',
    department: 'Computer Science',
    studentsAssigned: 45,
    activeStudents: 38,
    avgImprovement: 15,
    feedbackGiven: 124,
    status: 'active',
    joinDate: '2023-01-15',
    lastActive: '2 hours ago'
  },
  {
    id: 2,
    name: 'Prof. Anita Singh',
    email: 'anita.singh@college.edu',
    department: 'Mechanical Engineering',
    studentsAssigned: 32,
    activeStudents: 28,
    avgImprovement: 12,
    feedbackGiven: 89,
    status: 'active',
    joinDate: '2023-03-20',
    lastActive: '1 day ago'
  },
  {
    id: 3,
    name: 'Dr. Priya Mehta',
    email: 'priya.mehta@college.edu',
    department: 'Electronics',
    studentsAssigned: 28,
    activeStudents: 25,
    avgImprovement: 18,
    feedbackGiven: 76,
    status: 'active',
    joinDate: '2023-02-10',
    lastActive: '3 hours ago'
  },
  {
    id: 4,
    name: 'Prof. Vikram Sharma',
    email: 'vikram.sharma@college.edu',
    department: 'Civil Engineering',
    studentsAssigned: 15,
    activeStudents: 12,
    avgImprovement: 10,
    feedbackGiven: 34,
    status: 'inactive',
    joinDate: '2023-05-01',
    lastActive: '1 week ago'
  }
];

export function InstructorsModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const filteredInstructors = mockInstructors.filter(instructor =>
    instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedInstructor) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => setSelectedInstructor(null)}
          className="mb-4"
        >
          ← Back to Instructors
        </Button>

        {/* Instructor Profile */}
        <Card className="p-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-16 w-16 bg-blue-500 text-white text-xl">
              {selectedInstructor.name.split(' ').map((n: string) => n[0]).join('')}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedInstructor.name}</h2>
                  <p className="text-muted-foreground">{selectedInstructor.department}</p>
                  <p className="text-sm text-muted-foreground">{selectedInstructor.email}</p>
                  <Badge variant={selectedInstructor.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                    {selectedInstructor.status}
                  </Badge>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Assign Students
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Instructor Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-foreground">{selectedInstructor.studentsAssigned}</div>
            <div className="text-sm text-muted-foreground">Students Assigned</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{selectedInstructor.activeStudents}</div>
            <div className="text-sm text-muted-foreground">Active Students</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{selectedInstructor.avgImprovement}%</div>
            <div className="text-sm text-muted-foreground">Avg Improvement</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{selectedInstructor.feedbackGiven}</div>
            <div className="text-sm text-muted-foreground">Feedback Given</div>
          </Card>
        </div>

        {/* Assigned Students */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Assigned Students</h3>
          <div className="space-y-3">
            {[
              { name: 'Priya Sharma', department: 'Computer Science', progress: 85, status: 'Excellent' },
              { name: 'Arjun Patel', department: 'Computer Science', progress: 72, status: 'Good' },
              { name: 'Sneha Verma', department: 'Computer Science', progress: 68, status: 'Needs Work' }
            ].map((student, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8 bg-orange-500 text-white">
                    {student.name.charAt(0)}
                  </Avatar>
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.department}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{student.progress}%</div>
                  <div className="text-sm text-muted-foreground">{student.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Instructors</h1>
          <p className="text-muted-foreground">Manage faculty and track their student mentoring progress</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowAssignModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Students
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Instructor
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search instructors by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{mockInstructors.length}</div>
              <div className="text-sm text-muted-foreground">Total Instructors</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {mockInstructors.filter(i => i.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active Instructors</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {mockInstructors.reduce((acc, i) => acc + i.studentsAssigned, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Students Assigned</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {Math.round(mockInstructors.reduce((acc, i) => acc + i.avgImprovement, 0) / mockInstructors.length)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Improvement</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Instructors Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instructor</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Students Assigned</TableHead>
              <TableHead>Active Students</TableHead>
              <TableHead>Avg Improvement</TableHead>
              <TableHead>Feedback Given</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInstructors.map((instructor) => (
              <TableRow key={instructor.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8 bg-blue-500 text-white">
                      {instructor.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                    <div>
                      <div className="font-medium">{instructor.name}</div>
                      <div className="text-sm text-muted-foreground">{instructor.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{instructor.department}</TableCell>
                <TableCell>
                  <div className="font-medium">{instructor.studentsAssigned}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-green-600">{instructor.activeStudents}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-blue-600">+{instructor.avgImprovement}%</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{instructor.feedbackGiven}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={instructor.status === 'active' ? 'default' : 'secondary'}>
                    {instructor.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedInstructor(instructor)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign Students
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Student Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Assign Students to Instructors</h3>
            <p className="text-muted-foreground mb-4">
              Select students and assign them to instructors for personalized guidance.
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                Assign Students
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}