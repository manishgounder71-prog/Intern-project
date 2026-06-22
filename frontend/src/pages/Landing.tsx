import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const heroGlowRef = useRef<HTMLDivElement>(null);

  // Magnetic Button Effect & Floating Micro-interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.magnetic-hover') as HTMLElement;
      if (!btn) return;
      
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) scale(1.02)`;
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.magnetic-hover') as HTMLElement;
      if (!btn) return;
      btn.style.transform = '';
    };

    const handleScroll = () => {
      const scrolled = window.scrollY;
      if (heroGlowRef.current) {
        heroGlowRef.current.style.transform = `translate(-50%, ${scrolled * 0.2}px)`;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseout', handleMouseLeave);
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseout', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="font-body-md text-body-md selection:bg-primary/30 selection:text-primary min-h-screen bg-[#0b1326] text-[#dae2fd]">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0b1326]/70 backdrop-blur-xl border-b border-white/10 shadow-xl shadow-indigo-500/5">
        <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-[1440px] mx-auto">
          <div className="text-[28px] font-bold text-indigo-200 tracking-tight font-headline-lg">
            StudyGen <span className="text-indigo-400">AI</span>
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a className="text-slate-400 hover:text-indigo-300 transition-colors duration-300 font-body-md" href="#features">Features</a>
            <a className="text-slate-400 hover:text-indigo-300 transition-colors duration-300 font-body-md" href="#about">About</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-indigo-300 transition-colors duration-300 font-bold px-4 py-2"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="gradient-border-btn px-6 py-2 rounded-xl text-white font-bold transition-transform duration-200 active:scale-95 magnetic-hover"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32">
        {/* Hero Section */}
        <section className="relative px-6 md:px-12 max-w-[1440px] mx-auto mb-16 flex flex-col items-center text-center">
          <div ref={heroGlowRef} className="hero-glow top-0 left-1/2 -translate-x-1/2"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 mb-8">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span className="text-xs font-semibold uppercase tracking-wider font-label-md">Next-Gen Educational Intelligence</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl mb-6 max-w-4xl tracking-tight font-bold text-white font-display-lg">
            Your Personal <span className="shimmer-text font-bold">AI Study Partner</span>
          </h1>
          
          <p className="text-lg text-slate-400 max-w-2xl mb-8 font-body-lg">
            Upload notes, explore interactive concept mind-maps, chat with textbooks, generate quizzes, and review flashcards using the most advanced AI companion.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <button 
              onClick={() => navigate('/register')}
              className="gradient-border-btn px-8 py-4 rounded-xl text-white font-bold text-lg transition-all magnetic-hover"
            >
              Start Learning Free
            </button>
            <a 
              href="#features"
              className="px-8 py-4 rounded-xl border border-white/10 bg-slate-800/20 backdrop-blur-md text-slate-200 font-bold text-lg hover:bg-slate-800/40 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">explore</span>
              Explore Features
            </a>
          </div>

          {/* Dashboard Preview */}
          <div className="w-full max-w-5xl glass-card rounded-[24px] p-2 overflow-hidden shadow-2xl">
            <div className="bg-slate-950/80 rounded-[20px] p-6 border border-slate-800 flex flex-col items-start gap-4 text-left">
              <div className="flex items-center justify-between w-full border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-500 font-mono ml-2">studygen-companion-v1.0.0</span>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-slate-900 border border-slate-800 rounded animate-pulse" />
                  <div className="h-5 w-24 bg-slate-900 border border-slate-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-2">
                <div className="md:col-span-2 space-y-4">
                  <div className="h-10 bg-slate-900 border border-slate-800/50 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Concept Network: DBMS Architecture</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded">6 nodes</span>
                  </div>
                  <div className="h-64 bg-slate-900/60 border border-slate-800/50 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="flex flex-col items-center gap-3 relative z-10 text-center px-6">
                      <span className="material-symbols-outlined text-4xl text-indigo-400 animate-pulse">network_node</span>
                      <span className="text-sm font-semibold text-slate-300">Interactive Concept Mind-Map</span>
                      <span className="text-xs text-slate-500 max-w-sm">
                        Automatically extract main topics and prerequisite relations into draggable nodes.
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-[320px] bg-slate-900/60 border border-slate-800/50 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-indigo-400 font-bold block mb-2 uppercase tracking-wide">Study Companion Chat</span>
                      <div className="space-y-2 mt-4">
                        <div className="p-2 bg-slate-950 rounded-lg text-xs text-slate-300 border border-slate-800">
                          Explain B-Tree Indexing in DBMS
                        </div>
                        <div className="p-2.5 bg-indigo-500/10 rounded-lg text-xs text-indigo-300 border border-indigo-500/20">
                          B-Trees are self-balancing search trees that keep data sorted and allow searches, sequential access, insertions, and deletions in logarithmic time...
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-slate-800/80 pt-3">
                      <div className="flex-1 bg-slate-950 h-8 rounded border border-slate-800 px-3 flex items-center text-[10px] text-slate-600 font-mono">
                        Ask about B-Trees...
                      </div>
                      <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-sm">send</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="px-6 md:px-12 max-w-[1440px] mx-auto mb-16 pt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl mb-4 font-bold text-white font-headline-xl">Master Your Subjects</h2>
            <p className="text-slate-400 font-body-md max-w-lg mx-auto">Powerful tools designed to accelerate your cognitive processing and retention.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Large Feature Card */}
            <div className="md:col-span-8 glass-card rounded-[24px] p-8 relative overflow-hidden group">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                    <span className="material-symbols-outlined text-3xl">psychology</span>
                  </div>
                  <h3 className="text-xl md:text-2xl mb-4 font-bold text-white font-headline-lg">AI Knowledge Mind-Maps</h3>
                  <p className="text-slate-400 max-w-md">
                    Our AI dissects your lectures and textbooks to identify core concepts and prerequisite relations, plotting an interactive mind-map automatically.
                  </p>
                </div>
                <div className="mt-8">
                  <button onClick={() => navigate('/register')} className="flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                    Learn more <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
            </div>
            
            {/* Small Feature Card 1 */}
            <div className="md:col-span-4 glass-card rounded-[24px] p-8">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-6">
                <span className="material-symbols-outlined text-3xl">quiz</span>
              </div>
              <h3 className="text-xl md:text-2xl mb-4 font-bold text-white font-headline-lg">Auto-Quiz</h3>
              <p className="text-slate-400">
                Instantly turn any document into a challenging practice exam with varied multiple choice questions.
              </p>
            </div>
            
            {/* Small Feature Card 2 */}
            <div className="md:col-span-4 glass-card rounded-[24px] p-8">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 mb-6">
                <span className="material-symbols-outlined text-3xl">style</span>
              </div>
              <h3 className="text-xl md:text-2xl mb-4 font-bold text-white font-headline-lg">Flashcards</h3>
              <p className="text-slate-400">
                Active recall made easy. Smart decks that focus on your weakest areas using spaced repetition intervals.
              </p>
            </div>
            
            {/* Medium Feature Card */}
            <div className="md:col-span-8 glass-card rounded-[24px] p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-6">
                  <span className="material-symbols-outlined text-3xl">forum</span>
                </div>
                <h3 className="text-xl md:text-2xl mb-4 font-bold text-white font-headline-lg">Chat with Documents</h3>
                <p className="text-slate-400">
                  Ask questions directly to your textbooks or notes. Get citations and detailed explanations in real-time.
                </p>
              </div>
              <div className="w-full md:w-1/2 bg-slate-950/80 rounded-xl p-4 border border-white/5 font-mono text-xs text-slate-400">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" /> 
                  <span className="text-[10px]">AI: Grounded in Biology_Ch5.pdf</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2 bg-white/5 rounded border border-slate-800 text-[10px]">
                    What is the role of mitochondria?
                  </div>
                  <div className="p-2 bg-indigo-500/10 rounded text-indigo-300 border border-indigo-500/20 text-[10px]">
                    The mitochondria acts as the powerhouse of the cell, converting oxygen and nutrients into ATP...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Testimonials */}
        <section id="about" className="px-6 md:px-12 max-w-[1440px] mx-auto mb-16">
          <div className="glass-card rounded-[24px] p-12 bg-indigo-500/5 border-indigo-500/10 flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/3">
              <div className="flex gap-1 mb-4 text-indigo-400">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <h2 className="text-3xl font-bold text-white font-headline-xl">Loved by students globally.</h2>
            </div>
            <div className="md:w-2/3">
              <blockquote className="text-lg md:text-xl italic mb-6 text-slate-300 font-body-lg">
                "StudyGen AI completely changed how I prepare for my exams. The ability to generate custom visual mind-maps, review due cards, and take instant quizzes from my textbooks saved me hundreds of hours."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 bg-indigo-950 flex items-center justify-center text-indigo-300 font-bold">
                  JW
                </div>
                <div>
                  <div className="font-bold text-slate-200">James Wilson</div>
                  <div className="text-sm text-slate-400 font-body-md">Medical Student, Stanford University</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 bg-[#060e20] border-t border-slate-800/40">
        <div className="flex flex-col items-center justify-center gap-4 max-w-[1440px] mx-auto px-6">
          <div className="font-bold text-indigo-200 text-xl mb-4">StudyGen AI</div>
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <a className="text-slate-400 hover:text-indigo-300 transition-colors text-sm" href="#">Privacy Policy</a>
            <a className="text-slate-400 hover:text-indigo-300 transition-colors text-sm" href="#">Terms of Service</a>
          </div>
          <p className="text-slate-500 text-xs">© 2026 StudyGen AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
