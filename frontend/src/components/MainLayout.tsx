import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Menu, 
  Search, 
  Bell, 
  TrendingUp
} from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const MainLayout: React.FC = () => {
  const { user, logout } = useStudyStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Documents', path: '/library', icon: BookOpen },
    { name: 'Study Arena', path: '/arena', icon: MessageSquare },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Direct search query to study arena chat
      navigate(`/arena?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="bg-[#0b1326] text-[#dae2fd] min-h-screen font-body-md">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#131b2e]/80 backdrop-blur-lg border-r border-white/10 flex flex-col py-6 gap-4 z-50">
        <div className="px-6 mb-4">
          <Link to="/" className="font-headline-lg text-2xl font-extrabold text-[#c0c1ff] tracking-tight block">
            StudyGen <span className="text-indigo-400">AI</span>
          </Link>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-grow space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 scale-[0.98]' 
                    : 'text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#2d3449]/50'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 mt-auto space-y-2">
          
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-[#c7c4d7] hover:text-red-400 font-label-md text-sm transition-colors rounded-xl hover:bg-red-500/5"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Wrap */}
      <div className="ml-64 min-h-screen flex flex-col">
        {/* TopAppBar Header */}
        <header className="sticky top-0 z-40 w-full bg-[#0b1326]/50 backdrop-blur-md border-b border-white/5 flex justify-between items-center px-8 py-4 h-16">
          <div className="flex items-center gap-4 flex-1">
            <Menu className="text-[#c7c4d7] cursor-pointer hover:bg-[#222a3d] rounded-full p-1.5 w-8 h-8 transition-all" />
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c4d7] w-4 h-4" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources, topics, or AI chats..."
                className="w-full bg-[#131b2e] border border-[#464554]/30 rounded-full py-1.5 pl-10 pr-4 font-body-md text-sm text-[#dae2fd] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all placeholder-[#c7c4d7]/40"
              />
            </form>
          </div>

          <div className="flex items-center gap-4">
            {/* XP status tag */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-[#131b2e] border border-white/5 py-1 px-3 rounded-full text-xs font-semibold text-indigo-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Level {user.level} • {user.xp} XP</span>
              </div>
            )}
            
            <button className="text-[#c7c4d7] cursor-pointer hover:bg-[#222a3d] rounded-full p-1.5 transition-all w-8 h-8 flex items-center justify-center">
              <Bell size={18} />
            </button>

            {user && (
              <div className="w-8 h-8 rounded-full bg-[#222a3d] border border-white/10 overflow-hidden shadow-md">
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </header>

        {/* Page Yield Outlet */}
        <div className="flex-1 flex flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
