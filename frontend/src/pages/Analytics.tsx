import React, { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, Sparkles, Award } from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const mockPerformanceData = [
  { name: 'Week 1', quizScore: 78, flashcards: 40 },
  { name: 'Week 2', quizScore: 82, flashcards: 55 },
  { name: 'Week 3', quizScore: 88, flashcards: 78 },
  { name: 'Week 4', quizScore: 92, flashcards: 95 },
];

const Analytics: React.FC = () => {
  const { apiFetch } = useStudyStore();
  const [analytics, setAnalytics] = useState<any>({
    totalConcepts: 0,
    totalConnections: 0,
    strongTopics: 0,
    weakTopics: 0,
    studyProgress: 0,
    mostConnected: []
  });

  useEffect(() => {
    apiFetch('/graph/analytics')
      .then(data => {
        setAnalytics(data);
      })
      .catch(err => console.error('Error fetching analytics:', err));
  }, [apiFetch]);

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight font-headline-xl">Performance & Analytics</h2>
        <p className="text-sm text-[#c7c4d7] font-body-lg">
          Dive deep into your concept retention rates, learning streaks, and detailed quiz performance analytics.
        </p>
      </div>

      {/* Numerical Stats row */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Concepts Mapped</span>
          <div className="text-3xl font-bold text-white mt-2">{analytics.totalConcepts || 15} Nodes</div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Concept Dependencies</span>
          <div className="text-3xl font-bold text-white mt-2">{analytics.totalConnections || 12} Edges</div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Strong Topics (🟣)</span>
          <div className="text-3xl font-bold text-indigo-400 mt-2">{analytics.strongTopics || 4} Concepts</div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Weak Topics (🔵)</span>
          <div className="text-3xl font-bold text-purple-400 mt-2">{analytics.weakTopics || 3} Concepts</div>
        </div>
      </section>

      {/* Visual Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Comprehension Trend</h3>
            <p className="text-xs text-slate-400">Weekly quiz scores vs active recall intervals</p>
          </div>
          <div className="h-64 w-full text-xs font-label-sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockPerformanceData} margin={{ left: -20 }}>
                <XAxis dataKey="name" stroke="#464554" />
                <YAxis stroke="#464554" />
                <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: '#2d3449' }} />
                <Legend />
                <Line type="monotone" dataKey="quizScore" name="Quiz Success Rate (%)" stroke="#a855f7" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="flashcards" name="Flashcards Swiped" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Pie Chart for Mastery breakdown */}
        {/* Donut Pie Chart for Mastery breakdown */}
        <div className="glass-card rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Mastery Breakdown</h3>
            <p className="text-xs text-slate-400">Subject nodes learning status ratio</p>
          </div>
          {(() => {
            const strong = analytics.strongTopics || 0;
            const weak = analytics.weakTopics || 0;
            const total = analytics.totalConcepts || 0;
            const studying = Math.max(0, total - (strong + weak));

            const masteryData = [
              { name: 'Strong Mastery', value: strong, color: '#a855f7' },
              { name: 'Studying', value: studying, color: '#2563eb' },
              { name: 'Weak Concepts', value: weak, color: '#525252' },
            ].filter(item => item.value > 0);

            const displayData = masteryData.length > 0 ? masteryData : [{ name: 'No concepts', value: 1, color: '#222222' }];

            return (
              <>
                <div className="h-48 w-full flex items-center justify-center text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={displayData[0].name === 'No concepts' ? 0 : 5}
                        dataKey="value"
                      >
                        {displayData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-around text-xs font-semibold px-2">
                  <span className="text-indigo-400">🟣 Strong ({strong})</span>
                  <span className="text-purple-400">🔵 Studying ({studying})</span>
                  <span className="text-neutral-500">⚪ Weak ({weak})</span>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Network Hub Analysis table */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most connected concept hubs */}
        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Central Concepts (Hubs)</h3>
            <p className="text-xs text-slate-400">Concepts with highest degree of connections in your maps</p>
          </div>

          <div className="space-y-3">
            {analytics.mostConnected && analytics.mostConnected.length > 0 ? (
              analytics.mostConnected.map((hub: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <span className="text-xs font-bold text-slate-200">{hub.label}</span>
                  </div>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full font-semibold">
                    {hub.connections} connections
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-900/30 border border-slate-800 text-center rounded-xl">
                <span className="text-xs text-slate-500">No hub analytics available.</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendations card */}
        <div className="glass-card rounded-2xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-400" />
            <span>Smart Recommendations</span>
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
              <Award className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-white">Weak Topic Review Triggered</h4>
                <p className="text-xs text-[#c7c4d7] mt-1 leading-normal">
                  Your quiz average in **Schrödinger's Wave Equation** is under 70%. We recommend starting an active chat review or solving the node-specific quiz.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
              <TrendingUp className="text-indigo-400 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-white">Next Topic Prerequisite Ready</h4>
                <p className="text-xs text-[#c7c4d7] mt-1 leading-normal">
                  Since you've achieved a mastery status on **Quantum Mechanics basics**, the advanced subtopic **Quantum Entanglement** has unlocked. Prerequisite nodes completed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Analytics;
