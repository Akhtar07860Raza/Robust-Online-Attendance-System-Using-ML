import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  FileDown, 
  LayoutDashboard, 
  BookOpen, 
  Bell,
  Search,
  MoreVertical,
  GraduationCap,
  Loader2,
  ClipboardCheck,
  Upload,
  FileText,
  Megaphone,
  Check,
  X,
  Eye,
  LogOut
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const mockChartData = [
  { name: 'Week 1', attendance: 85 },
  { name: 'Week 2', attendance: 82 },
  { name: 'Week 3', attendance: 88 },
  { name: 'Week 4', attendance: 79 },
  { name: 'Week 5', attendance: 85 },
  { name: 'Week 6', attendance: 91 },
];

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClass, setSelectedClass] = useState('CV401');
  
  // Announcement State
  const [announcement, setAnnouncement] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/faculty/dashboard').then(res => res.json()),
      fetch('/api/faculty/students').then(res => res.json())
    ]).then(([dash, studs]) => {
      setDashboardData(dash);
      setStudents(studs);
      setLoading(false);
    });
  }, []);

  const handleAttendanceChange = (id: number, status: string) => {
    toast.success(`Attendance updated for student ID ${id}`);
  };

  const handleLeaveAction = (id: number, action: 'approve' | 'reject') => {
    toast.success(`Leave request ${action}ed successfully!`);
  };

  const handleSendAnnouncement = async () => {
    if (!announcement.trim()) return;
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSending(false);
    setAnnouncement('');
    toast.success("Announcement sent to all students in " + selectedClass);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

  const { faculty, classes, atRiskStudents, recentActivity, leaveRequests, courseMaterials, schedule } = dashboardData;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col p-6 space-y-8 shadow-sm z-10">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">UniPortal<span className="text-indigo-600">.</span></span>
        </div>

        <nav className="space-y-1.5">
          <Button variant={activeTab === 'overview' ? 'secondary' : 'ghost'} className={`w-full justify-start gap-3 ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard Overview
          </Button>
          <Button variant={activeTab === 'students' ? 'secondary' : 'ghost'} className={`w-full justify-start gap-3 ${activeTab === 'students' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('students')}>
            <Users className="h-4 w-4" /> Manage Students
          </Button>
          <Button variant={activeTab === 'leave' ? 'secondary' : 'ghost'} className={`w-full justify-start gap-3 ${activeTab === 'leave' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('leave')}>
            <ClipboardCheck className="h-4 w-4" /> Leave Requests
            {leaveRequests?.length > 0 && <Badge className="ml-auto bg-rose-500 text-white border-none h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{leaveRequests.length}</Badge>}
          </Button>
          <Button variant={activeTab === 'materials' ? 'secondary' : 'ghost'} className={`w-full justify-start gap-3 ${activeTab === 'materials' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('materials')}>
            <BookOpen className="h-4 w-4" /> Course Materials
          </Button>
          <Button variant={activeTab === 'schedule' ? 'secondary' : 'ghost'} className={`w-full justify-start gap-3 ${activeTab === 'schedule' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('schedule')}>
            <Calendar className="h-4 w-4" /> Teaching Schedule
          </Button>
          <Button variant={activeTab === 'analytics' ? 'secondary' : 'ghost'} className={`w-full justify-start gap-3 ${activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('analytics')}>
            <TrendingUp className="h-4 w-4" /> Class Analytics
          </Button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
              {faculty.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-bold text-slate-900">{faculty.name}</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{faculty.designation}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 capitalize">Faculty {activeTab}</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">{faculty.department} Department • Academic Year 2025-2026</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="relative border-slate-200 text-slate-600 hover:bg-slate-50">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-rose-500 border-2 border-white rounded-full" />
              </Button>
              
              <Dialog>
                <DialogTrigger render={
                  <Button className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
                    <Megaphone className="h-4 w-4" />
                    New Announcement
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Announcement</DialogTitle>
                    <DialogDescription>
                      This message will be sent to all students enrolled in {selectedClass}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Target Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.id} - {c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <textarea 
                        className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Type your announcement here..."
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSendAnnouncement} disabled={isSending || !announcement.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                      {isSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Send to Students"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-white border border-slate-200 p-1 h-12 rounded-xl shadow-sm md:hidden overflow-x-auto">
              <TabsTrigger value="overview" className="rounded-lg px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Overview</TabsTrigger>
              <TabsTrigger value="students" className="rounded-lg px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Students</TabsTrigger>
              <TabsTrigger value="leave" className="rounded-lg px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Leave</TabsTrigger>
              <TabsTrigger value="materials" className="rounded-lg px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Materials</TabsTrigger>
              <TabsTrigger value="schedule" className="rounded-lg px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Schedule</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg px-4 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {classes.map((cls: any) => (
                  <Card key={cls.id} className="hover:shadow-lg transition-all border-slate-100 shadow-sm group cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5">{cls.id}</Badge>
                        <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{cls.students} Students</span>
                      </div>
                      <CardTitle className="text-lg font-bold mt-3 text-slate-800 group-hover:text-indigo-600 transition-colors">{cls.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-col">
                          <span className="text-3xl font-black text-slate-900">{cls.avgAttendance}%</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Avg. Attendance</span>
                        </div>
                        <div className="text-right bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Next Class</span>
                          <span className="text-xs font-bold text-indigo-600">{cls.nextClass}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Trends Chart */}
                <Card className="lg:col-span-2 border-slate-100 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-800">Attendance Trends</CardTitle>
                        <CardDescription>Average attendance across all courses over the last 6 weeks.</CardDescription>
                      </div>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Courses</SelectItem>
                          {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.id}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mockChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} domain={[60, 100]} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="attendance" 
                            stroke="#4f46e5" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* At Risk Students */}
                <Card className="border-slate-100 shadow-sm flex flex-col">
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="bg-rose-100 p-1.5 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                      </div>
                      <CardTitle className="text-base font-bold text-slate-800">At-Risk Students</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                      {atRiskStudents.map((student: any) => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-rose-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold border border-rose-100 text-sm">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{student.name}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{student.enrollment}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold">
                              {student.attendance}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4 text-xs font-semibold text-slate-600 border-slate-200">View All At-Risk</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="students" className="space-y-6">
              <Card className="border-slate-100 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">Student Roster</CardTitle>
                    <CardDescription className="mt-1">Manage attendance and records for your classes.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-[160px] h-9 border-slate-200 font-medium text-sm">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.id} - {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input placeholder="Search students..." className="pl-9 w-[200px] h-9 border-slate-200 text-sm" />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 border-slate-200 text-slate-600">
                      <FileDown className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-slate-50 border-slate-100">
                        <TableHead className="font-semibold text-slate-600 pl-6">Student</TableHead>
                        <TableHead className="font-semibold text-slate-600">Enrollment</TableHead>
                        <TableHead className="font-semibold text-slate-600">Overall Attendance</TableHead>
                        <TableHead className="font-semibold text-slate-600">Today's Status</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600 pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                {student.name.charAt(0)}
                              </div>
                              <span className="font-semibold text-slate-800">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs font-mono font-medium bg-slate-50/50 rounded-md px-2 py-1 inline-block mt-3">{student.enrollment}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Progress value={student.attendance} className={`w-24 h-2 ${student.attendance < 75 ? 'bg-rose-100 [&>div]:bg-rose-500' : 'bg-emerald-100 [&>div]:bg-emerald-500'}`} />
                              <span className={`text-xs font-bold ${student.attendance < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {student.attendance}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select defaultValue={student.status.toLowerCase()} onValueChange={(v) => handleAttendanceChange(student.id, v)}>
                              <SelectTrigger className={`w-[120px] h-8 text-xs font-bold border-0 shadow-sm ${
                                student.status.toLowerCase() === 'present' ? 'bg-emerald-50 text-emerald-700' : 
                                student.status.toLowerCase() === 'absent' ? 'bg-rose-50 text-rose-700' : 
                                'bg-amber-50 text-amber-700'
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present" className="text-emerald-700 font-medium">Present</SelectItem>
                                <SelectItem value="absent" className="text-rose-700 font-medium">Absent</SelectItem>
                                <SelectItem value="late" className="text-amber-700 font-medium">Late</SelectItem>
                                <SelectItem value="excused" className="text-indigo-700 font-medium">Excused</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leave" className="space-y-6">
              <Card className="border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-800">Student Leave Requests</CardTitle>
                  <CardDescription>Review and manage student leave applications and medical certificates.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-slate-100">
                        <TableHead className="font-semibold text-slate-600 pl-6">Student</TableHead>
                        <TableHead className="font-semibold text-slate-600">Reason</TableHead>
                        <TableHead className="font-semibold text-slate-600">Duration</TableHead>
                        <TableHead className="font-semibold text-slate-600">Attachment</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((req: any) => (
                        <TableRow key={req.id} className="border-slate-100">
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{req.studentName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{req.enrollment}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-bold">
                              {req.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-medium">
                            {req.startDate} <span className="text-slate-400 mx-1">to</span> {req.endDate}
                          </TableCell>
                          <TableCell>
                            {req.attachment ? (
                              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                <Eye className="h-3 w-3" /> View Document
                              </Button>
                            ) : (
                              <span className="text-[10px] text-slate-400">No attachment</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => handleLeaveAction(req.id, 'reject')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleLeaveAction(req.id, 'approve')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-slate-100 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-800">Course Materials</CardTitle>
                      <CardDescription>Upload and manage resources for your students.</CardDescription>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                      <Upload className="h-4 w-4" /> Upload New
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="border-slate-100">
                          <th className="p-4 text-left font-semibold text-slate-600">Resource Name</th>
                          <th className="p-4 text-left font-semibold text-slate-600">Course</th>
                          <th className="p-4 text-left font-semibold text-slate-600">Size</th>
                          <th className="p-4 text-left font-semibold text-slate-600 text-right">Actions</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courseMaterials.map((mat: any) => (
                          <TableRow key={mat.id} className="border-slate-100">
                            <TableCell className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                  <FileText className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800 text-sm">{mat.title}</span>
                                  <span className="text-[10px] text-slate-400">Uploaded on {mat.date}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="p-4">
                              <Badge variant="secondary" className="text-[10px] font-bold">{mat.course}</Badge>
                            </TableCell>
                            <TableCell className="p-4 text-xs text-slate-500 font-medium">{mat.size}</TableCell>
                            <TableCell className="p-4 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600">
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-800">Quick Upload</CardTitle>
                    <CardDescription>Drag and drop files here to upload to current course.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer">
                      <div className="p-3 bg-indigo-50 rounded-full mb-4">
                        <Upload className="h-6 w-6 text-indigo-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Click to upload</p>
                      <p className="text-xs text-slate-400 mt-1">or drag and drop files here</p>
                      <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">PDF, DOCX, PPTX (Max 10MB)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <Card className="border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-800">Weekly Teaching Schedule</CardTitle>
                  <CardDescription>Your assigned lectures and practical sessions for the current semester.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {schedule.map((day: any) => (
                      <div key={day.day} className="space-y-3">
                        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{day.day}</span>
                        </div>
                        <div className="space-y-2">
                          {day.classes.map((cls: any, idx: number) => (
                            <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                              <div className="text-[10px] font-bold text-indigo-600 mb-1">{cls.time}</div>
                              <div className="font-bold text-slate-800 text-xs">{cls.subject}</div>
                              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                <Users className="h-3 w-3" /> {cls.room}
                              </div>
                            </div>
                          ))}
                          {day.classes.length === 0 && (
                            <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 rounded-xl">
                              <span className="text-[10px] text-slate-400 font-medium italic">No Classes</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-100 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-800">Class Performance Distribution</CardTitle>
                    <CardDescription>Grade distribution for the current semester.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { grade: 'A+', count: 2 },
                          { grade: 'A', count: 4 },
                          { grade: 'B+', count: 2 },
                          { grade: 'B', count: 1 },
                          { grade: 'C', count: 0 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                          <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-800">Attendance Engagement</CardTitle>
                    <CardDescription>Comparison of Lecture vs Practical attendance.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {classes.map((cls: any) => (
                        <div key={cls.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">{cls.name}</span>
                            <span className="text-sm font-black text-indigo-600">{cls.avgAttendance}%</span>
                          </div>
                          <Progress value={cls.avgAttendance} className="h-2 bg-slate-100 [&>div]:bg-indigo-600" />
                        </div>
                      ))}
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                          <AlertTriangle className="h-4 w-4" />
                          <p className="text-[10px] font-bold leading-tight">
                            Practical attendance is 4% higher than lecture attendance. Consider interactive elements for lectures.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

