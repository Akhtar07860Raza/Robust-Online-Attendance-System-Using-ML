import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, UserCircle, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const navigate = useNavigate();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`OTP sent to your ${role} email`);
      setStep(2);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ ...data.user, role })); // Force role for demo
      
      toast.success('Login successful');
      if (role === 'faculty') {
        navigate('/faculty');
      } else {
        navigate('/student');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-100/50 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md border-slate-200 shadow-2xl rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
        <div className="bg-indigo-600 p-8 text-white text-center space-y-2 relative">
          <div className="bg-white/20 w-16 h-16 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-lg">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight text-white">UniPortal<span className="text-indigo-200">.</span></CardTitle>
          <p className="text-indigo-100 text-sm font-medium">Academic Management System</p>
        </div>

        <CardHeader className="pt-8 pb-4">
          <Tabs value={role} onValueChange={(v) => setRole(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 h-12 rounded-xl">
              <TabsTrigger value="student" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold">
                <UserCircle className="h-4 w-4" /> Student
              </TabsTrigger>
              <TabsTrigger value="faculty" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold">
                <ShieldCheck className="h-4 w-4" /> Faculty
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-bold ml-1">University Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder={role === 'student' ? "student@university.edu" : "faculty@university.edu"}
                    className="h-12 pl-4 rounded-xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-200 transition-all group" disabled={loading}>
                {loading ? 'Sending OTP...' : (
                  <>
                    Continue to Login
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Testing Credentials</p>
                <p className="text-xs text-slate-600 font-medium">Use any email and OTP <span className="text-indigo-600 font-bold">123456</span></p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-2 text-center mb-6">
                <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-1 px-3 rounded-full inline-block mb-2 border border-emerald-100">
                  OTP Sent Successfully
                </div>
                <p className="text-sm text-slate-500">We've sent a 6-digit code to <br/><span className="font-bold text-slate-800">{email}</span></p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-700 font-bold ml-1">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="h-14 text-center text-2xl tracking-[0.5em] font-black rounded-xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-200 transition-all" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
              <Button variant="ghost" className="w-full h-10 rounded-xl text-slate-500 font-bold hover:bg-slate-50" onClick={() => setStep(1)}>
                Change Email Address
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
