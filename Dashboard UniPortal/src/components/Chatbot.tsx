import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, Loader2, Bot, User, Maximize2, Minimize2, Terminal, Zap } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function Chatbot({ dashboardData }: { dashboardData: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: '### TERMINAL ACCESS GRANTED\n\nWelcome student. I am the **UniPortal OS v4.0** assistant. I have synchronized with your academic profile. How can I assist your operations today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API_KEY_NOT_FOUND");

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
        You are UniPortal AI, a professional virtual assistant for a University Student Management System.
        Tone: Efficient, data-driven, technical. Use Markdown.

        CONTEXT:
        Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        Student Profile: ${JSON.stringify(dashboardData?.student || {})}
        Attendance: ${dashboardData?.stats?.attendancePercentage}% (${dashboardData?.stats?.status})
        Subjects: ${JSON.stringify(dashboardData?.detailedSubjects || [])}
        Holidays: ${JSON.stringify(dashboardData?.holidays || [])}
        Timetable: ${JSON.stringify(dashboardData?.dayWiseGrid || [])}
        Exams: ${JSON.stringify(dashboardData?.exams || [])}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `SYSTEM_INSTRUCTION: ${systemInstruction}\n\nUSER_QUERY: ${userMsg}`,
        config: {
          systemInstruction: "You are UniPortal AI, a professional technical assistant."
        }
      });

      const botResponse = response.text || "I'm sorry, I couldn't process that right now.";
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    } catch (error) {
      console.error("Chatbot AI Error:", error);
      let errorMsg = "### SYSTEM FAULT DETECTED\n\nEncrypted connection to AI Core was interrupted. Manual registry access recommended.";
      if (error instanceof Error && error.message === "API_KEY_NOT_FOUND") {
        errorMsg = "### CONFIGURATION ERROR\n\nAI Core authorization failure. Please define `GEMINI_API_KEY` in environment variables to restore service.";
      }
      setMessages(prev => [...prev, { role: 'bot', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <Button 
          className="fixed bottom-8 right-8 h-16 w-16 rounded-2xl shadow-2xl z-50 bg-zinc-900 border-2 border-zinc-800 hover:scale-110 transition-all group scale-in"
          onClick={() => setIsOpen(true)}
        >
          <div className="relative">
            <Bot className="h-7 w-7 text-white" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-indigo-500 rounded-full border-2 border-zinc-900 animate-pulse"></span>
          </div>
        </Button>
      )}

      {isOpen && (
        <Card className={`fixed bottom-8 right-8 shadow-2xl flex flex-col z-50 border-2 border-zinc-800 bg-zinc-950 overflow-hidden transition-all duration-300 ${
          isExpanded ? 'w-[500px] h-[700px]' : 'w-80 h-[500px]'
        }`}>
          <CardHeader className="p-4 bg-zinc-900 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                <Terminal className="h-4 w-4 text-indigo-400 font-bold" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xs font-black text-white uppercase tracking-widest">UNIPORTAL_AI_V4</CardTitle>
                <div className="flex items-center gap-1.5">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[8px] font-black text-emerald-500/80 uppercase tracking-widest">System Active</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/50 via-zinc-950 to-zinc-950"
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 border-zinc-700' 
                      : 'bg-indigo-600/10 border-indigo-500/20'
                  }`}>
                    {msg.role === 'user' ? <User className="h-4 w-4 text-zinc-400" /> : <Bot className="h-4 w-4 text-indigo-400" />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tr-none' 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 rounded-tl-none'
                  }`}>
                    <div className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-indigo-400">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    <div className={`mt-2 text-[8px] font-black uppercase tracking-widest opacity-30 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.role === 'user' ? 'Transmission Logged' : 'Generated by CORE_AI'}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-3">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Processing Data...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.4)]">
              <div className="relative flex-1">
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="QUERY_CORE_AI://" 
                  className="bg-zinc-950 border-zinc-800 text-white text-xs h-12 rounded-xl focus-visible:ring-indigo-600 focus-visible:ring-offset-0 placeholder:text-zinc-700 font-mono"
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   <Zap className="h-3 w-3 text-zinc-800 hover:text-indigo-500 transition-colors cursor-help" />
                </div>
              </div>
              <Button 
                onClick={handleSend} 
                disabled={isLoading} 
                className="h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
            <div className="px-4 py-1.5 bg-zinc-950 border-t border-zinc-900/50 flex items-center justify-between">
               <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Encryption: AES-256 Enabled</span>
               <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Latency: 24ms</span>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
