import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  LayoutDashboard, 
  Network, 
  BarChart3, 
  Flame, 
  LogOut, 
  Sparkles 
} from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const Sidebar: React.FC = () => {
  const { user, logout } = useStudyStore();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Library', path: '/library', icon: BookOpen },
    { name: 'Study Arena', path: '/arena', icon: Network },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 flex flex-col justify-between h-screen fixed left-0 top-0 z-20">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-wide">StudyGen</span>
            <span className="text-xs font-semibold text-indigo-400 block -mt-1">AI COMPANION</span>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-4 mx-4 my-6 bg-slate-950/50 border border-slate-800/40 rounded-xl flex items-center gap-3">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-500/30 p-1"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-200 truncate">{user.name}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Flame size={14} className="text-orange-500 fill-orange-500/20" />
                <span className="text-xs text-slate-400 font-medium">
                  {user.streak} day streak
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="px-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="p-4 border-t border-slate-800/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-500/20 rounded-lg transition-all"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
