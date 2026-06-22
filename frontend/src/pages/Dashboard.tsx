import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Folder, 
  School, 
  Flame, 
  Plus, 
  Sparkles,
  Timer,
  Edit,
  BookOpen,
  Zap,
  ArrowRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStudyStore } from '../store/useStudyStore';

const mockChartData = [
  { name: 'Mon', hours: 2 },
  { name: 'Tue', hours: 3.5 },
  { name: 'Wed', hours: 1.5 },
  { name: 'Thu', hours: 5 },
  { name: 'Fri', hours: 4.2 },
  { name: 'Sat', hours: 6 },
  { name: 'Sun', hours: 3 },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, documents, fetchDocuments, apiFetch } = useStudyStore();
  const [cmdInput, setCmdInput] = useState('');
  const [userStats, setUserStats] = useState({
    documentsUploaded: 0,
    flashcardsCreated: 0,
    quizzesTaken: 0,
    averageScore: 0
  });

  useEffect(() => {
    // Load documents
    fetchDocuments();
    
    // Load fresh stats from profile api
    apiFetch('/auth/profile')
      .then(data => {
        if (data.stats) {
          setUserStats(data.stats);
        }
      })
      .catch(err => console.error('Error fetching dashboard statistics:', err));
  }, [fetchDocuments, apiFetch]);

  const handleCmdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cmdInput.trim()) {
      // Pass the query as a parameter to the Arena page chat
      navigate(`/arena?q=${encodeURIComponent(cmdInput)}`);
    }
  };

  const getRecentDocs = () => {
    return documents.slice(0, 2);
  };

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-headline-xl">
            Welcome back, {user?.name || 'Student'}
          </h2>
          <p className="text-base text-[#c7c4d7] mt-2 max-w-2xl font-body-lg">
            Your AI personal study companion is ready. Upload documents, review flashcards, and run quizzes to reach your level goals today.
          </p>
        </div>
        <button 
          onClick={() => navigate('/library')}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all duration-200 active:scale-95 shadow-lg shadow-indigo-600/20 border-t border-white/20 magnetic-hover"
        >
          <Plus size={18} />
          <span>New Study Session</span>
        </button>
      </section>

      {/* Stats Cards Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Progress */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#c7c4d7] font-label-sm">Study Level Progress</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">
              {user ? Math.round(((user.xp % 1000) / 1000) * 100) : 0}%
            </div>
            <div className="w-full bg-[#171f33] h-1.5 rounded-full mt-2">
              <div 
                className="bg-indigo-400 h-full rounded-full shadow-[0_0_8px_rgba(192,193,255,0.6)] transition-all duration-500" 
                style={{ width: `${user ? ((user.xp % 1000) / 1000) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Docs */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#c7c4d7] font-label-sm">Study Library</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Folder size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">{userStats.documentsUploaded} Docs</div>
            <p className="text-[11px] text-[#c7c4d7] mt-1">Uploaded notes & textbooks</p>
          </div>
        </div>

        {/* Avg Quiz Score */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#c7c4d7] font-label-sm">Avg Quiz Correct</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <School size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">
              {userStats.averageScore}%
            </div>
            <p className="text-[11px] text-[#c7c4d7] mt-1">{userStats.quizzesTaken} quiz attempts complete</p>
          </div>
        </div>

        {/* Streak */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#c7c4d7] font-label-sm">Daily Streak</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Flame size={18} className="fill-indigo-500/20" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">
              {user?.streak || 0} Days
            </div>
            <p className="text-[11px] text-[#c7c4d7] mt-1">Consistency is key to retention</p>
          </div>
        </div>
      </section>

      {/* Visualizations Chart and Goals Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-8 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white font-headline-lg">Activity Hours</h3>
              <p className="text-xs text-[#c7c4d7] font-label-sm">Learning engagement time</p>
            </div>
            <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 font-label-sm">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full mt-4 font-label-sm text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#464554" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#464554" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131b2e', borderColor: '#2d3449', borderRadius: '8px', color: '#dae2fd' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#c0c1ff" strokeWidth={2} fillOpacity={1} fill="url(#hoursGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Goals Circle Rings */}
        {(() => {
          const flashcardTarget = 15;
          const quizTarget = 5;
          const flashcardCount = userStats.flashcardsCreated || 0;
          const quizCount = userStats.quizzesTaken || 0;

          const flashcardRatio = Math.min(1, flashcardCount / flashcardTarget);
          const quizRatio = Math.min(1, quizCount / quizTarget);

          // Circumference outer = 2 * pi * 70 = 439.82 -> ~440
          const outerOffset = 440 - (flashcardRatio * 440);
          // Circumference inner = 2 * pi * 50 = 314.15 -> ~314
          const innerOffset = 314 - (quizRatio * 314);

          const overallPercent = Math.round(((flashcardRatio + quizRatio) / 2) * 100);

          return (
            <div className="glass-card rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-headline-lg">Weekly Goals</h3>
                <p className="text-xs text-[#c7c4d7] font-label-sm">Topic comprehension completion</p>
              </div>

              <div className="relative w-44 h-44 mx-auto my-6 flex items-center justify-center">
                {/* Double SVG Circles */}
                <svg className="w-full h-full -rotate-90">
                  {/* Background Outer Ring */}
                  <circle cx="88" cy="88" r="70" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                  {/* Active Outer Ring */}
                  <circle 
                    cx="88" 
                    cy="88" 
                    r="70" 
                    fill="none" 
                    stroke="#c0c1ff" 
                    strokeWidth="10" 
                    strokeDasharray="440" 
                    strokeDashoffset={outerOffset} 
                    strokeLinecap="round" 
                  />
                  {/* Background Inner Ring */}
                  <circle cx="88" cy="88" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                  {/* Active Inner Ring */}
                  <circle 
                    cx="88" 
                    cy="88" 
                    r="50" 
                    fill="none" 
                    stroke="#d0bcff" 
                    strokeWidth="10" 
                    strokeDasharray="314" 
                    strokeDashoffset={innerOffset} 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold text-white">{overallPercent}%</span>
                  <span className="text-[10px] text-[#c7c4d7] font-semibold uppercase tracking-wider font-label-sm">Overall</span>
                </div>
              </div>

              <div className="space-y-3 font-label-sm text-xs mt-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#c0c1ff]" />
                    <span className="text-[#c7c4d7]">Flashcards Created</span>
                  </div>
                  <span className="font-semibold text-slate-300">{flashcardCount}/{flashcardTarget}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#d0bcff]" />
                    <span className="text-[#c7c4d7]">Quiz Mastery</span>
                  </div>
                  <span className="font-semibold text-slate-300">{quizCount}/{quizTarget}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* AI Insights & Learning Queue */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Feed Insights */}
        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white font-headline-lg flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400" />
              <span>AI Insights Feed</span>
            </h3>
            <span className="text-xs text-[#c7c4d7]">Active Updates</span>
          </div>

          <div className="space-y-4">
            {getRecentDocs().length > 0 ? (
              getRecentDocs().map(doc => (
                <div 
                  key={doc._id} 
                  onClick={() => navigate('/arena')}
                  className="p-4 rounded-xl bg-[#171f33]/40 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-indigo-400">Notes Analyzed</span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-[#c7c4d7] px-2 py-0.5 rounded font-mono">
                      {doc.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white truncate">{doc.name}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[11px] text-[#c7c4d7]">{doc.conceptCount} nodes mapped</span>
                    <span className="text-[10px] text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open in Arena <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div 
                onClick={() => navigate('/library')}
                className="p-6 rounded-xl border border-dashed border-slate-800 text-center hover:bg-slate-900/10 cursor-pointer transition-all"
              >
                <Folder size={28} className="mx-auto text-slate-600 mb-2" />
                <span className="text-xs text-[#c7c4d7] block">No study notes uploaded yet.</span>
                <span className="text-[10px] text-indigo-400 mt-1 block">Upload a PDF to generate AI insights!</span>
              </div>
            )}
          </div>
        </div>

        {/* Study Queue list */}
        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white font-headline-lg flex items-center gap-2">
              <Timer size={18} className="text-purple-400" />
              <span>Learning Queue</span>
            </h3>
            <span className="text-xs text-[#c7c4d7]">Review Due</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Edit size={20} />
              </div>
              <div className="flex-1 flex justify-between items-center border-b border-slate-800/40 pb-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Due Flashcard Deck</h4>
                  <p className="text-[10px] text-[#c7c4d7] mt-0.5">Spaced repetition interval cards</p>
                </div>
                <button 
                  onClick={() => navigate('/arena')}
                  className="text-[10px] bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 font-bold px-3 py-1 rounded"
                >
                  Review
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 p-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BookOpen size={20} />
              </div>
              <div className="flex-1 flex justify-between items-center border-b border-slate-800/40 pb-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Concept Quiz Due</h4>
                  <p className="text-[10px] text-[#c7c4d7] mt-0.5">Test your extracted document concepts</p>
                </div>
                <button 
                  onClick={() => navigate('/arena')}
                  className="text-[10px] bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 font-bold px-3 py-1 rounded"
                >
                  Solve
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating AI Command Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30">
        <form onSubmit={handleCmdSubmit} className="glass-card rounded-2xl p-1.5 flex items-center shadow-2xl border-b-2 border-indigo-500/40 bg-slate-900/90 backdrop-blur-xl">
          <div className="p-3 text-indigo-400">
            <Zap size={20} className="fill-indigo-400/20" />
          </div>
          <input 
            type="text"
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            placeholder="Ask AI to query concepts (e.g. 'Show AVL Trees')..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-100 placeholder-slate-500 py-3 pr-4 focus:outline-none"
          />
          <div className="flex gap-2 p-1.5">
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
            >
              <span>Ask</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
