import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";
import Chatbot from '../components/Chatbot';
import { 
  AlertCircle, CheckCircle2, Clock, CalendarDays, Settings2, 
  LayoutDashboard, BookOpen, FileText, Bell, GraduationCap, 
  ChevronRight, ChevronLeft, TrendingUp, Download, Plus, User, ChevronDown, Menu, Loader2, Paperclip, LogOut, MapPin
} from 'lucide-react';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [attendanceTab, setAttendanceTab] = useState('detailed');
  const [showSimulation, setShowSimulation] = useState(false);
  const [simTotal, setSimTotal] = useState(300);
  const [simAttended, setSimAttended] = useState(246);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Leave Application State
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [leaveFile, setLeaveFile] = useState<File | null>(null);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const calculateStats = (total: number, attended: number) => {
    const percentage = total === 0 ? 100 : (attended / total) * 100;
    let status: 'Safe' | 'At Risk' | 'Critical' = 'Safe';
    if (percentage < 75) status = 'Critical';
    else if (percentage < 80) status = 'At Risk';
    const needed = percentage < 75 ? Math.ceil((0.75 * total - attended) / 0.25) : 0;
    return {
      attendancePercentage: Number(percentage.toFixed(2)),
      status,
      classesNeededFor75: Math.max(0, needed),
      totalClasses: total,
      attendedClasses: attended
    };
  };

  const stats = calculateStats(simTotal, simAttended);

  useEffect(() => {
    const studentId = user?.profile?.id || user?.id || 1;
    setLoading(true);
    fetch(`/api/student/attendance/${studentId}?offset=${weekOffset}&email=${user?.email || ''}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        if (weekOffset === 0) {
          setSimTotal(d.stats.totalClasses);
          setSimAttended(d.stats.attendedClasses);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [weekOffset, user?.profile?.id, user?.id]);

  const hasAlertedRef = React.useRef(false);

  useEffect(() => {
    if (!loading && data && stats.status === 'Critical' && !aiReport && !isAnalyzing && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      runAiAnalysis(true);
    }
  }, [loading, data, stats.status, aiReport, isAnalyzing]);

  if (loading || !data) return <div className="p-8 text-center text-zinc-500">Loading dashboard...</div>;

  const { student, detailedSubjects, holidays, timeSlots, dayWiseGrid, timetable, exams, notifications } = data;

  const runAiAnalysis = async (isAutoMail = false) => {
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        toast.error("AI Configuration Error: GEMINI_API_KEY is not defined in the environment.");
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        CONCISE ATTENDANCE DIAGNOSTIC
        STUDENT: ${data.student.name}
        CURRENT: ${stats.attendancePercentage}% (Target: 75%)
        SESSIONS NEEDED: You need to attend exactly ${stats.classesNeededFor75} more consecutive sessions to reach 75%.
        
        CRITICAL SUBJECTS (<75%):
        ${data.detailedSubjects
          .filter(s => s.percentage < 75)
          .map(s => `- ${s.name} (${s.code}): ${s.percentage}%`)
          .join('\n')}
        
        TASK:
        Write a short, 3-4 sentence urgent warning message. 
        Focus ONLY on the subjects above and the exact number of sessions needed.
        Keep it professional but very brief.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const report = response.text || "Unable to generate report.";
      setAiReport(report);

      if (isAutoMail && stats.status === 'Critical') {
        const studentEmail = user?.email || data?.student?.email;
        console.log(`[ALERT] Triggering critical diagnostic for ${studentEmail}`);
        
        if (!studentEmail || studentEmail === 'student@university.edu') {
          console.warn("[ALERT] No valid student email found for diagnostic dispatch.");
          return;
        }

        const mailRes = await fetch('/api/mail/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: studentEmail,
            studentName: data.student.name,
            currentAttendance: stats.attendancePercentage,
            requiredSessions: stats.classesNeededFor75,
            message: report
          })
        });
        
        const mailData = await mailRes.json();
        if (mailRes.ok && mailData.success) {
          toast.warning("Low Attendance Alert Protocol: Warning email has been dispatched.", {
            description: `Sent to ${data.student.email || 'akhtar087650raza@gmail.com'}`
          });
        } else {
          toast.error("Alert System Bypass: Email failed to send.", {
            description: mailData.error || "Check SMTP configuration in settings."
          });
        }
      } else if (!isAutoMail) {
        toast.success("AI Analysis Complete and Predictive Shield Updated.");
      }
    } catch (error) {
      console.error(error);
      toast.error("AI Diagnostic Fault: Connectivity error.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalDelivered = detailedSubjects?.reduce((acc: number, curr: any) => acc + curr.delivered, 0) || 0;
  const totalAttended = detailedSubjects.reduce((acc: number, curr: any) => acc + curr.attended, 0);
  const totalPercentage = ((totalAttended / totalDelivered) * 100).toFixed(2);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Safe': return 'bg-green-500';
      case 'At Risk': return 'bg-yellow-500';
      case 'Critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    
    // Simulate API call and file upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmittingLeave(false);
    setLeaveFile(null);
    setIsLeaveDialogOpen(false);
    
    if (leaveFile) {
      toast.success(`Leave request submitted successfully with attachment: ${leaveFile.name}`);
    } else {
      toast.success("Leave request submitted successfully!");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans selection:bg-indigo-100">
      
      {/* Sidebar - Solid and Professional */}
      <aside className="hidden md:flex w-72 bg-[#001529] text-white/80 border-r border-[#002140] flex-col h-screen sticky top-0 overflow-y-auto z-40">
        <div className="p-6 space-y-8 flex-1 flex flex-col">
          
          {/* Logo with technical flair */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-900/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-white block leading-none">UniPortal</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-black">University OS</span>
            </div>
          </div>

          {/* Nav - Clean, Active States */}
          <nav className="space-y-1.5 pt-4">
            <Button 
              variant="ghost" 
              className={`w-full justify-start gap-3 h-11 px-4 transition-all duration-200 ${
                activeTab === 'overview' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'hover:bg-white/10 hover:text-white'
              }`} 
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard className="h-4 w-4" /> 
              <span className="font-semibold text-sm">System Overview</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`w-full justify-start gap-3 h-11 px-4 transition-all duration-200 ${
                activeTab === 'attendance' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'hover:bg-white/10 hover:text-white'
              }`} 
              onClick={() => setActiveTab('attendance')}
            >
              <TrendingUp className="h-4 w-4" /> 
              <span className="font-semibold text-sm">Attendance Audit</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`w-full justify-start gap-3 h-11 px-4 transition-all duration-200 ${
                activeTab === 'timetable' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'hover:bg-white/10 hover:text-white'
              }`} 
              onClick={() => setActiveTab('timetable')}
            >
              <CalendarDays className="h-4 w-4" /> 
              <span className="font-semibold text-sm">Schedule Engine</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`w-full justify-start gap-3 h-11 px-4 transition-all duration-200 ${
                activeTab === 'resources' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'hover:bg-white/10 hover:text-white'
              }`} 
              onClick={() => setActiveTab('resources')}
            >
              <BookOpen className="h-4 w-4" /> 
              <span className="font-semibold text-sm">Resource Depot</span>
            </Button>
          </nav>

          {/* Action Center */}
          <div className="mt-auto space-y-4 pt-8">
            <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
              <DialogTrigger render={
                <Button className="w-full h-11 gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-900/40 rounded-xl">
                  <Plus className="h-4 w-4" /> Finalize Leave
                </Button>
              } />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Leave Authorization</DialogTitle>
                  <DialogDescription>Initiate a formal absence request with documentation.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLeaveSubmit} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                      <Input type="date" required disabled={isSubmittingLeave} className="bg-zinc-50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                      <Input type="date" required disabled={isSubmittingLeave} className="bg-zinc-50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Justification Type</Label>
                    <Select required disabled={isSubmittingLeave}>
                      <SelectTrigger className="bg-zinc-50">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medical">Medical / Health</SelectItem>
                        <SelectItem value="family">Family Responsibility</SelectItem>
                        <SelectItem value="academic">Academic / Event</SelectItem>
                        <SelectItem value="other">Institutional Requirement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brief Explanation</Label>
                    <Input placeholder="Detail your request..." disabled={isSubmittingLeave} className="bg-zinc-50" />
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Evidence Upload (Optional)
                    </Label>
                    <Input 
                      type="file" 
                      className="cursor-pointer text-sm bg-zinc-50" 
                      onChange={(e) => setLeaveFile(e.target.files?.[0] || null)}
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={isSubmittingLeave}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSubmittingLeave} className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 rounded-xl font-bold">
                      {isSubmittingLeave ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Submit Authorization"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Profile Section */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                  <User className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{student.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium">#{student.enrollment}</p>
                </div>
                <Badge variant="outline" className={`${student.status === 'Active' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/50 text-rose-400'} text-[9px] px-1.5 py-0 font-bold`}>
                  {student.status.toUpperCase()}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-rose-400 hover:text-white hover:bg-rose-500/20 justify-center gap-2 h-9 rounded-xl border border-rose-500/10 font-bold"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" /> Finalize Session
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header - Technical and precise */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 z-30 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="md:hidden mr-2">
               <Menu className="h-5 w-5 text-zinc-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-zinc-900 tracking-tight capitalize">
                {activeTab} Management
              </h1>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Term Index: {student.semester} • {student.branch.split(' - ')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Simulation Toggle */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Calibration</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 px-2.5 rounded-lg text-[11px] font-black transition-all ${
                  showSimulation ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-200'
                }`}
                onClick={() => setShowSimulation(!showSimulation)}
              >
                {showSimulation ? 'SYNC ON' : 'SYNC OFF'}
              </Button>
            </div>

            <div className="flex items-center gap-3 border-l border-zinc-200 pl-6">
              <Button variant="ghost" size="icon" className="relative group rounded-full">
                <Bell className="h-5 w-5 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
              </Button>
              <div className="h-8 w-8 bg-zinc-100 rounded-full border border-zinc-200 flex items-center justify-center font-bold text-indigo-600 text-[10px]">
                {student.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {showSimulation && (
            <Card className="bg-[#18181B] text-white border-none shadow-2xl mb-8 animate-in slide-in-from-top-4 duration-300">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-indigo-400 underline underline-offset-4 decoration-2">Calibration Engine</CardTitle>
                <CardDescription className="text-zinc-400">Inject test data to verify predictive attendance algorithms.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Classes Registry</Label>
                    <Input 
                      type="number" 
                      value={simTotal} 
                      onChange={(e) => setSimTotal(Number(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-white focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Confirmed Attendance</Label>
                    <Input 
                      type="number" 
                      value={simAttended} 
                      onChange={(e) => setSimAttended(Number(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-white focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-[#111111] border-zinc-800 text-white overflow-hidden relative shadow-2xl">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <TrendingUp className="h-16 w-16" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">Total Efficiency</CardDescription>
                    <CardTitle className="text-5xl font-black font-mono tracking-tighter">
                      {stats.attendancePercentage}<span className="text-zinc-600 text-3xl">%</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Progress value={stats.attendancePercentage} className="h-1.5 flex-1 bg-white/5" />
                      <span className={`text-[10px] font-black tracking-widest ${
                        stats.status === 'Safe' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {stats.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-4 font-mono uppercase tracking-widest">{stats.attendedClasses} CONFIRMED / {stats.totalClasses} REGISTRY</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-zinc-200 shadow-sm border-t-4 border-t-indigo-600">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-zinc-400 uppercase tracking-widest text-[9px] font-bold">Scholastic GPA</CardDescription>
                    <CardTitle className="text-5xl font-black tracking-tighter text-zinc-900">
                      {student.gpa}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Status: Excellence</p>
                    <div className="mt-4">
                       <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black px-1.5 py-0">QUALIFIED</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-zinc-200 shadow-sm border-t-4 border-t-zinc-900">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-zinc-400 uppercase tracking-widest text-[9px] font-bold">Credit Registry</CardDescription>
                    <CardTitle className="text-5xl font-black tracking-tighter text-zinc-900">
                      142<span className="text-zinc-300 text-3xl">/160</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-zinc-900" style={{ width: '88%' }}></div>
                    </div>
                    <p className="text-[9px] text-zinc-400 mt-4 font-black uppercase tracking-widest">Final Audit Pending</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-zinc-200 shadow-sm border-t-4 border-t-rose-600">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-rose-400 uppercase tracking-widest text-[9px] font-bold">Next Assessment</CardDescription>
                    <CardTitle className="text-xl font-black tracking-tight text-zinc-900 leading-tight">
                      {exams[0].subject}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-rose-600 mt-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{exams[0].date}</span>
                    </div>
                    <p className="text-[9px] mt-4 font-black text-zinc-400 uppercase tracking-widest">ZONE: {exams[0].room}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* AI Predictive Diagnostics Card */}
                  <Card className={`shadow-2xl relative overflow-hidden transition-all duration-500 border-2 ${
                    stats.status === 'Critical' ? 'border-rose-500 bg-white' : 'border-emerald-100 bg-white'
                  }`}>
                    {stats.status === 'Critical' && (
                      <div className="absolute top-0 right-0 p-4">
                        <div className="animate-pulse flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
                          <AlertCircle className="h-3 w-3" /> CRITICAL DEFICIT
                        </div>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                          <Loader2 className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        </div>
                        AI Predictive Diagnostics
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-zinc-500">
                        Real-time risk assessment and automated mitigation triggers.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {stats.status === 'Critical' ? (
                        <div className="bg-rose-100/50 border border-rose-200 p-5 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-rose-900 font-black text-sm uppercase tracking-tighter">75% Recovery Threshold</p>
                            <span className="text-rose-600 font-mono text-2xl font-black">+{stats.classesNeededFor75}</span>
                          </div>
                          <p className="text-xs text-rose-700 leading-relaxed font-medium">
                            <span className="font-bold underline uppercase">Status: In Danger.</span> You must attend exactly <span className="font-black underline">{stats.classesNeededFor75}</span> consecutive sessions to restore your standing to 75%. 
                            UniPortal AI has prioritized automated mail alerts.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                          <p className="text-emerald-800 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Predictive Shield Active
                          </p>
                          <p className="text-xs text-emerald-600 mt-1 font-medium">No immediate risk detected. Your standing is within the "Secure" threshold. AI monitoring remains active.</p>
                        </div>
                      )}
                      
                      <div className="pt-2">
                        <Button 
                          onClick={() => runAiAnalysis()} 
                          disabled={isAnalyzing}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] tracking-widest uppercase py-7 rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-300 transition-all border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1"
                        >
                          {isAnalyzing ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" /> ANALYZING SYSTEM TELEMETRY...
                            </div>
                          ) : (
                            'Run Comprehensive AI Diagnostics'
                          )}
                        </Button>
                      </div>

                      {aiReport && (
                        <div className="mt-6 animate-in zoom-in-95 slide-in-from-top-2 duration-500">
                          <div className="border-t border-zinc-100 pt-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Personalized Recovery Roadmap</h4>
                              <Badge className="bg-zinc-100 text-zinc-600 text-[9px] font-black">AI GENERATED</Badge>
                            </div>
                            <div className="bg-zinc-50 border border-zinc-100 p-5 rounded-2xl text-xs text-zinc-600 leading-relaxed font-medium whitespace-pre-wrap selection:bg-indigo-100">
                              {aiReport}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Attendance Performance Matrix */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Efficiency Matrix</h3>
                      <Button variant="link" className="text-[10px] font-black text-indigo-600 h-auto p-0 uppercase" onClick={() => setActiveTab('attendance')}>Audit Master Registry</Button>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="grid grid-cols-12 bg-zinc-50 border-b border-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-400 p-4">
                        <div className="col-span-6 px-2">COURSE IDENTIFIER</div>
                        <div className="col-span-3 text-center">EFFICIENCY</div>
                        <div className="col-span-3 text-right px-2">STATUS</div>
                      </div>
                      <div className="divide-y divide-zinc-100 font-mono">
                        {detailedSubjects.slice(0, 4).map((sub: any) => (
                          <div key={sub.id} className="grid grid-cols-12 p-5 items-center hover:bg-zinc-50 transition-all group cursor-pointer" onClick={() => setActiveTab('attendance')}>
                            <div className="col-span-6 px-2 flex flex-col">
                              <span className="text-[9px] font-black text-indigo-500 mb-1 tracking-widest">{sub.code}</span>
                              <h4 className="text-sm font-black text-zinc-900 truncate font-sans">{sub.name}</h4>
                            </div>
                            <div className="col-span-3">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`text-sm font-black tracking-tighter ${sub.percentage < 75 ? 'text-rose-600' : 'text-zinc-900'}`}>{sub.percentage}%</span>
                                <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${sub.percentage < 75 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${sub.percentage}%` }}></div>
                                </div>
                              </div>
                            </div>
                            <div className="col-span-3 text-right px-2">
                              <Badge className={`text-[9px] font-black tracking-widest border-2 ${
                                sub.percentage >= 75 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`} variant="outline">
                                {sub.percentage >= 75 ? 'SAFE' : 'CRITICAL'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Utilities */}
                <div className="space-y-8">
                  
                  {/* Local Timeline - Hardware Feel */}
                  <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900 font-mono">Synchronizer</h3>
                      </div>
                      <span className="text-[10px] font-black text-zinc-400 font-mono">LIVE_FEED</span>
                    </div>
                    <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-zinc-100">
                      {timetable[0].slots.map((slot: any, i: number) => (
                        <div key={i} className="flex gap-6 items-start relative group">
                          <div className={`h-[22px] w-[22px] rounded-full border-2 border-white ring-4 ring-zinc-50 shrink-0 z-10 transition-all ${
                            i === 0 ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-zinc-200'
                          }`}></div>
                          <div className="space-y-2 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest">{slot.time}</span>
                              {i === 0 && <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black px-1 py-0 h-4 uppercase">Current</Badge>}
                            </div>
                            <div className={`p-4 rounded-xl border transition-all ${
                              i === 0 ? 'bg-white border-indigo-600 shadow-md translate-x-1' : 'bg-zinc-50 border-zinc-100 text-zinc-500'
                            }`}>
                              <h4 className="text-xs font-black leading-tight mb-1 text-zinc-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{slot.subject}</h4>
                              <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">LOC: {slot.room} • REG: {slot.faculty.split(' - ').pop()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Holiday Registry */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Station Holidays</h3>
                    <div className="space-y-2">
                      {holidays.map((h: any) => (
                        <div key={h.id} className="p-4 bg-white border border-zinc-200 rounded-2xl flex items-center justify-between group hover:border-rose-200 transition-colors cursor-pointer">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-zinc-900 leading-none uppercase tracking-tight">{h.name}</h4>
                            <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">{h.date.split(' : ')[0]}</p>
                          </div>
                          <div className="text-right">
                             <span className="text-[10px] font-black text-zinc-400 font-mono tracking-widest opacity-60">{h.date.split(' : ')[1].split(' ').slice(1,3).join(' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Attendance Operational Audit</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Academic Lifecycle: {student.enrollment} • Term {student.semester}</p>
                </div>
                <div className="flex items-center gap-3">
                   <Button variant="outline" className="h-10 rounded-xl px-5 border-zinc-200 font-bold text-xs uppercase tracking-widest hover:bg-zinc-50 gap-2">
                     <Download className="h-4 w-4" /> Export Report
                   </Button>
                </div>
              </div>

              <Card className="border-zinc-200 overflow-hidden shadow-xl rounded-2xl bg-white">
                <Tabs value={attendanceTab} onValueChange={setAttendanceTab} className="w-full">
                  <div className="px-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <TabsList className="bg-transparent h-14 p-0 gap-8">
                      <TabsTrigger value="detailed" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-black uppercase tracking-widest text-zinc-400 data-[state=active]:text-indigo-600 px-0 transition-all">
                        Registry Detailed
                      </TabsTrigger>
                      <TabsTrigger value="daywise" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-black uppercase tracking-widest text-zinc-400 data-[state=active]:text-indigo-600 px-0 transition-all">
                        Temporal Matrix
                      </TabsTrigger>
                    </TabsList>
                    <div className="hidden md:flex items-center gap-4">
                      <div className="h-1.5 w-32 bg-zinc-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${totalPercentage}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-widest">Global: {totalPercentage}%</span>
                    </div>
                  </div>

                  <TabsContent value="detailed" className="m-0 focus-visible:outline-none">
                    <div className="overflow-x-auto">
                      <Table className="text-sm">
                        <TableHeader className="bg-zinc-900/10 border-b border-zinc-200">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[60px] font-black text-[9px] uppercase tracking-widest text-zinc-500 px-6">IDX</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-zinc-500">Course Identification</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-zinc-500 text-center">Protocol</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-zinc-500">Registry Faculty</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-zinc-500 text-center italic">Wt.</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-zinc-500 text-center">DLV</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-zinc-500 text-center font-bold">ATD</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-zinc-500 text-center">MED/EVT</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-zinc-500 text-right pr-8">Efficiency</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="font-mono">
                          {detailedSubjects.map((sub: any, idx: number) => (
                            <TableRow key={sub.id} className="hover:bg-zinc-50/50 transition-colors border-zinc-100 group">
                              <TableCell className="px-6 text-zinc-400 font-bold text-[10px]">{String(idx + 1).padStart(2, '0')}</TableCell>
                              <TableCell className="py-5">
                                <div className="flex flex-col font-sans">
                                  <span className="text-[9px] font-black text-indigo-500 tracking-widest mb-0.5">{sub.code}</span>
                                  <span className="text-sm font-black text-zinc-900 truncate">{sub.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-[10px] uppercase text-zinc-500 tracking-widest">{sub.type}</TableCell>
                              <TableCell className="text-zinc-500 font-medium font-sans text-xs">{sub.instructor.split(' - ').pop() || sub.instructor}</TableCell>
                              <TableCell className="text-center font-black text-[10px] text-zinc-400">{sub.credits.toFixed(1)}</TableCell>
                              <TableCell className="text-center font-bold text-sm text-zinc-500">{sub.delivered}</TableCell>
                              <TableCell className="text-center font-black text-sm text-zinc-900">{sub.attended}</TableCell>
                              <TableCell className="text-center text-zinc-400 font-bold text-[10px]">{sub.medical}/{sub.event}</TableCell>
                              <TableCell className="text-right pr-8">
                                <div className="inline-flex items-center gap-3">
                                  <div className="flex flex-col items-end">
                                    <span className={`text-sm font-black tracking-tighter ${sub.percentage < 75 ? 'text-rose-600' : 'text-zinc-900'}`}>{sub.percentage}%</span>
                                    <div className="w-12 h-0.5 bg-zinc-100 rounded-full mt-1 overflow-hidden">
                                       <div className={`h-full ${sub.percentage < 75 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${sub.percentage}%` }}></div>
                                    </div>
                                  </div>
                                  <div className={`h-2 w-2 rounded-full ${sub.percentage < 75 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-zinc-900 text-white hover:bg-zinc-900 border-none font-bold">
                            <TableCell colSpan={5} className="px-8 text-right text-[10px] uppercase tracking-[0.2em] opacity-60">Consolidated Registry Result</TableCell>
                            <TableCell className="text-center font-mono text-base">{totalDelivered}</TableCell>
                            <TableCell className="text-center font-mono text-base">{totalAttended}</TableCell>
                            <TableCell className="text-center font-mono opacity-60">-</TableCell>
                            <TableCell className="text-right pr-8">
                               <span className="text-2xl font-black font-mono tracking-tighter text-emerald-400">{totalPercentage}%</span>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="daywise" className="m-0 focus-visible:outline-none">
                    <div className="p-6 bg-zinc-50/50 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Temporal Target</span>
                        <h4 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                           April 2026 Operational Period
                           <Badge className="bg-indigo-600 text-[8px] font-black px-1.5 h-4 border-none hover:bg-indigo-600">LIVE</Badge>
                        </h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select defaultValue="april">
                          <SelectTrigger className="w-[180px] h-10 border-zinc-200 text-[10px] font-black uppercase tracking-widest rounded-xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl overflow-hidden shadow-2xl">
                            <SelectItem value="april" className="text-[10px] font-black uppercase tracking-widest">April Registry</SelectItem>
                            <SelectItem value="march" className="text-[10px] font-black uppercase tracking-widest">March Archive</SelectItem>
                          </SelectContent>
                        </Select>
                         <Button variant="outline" size="icon" className="h-10 w-10 text-zinc-400 hover:text-indigo-600 rounded-xl border-zinc-200">
                           <Download className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-900 text-white font-mono">
                            <th className="p-5 text-left font-black text-[9px] uppercase tracking-widest border-r border-white/5 min-w-[160px]">STATION DATE</th>
                            {timeSlots.map((slot: string, i: number) => (
                              <th key={i} className="p-5 text-center font-black text-[9px] uppercase tracking-widest border-r border-white/5 min-w-[160px]">
                                {slot.replace(' - ', ' » ')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {dayWiseGrid.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-zinc-100 transition-colors group">
                              <td className="p-5 border-r border-zinc-100 bg-zinc-50/50">
                                <div className="flex flex-col font-sans">
                                   <span className="text-[10px] font-black text-zinc-900 group-hover:text-indigo-600 transition-colors">{row.date.split(',')[1]}</span>
                                   <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{row.date.split(',')[0]}</span>
                                </div>
                              </td>
                              {row.isHoliday ? (
                                <td colSpan={timeSlots.length} className="p-5 bg-rose-50/20 text-center">
                                  <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white border-2 border-rose-100 shadow-sm animate-bounce-subtle">
                                    <span className="text-sm">🎉</span>
                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">{row.holidayName}</span>
                                  </div>
                                </td>
                              ) : (
                                timeSlots.map((slot: string, j: number) => {
                                  const cellData = row.slots[slot];
                                  return (
                                    <td key={j} className="p-3 border-r border-zinc-100 group-hover:bg-zinc-50/20 transition-colors h-24">
                                      {cellData ? (
                                        <div className={`h-full w-full rounded-2xl p-3 flex flex-col justify-between border-2 shadow-sm transition-all hover:scale-[1.02] ${
                                          cellData.status === 'P' 
                                            ? 'bg-emerald-50 border-emerald-100' 
                                            : 'bg-rose-50 border-rose-100'
                                        }`}>
                                          <div className="flex justify-between items-start">
                                            <span className={`text-[9px] font-black tracking-widest uppercase ${cellData.status === 'P' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                              {cellData.status === 'P' ? 'VALID' : 'MISSING'}
                                            </span>
                                            <div className={`h-1.5 w-1.5 rounded-full ${cellData.status === 'P' ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`}></div>
                                          </div>
                                          <div className="text-left font-sans">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tight truncate">{cellData.name}</p>
                                            <p className="text-[10px] font-black text-zinc-900 tracking-tighter uppercase">{cellData.code}</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="h-full w-full border-2 border-dashed border-zinc-100 rounded-2xl flex items-center justify-center">
                                           <div className="h-1 w-1 bg-zinc-200 rounded-full"></div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Master Schedule Engine</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Synchronization Period: {dayWiseGrid[0].date} » {dayWiseGrid[4].date}</p>
                </div>
                <div className="flex items-center gap-3 bg-white border border-zinc-200 rounded-2xl p-1.5 shadow-sm">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => setWeekOffset(prev => prev - 1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="px-4 py-1 border-x border-zinc-100 flex flex-col items-center">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Week Index</span>
                    <span className="text-sm font-black text-zinc-900 font-mono tracking-tighter">W{Math.abs(weekOffset) + (weekOffset >= 0 ? ':CURRENT' : ':PAST')}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => setWeekOffset(prev => prev + 1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-white font-mono">
                        <th className="p-5 text-left font-black text-[9px] uppercase tracking-widest border-r border-white/5 min-w-[160px]">Temporal Index</th>
                        {timeSlots.map((slot: string, i: number) => (
                          <th key={i} className="p-5 text-center font-black text-[9px] uppercase tracking-widest border-r border-white/5 min-w-[180px]">
                            {slot.replace(' - ', ' » ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {dayWiseGrid.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-zinc-100 transition-colors group">
                          <td className="p-5 border-r border-zinc-100 bg-zinc-50/50">
                            <div className="flex flex-col font-sans">
                              <span className="text-[10px] font-black text-zinc-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{row.date.split(',')[1]}</span>
                              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">{row.date.split(',')[0]}</span>
                            </div>
                          </td>
                          {row.isHoliday ? (
                            <td colSpan={timeSlots.length} className="p-5 bg-rose-50/20 text-center">
                               <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white border-2 border-rose-100 shadow-sm">
                                <span className="text-sm">🎉</span>
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">{row.holidayName}</span>
                              </div>
                            </td>
                          ) : (
                            timeSlots.map((slot: string, j: number) => {
                              const cellData = row.slots[slot];
                              return (
                                <td key={j} className="p-3 border-r border-zinc-100 group-hover:bg-zinc-50/20 transition-colors h-32 align-top">
                                  {cellData ? (
                                    <div className="h-full w-full rounded-2xl p-4 bg-white border-2 border-zinc-100 shadow-sm transition-all hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1 flex flex-col justify-between">
                                      <div>
                                        <div className="flex justify-between items-start mb-2">
                                          <span className="text-[9px] font-black text-indigo-500 tracking-widest uppercase">{cellData.code}</span>
                                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                        </div>
                                        <h4 className="text-[11px] font-black text-zinc-900 leading-tight uppercase font-sans line-clamp-2 h-8 mb-2">{cellData.name}</h4>
                                      </div>
                                      <div className="space-y-1.5 pt-3 border-t border-zinc-50">
                                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                                          <MapPin className="h-3 w-3 text-indigo-400" />
                                          ZONE: {cellData.room}
                                        </div>
                                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                                          <User className="h-3 w-3 text-emerald-400" />
                                          FAC: {cellData.instructor.split(' - ').pop()}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-full w-full border-2 border-dashed border-zinc-100 rounded-2xl flex items-center justify-center">
                                       <div className="h-1 w-1 bg-zinc-200 rounded-full"></div>
                                    </div>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legend Section */}
              <div className="flex items-center gap-8 bg-zinc-900 p-6 rounded-2xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Clock className="h-24 w-24" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Schedule Metadata</h4>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Active System: UNIBASE_OS_7.4.2</p>
                </div>
                <div className="flex items-center gap-8 border-l border-white/10 pl-8">
                   <div className="flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                     <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Synchronized</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                     <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Session Active</span>
                   </div>
                   <Button variant="ghost" className="text-[9px] font-black text-indigo-400 uppercase tracking-widest h-auto p-0 hover:bg-transparent hover:text-white">Request Re-Sync</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {detailedSubjects.map((sub: any) => (
                <Card key={sub.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold truncate">{sub.name}</CardTitle>
                    <CardDescription>{sub.code} • {sub.credits} Credits</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg group">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs font-medium">Syllabus.pdf</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg group">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs font-medium">Lecture_Notes_W1.pdf</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full text-xs">View All Resources</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>
      </main>
      <Chatbot dashboardData={data} />
    </div>
  );
}
