import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

interface QuizTakerProps {
  quizId: string;
  onFinish: (score: number, total: number) => void;
  onClose: () => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quizId, onFinish, onClose }) => {
  const { apiFetch } = useStudyStore();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(1500); // 25:00
  const [hintsLeft, setHintsLeft] = useState(2);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load quiz details
  useEffect(() => {
    setLoading(true);
    apiFetch(`/study/quizzes/${quizId}`)
      .then(data => {
        setQuiz(data);
        setLoading(false);
        // Default timer: 3 minutes per question
        setTimeLeft((data.questions?.length || 5) * 180);
      })
      .catch(err => {
        console.error('Error fetching quiz details:', err);
        setLoading(false);
      });
  }, [quizId, apiFetch]);

  // Countdown timer logic
  useEffect(() => {
    if (loading || !quiz) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, quiz]);

  const handleSelectOption = (optionIdx: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIdx
    }));
  };

  const getAIHint = async () => {
    if (hintsLeft <= 0 || isGeneratingHint) return;
    setIsGeneratingHint(true);
    setHintsLeft(prev => prev - 1);
    
    try {
      // In a real application, we ask Gemini for a hint
      // We can query our chat API or simulate an AI response
      
      // Simulate API call delay
      setTimeout(() => {
        const simulatedHints = [
          "Hint: Think about wave packet boundaries and spatial probability densities.",
          "Hint: Recall that this is named after the superposition principle where components sum linearly.",
          "Hint: Consider how particles traverse finite energy walls via probability leakage."
        ];
        setActiveHint(simulatedHints[Math.floor(Math.random() * simulatedHints.length)]);
        setIsGeneratingHint(false);
      }, 1500);

    } catch (err) {
      console.error('Error fetching AI hint:', err);
      setIsGeneratingHint(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (submitting || !quiz) return;
    setSubmitting(true);

    const totalQuestions = quiz.questions.length;
    // Map selected options to index array. Default unanswered questions to -1.
    const answersArray = Array.from({ length: totalQuestions }, (_, idx) => 
      selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1
    );

    try {
      const result = await apiFetch(`/study/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray })
      });

      // Refetch profile user XP details
      await useStudyStore.getState().apiFetch('/auth/profile').then(profile => {
        useStudyStore.getState().setUser(profile.user);
      });

      onFinish(result.attempt.score, totalQuestions);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('Failed to submit quiz attempt. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getUnansweredCount = () => {
    if (!quiz) return 0;
    return quiz.questions.length - Object.keys(selectedAnswers).length;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[#c7c4d7]">Assembling custom study questions...</p>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="p-8 text-center glass-card rounded-2xl">
        <AlertTriangle className="mx-auto text-amber-500 mb-2" size={32} />
        <p className="text-sm text-white">This quiz doesn't have any questions configured.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-xs">Back</button>
      </div>
    );
  }

  const activeQuestion = quiz.questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  return (
    <div className="bg-[#0b1326] min-h-screen text-[#dae2fd]">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-[#0b1326]/70 backdrop-blur-xl border-b border-white/10 shadow-xl shadow-indigo-500/5 z-50">
        <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-indigo-300 font-headline-lg">StudyGen AI</span>
            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
            <div className="hidden md:flex bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-[#c7c4d7]">
              Focused Session: {quiz.title}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border ${
              timeLeft < 300 
                ? 'border-red-500/40 text-red-400 bg-red-500/5' 
                : 'border-slate-800 text-[#c7c4d7] bg-slate-900/50'
            }`}>
              <Timer size={16} className={timeLeft < 300 ? 'animate-pulse' : ''} />
              <span>{formatTimer(timeLeft)}</span>
            </div>
            <button 
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-300 font-bold border border-slate-800 px-3 py-2 rounded-xl"
            >
              Cancel Attempt
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="pt-28 pb-16 px-6 max-w-3xl mx-auto space-y-6">
        {/* Progress Header */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Question {currentIndex + 1} of {quiz.questions.length}</p>
              <h2 className="text-xl font-bold text-white font-headline-lg">Knowledge Review</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Progress</p>
              <p className="text-lg font-bold text-indigo-400">{progressPercent}%</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-[#171f33] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 shadow-[0_0_10px_rgba(192,193,255,0.4)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quiz Canvas Card */}
        <div className="glass-card rounded-[2rem] p-6 md:p-10 relative overflow-hidden glow-primary bg-slate-900/40 border border-white/10">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px]" />
          
          <div className="relative z-10 space-y-6">
            {/* Question Text */}
            <div className="space-y-4">
              <p className="text-base md:text-lg text-slate-200 leading-relaxed font-body-lg">
                {activeQuestion.question}
              </p>
              {activeQuestion.explanation && (
                <div className="p-3 bg-[#131b2e]/60 rounded-xl border border-white/5 italic text-xs text-[#c7c4d7] font-body-md">
                  "Context citation parsed from index coordinates."
                </div>
              )}
            </div>

            {/* Options Vertical Grid */}
            <div className="grid grid-cols-1 gap-3">
              {activeQuestion.options.map((option: string, optionIdx: number) => {
                const isSelected = selectedAnswers[currentIndex] === optionIdx;
                const labels = ['A', 'B', 'C', 'D'];
                return (
                  <button 
                    key={optionIdx}
                    onClick={() => {
                      handleSelectOption(optionIdx);
                      setActiveHint(null); // clear hint on answer selection
                    }}
                    className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left w-full ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/10 border-2 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                        : 'border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow' 
                        : 'bg-[#1c2333] text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}>
                      {labels[optionIdx] || optionIdx}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${
                      isSelected ? 'text-indigo-300 font-bold' : 'text-slate-300 group-hover:text-indigo-300'
                    }`}>
                      {option}
                    </span>
                    {isSelected && (
                      <CheckCircle2 size={16} className="ml-auto text-indigo-400 animate-fade-in" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* AI Hint Section */}
            {activeHint && (
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 animate-slide-up flex gap-2">
                <Sparkles size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">{activeHint}</p>
              </div>
            )}

            {/* Footer Control Actions */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button 
                type="button"
                onClick={getAIHint}
                disabled={hintsLeft <= 0 || isGeneratingHint}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-40"
              >
                <Sparkles size={14} className="animate-pulse" />
                <span>
                  {isGeneratingHint ? 'Generating...' : `Ask AI for a Hint (${hintsLeft} left)`}
                </span>
              </button>

              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  type="button"
                  onClick={() => {
                    setCurrentIndex(prev => Math.max(0, prev - 1));
                    setActiveHint(null);
                  }}
                  disabled={currentIndex === 0}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-800 hover:bg-[#1c2333] font-bold text-xs text-slate-300 transition-colors disabled:opacity-40"
                >
                  Previous
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setCurrentIndex(prev => Math.min(quiz.questions.length - 1, prev + 1));
                    setActiveHint(null);
                  }}
                  disabled={currentIndex === quiz.questions.length - 1}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#c0c1ff] text-[#1000a9] font-bold text-xs transition-all hover:brightness-110 disabled:opacity-40"
                >
                  Next Question
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action controls below the canvas */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 pt-2 gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <AlertTriangle size={14} className="text-amber-500" />
            <p>
              {getUnansweredCount() > 0 
                ? `${getUnansweredCount()} questions remain unanswered` 
                : 'All questions answered!'}
            </p>
          </div>
          <button 
            type="button"
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/10 active:scale-95 transition-all"
          >
            {submitting ? 'Grading Attempt...' : 'Finish Attempt'}
          </button>
        </div>
      </main>

      {/* Pro Tips Cards */}
      <section className="max-w-3xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4 pb-12">
        <div className="glass-card p-4 rounded-xl space-y-1.5 border-l-4 border-l-indigo-400 bg-slate-900/20 border-white/5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Timer Warning</h4>
          <p className="text-xs text-slate-400">If the countdown timer reaches zero, your completed selections will auto-submit.</p>
        </div>
        <div className="glass-card p-4 rounded-xl space-y-1.5 border-l-4 border-l-amber-500 bg-slate-900/20 border-white/5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Comprehension</h4>
          <p className="text-xs text-slate-400">Correct submissions award double XP points (+20 XP per correct match!).</p>
        </div>
        <div className="glass-card p-4 rounded-xl space-y-1.5 border-l-4 border-l-purple-400 bg-slate-900/20 border-white/5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Review Focus</h4>
          <p className="text-xs text-slate-400">Weak concept tags trigger revision reminders in your Dashboard feed.</p>
        </div>
      </section>
    </div>
  );
};

export default QuizTaker;
