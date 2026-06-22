import React from 'react';
import { useLocation } from 'react-router-dom';
import { Award, Zap } from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const Navbar: React.FC = () => {
  const { user } = useStudyStore();
  const location = useLocation();

  // Get Page Title from Route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/library': return 'Study Library';
      case '/arena': return 'Visual Study Arena';
      case '/analytics': return 'Performance & Analytics';
      default: return 'StudyGen AI';
    }
  };

  const getXPPercentage = (xp: number) => {
    const nextLevelXP = 1000;
    const currentXP = xp % nextLevelXP;
    return (currentXP / nextLevelXP) * 100;
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-8 fixed right-0 top-0 left-64 z-10">
      <h1 className="text-xl font-bold text-white tracking-wide">{getPageTitle()}</h1>

      {user && (
        <div className="flex items-center gap-6">
          {/* Gamification Level Status */}
          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-1.5 rounded-full shadow-inner">
            <div className="bg-amber-500/20 p-1.5 rounded-full text-amber-500 shadow-md">
              <Award size={16} />
            </div>
            
            <div className="text-left w-36">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-slate-300">Level {user.level}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {user.xp % 1000}/1000 XP
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-500"
                  style={{ width: `${getXPPercentage(user.xp)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-indigo-950/50 border border-indigo-500/20 py-0.5 px-2 rounded-full text-indigo-400 text-xs font-bold">
              <Zap size={12} className="fill-indigo-400" />
              <span>{user.xp} XP</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
