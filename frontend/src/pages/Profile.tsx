import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Camera,
  Save,
  Flame,
  Zap,
  Trophy,
  BookOpen,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const Profile: React.FC = () => {
  const { user, setUser, apiFetch } = useStudyStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stats, setStats] = useState({
    documentsUploaded: 0,
    flashcardsCreated: 0,
    quizzesTaken: 0,
    averageScore: 0
  });

  useEffect(() => {
    if (user?.avatar) {
      const seed = user.avatar.match(/seed=([^&]+)/)?.[1] || '';
      setAvatarSeed(seed);
    }
    apiFetch('/auth/profile')
      .then(data => {
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, [user, apiFetch]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || name)}`;
      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, avatar })
      });
      setUser(data.user);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const generateNewAvatar = () => {
    const newSeed = Math.random().toString(36).substring(2, 8);
    setAvatarSeed(newSeed);
  };

  const nextLevelXp = 1000;
  const currentXp = user?.xp || 0;
  const progress = Math.min(Math.round((currentXp % nextLevelXp) / nextLevelXp * 100), 100);

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-headline-xl">
            Profile Settings
          </h2>
          <p className="text-base text-[#c7c4d7] mt-2 font-body-lg">
            Manage your account details and view your study statistics.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column — Avatar Card + Stats */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="relative group mb-4">
              <div className="w-28 h-28 rounded-full bg-[#222a3d] border-2 border-indigo-500/30 overflow-hidden shadow-lg">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || name)}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={generateNewAvatar}
                className="absolute bottom-1 right-1 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                title="Generate new avatar"
              >
                <Camera size={16} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white">{user?.name}</h3>
            <p className="text-sm text-[#c7c4d7]">{user?.email}</p>
          </div>

          {/* Stats Card */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#c7c4d7] font-label-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-400" />
              Study Statistics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#131b2e] rounded-xl p-4 text-center">
                <BookOpen size={20} className="text-indigo-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white">{stats.documentsUploaded}</div>
                <div className="text-xs text-[#c7c4d7]">Documents</div>
              </div>
              <div className="bg-[#131b2e] rounded-xl p-4 text-center">
                <Zap size={20} className="text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white">{stats.flashcardsCreated}</div>
                <div className="text-xs text-[#c7c4d7]">Flashcards</div>
              </div>
              <div className="bg-[#131b2e] rounded-xl p-4 text-center">
                <Award size={20} className="text-emerald-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white">{stats.quizzesTaken}</div>
                <div className="text-xs text-[#c7c4d7]">Quizzes</div>
              </div>
              <div className="bg-[#131b2e] rounded-xl p-4 text-center">
                <Trophy size={20} className="text-purple-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white">{stats.averageScore}%</div>
                <div className="text-xs text-[#c7c4d7]">Avg Score</div>
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold uppercase tracking-wider text-[#c7c4d7] font-label-sm flex items-center gap-2">
                <Flame size={16} className="text-orange-400" />
                Level Progress
              </span>
              <span className="text-xs text-[#c7c4d7]">
                Level {user?.level || 1}
              </span>
            </div>
            <div className="w-full bg-[#1a2340] rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-[#c7c4d7]">
              <span>{currentXp % nextLevelXp} XP</span>
              <span>{nextLevelXp} XP</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-[#c7c4d7]">
              <Flame size={16} className="text-orange-400" />
              <span>{user?.streak || 0} day study streak</span>
            </div>
          </div>
        </div>

        {/* Right Column — Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="glass-card p-8 rounded-2xl space-y-6">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <User size={20} className="text-indigo-400" />
              Account Details
            </h4>

            {/* Success/Error Message */}
            {message && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                {message.text}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-[#c7c4d7] mb-2">
                <User size={14} className="inline mr-1.5" />
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#131b2e] border border-[#464554]/30 rounded-xl py-3 px-4 font-body-md text-sm text-[#dae2fd] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all placeholder-[#c7c4d7]/40"
                placeholder="Your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#c7c4d7] mb-2">
                <Mail size={14} className="inline mr-1.5" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#131b2e] border border-[#464554]/30 rounded-xl py-3 px-4 font-body-md text-sm text-[#dae2fd] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all placeholder-[#c7c4d7]/40"
                placeholder="your@email.com"
              />
            </div>

            {/* Avatar Preview */}
            <div>
              <label className="block text-sm font-semibold text-[#c7c4d7] mb-2">
                Avatar Preview
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#222a3d] border border-indigo-500/20 overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || name)}`}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateNewAvatar}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Generate new avatar
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={saving}
                className={`px-8 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all duration-200 active:scale-95 shadow-lg shadow-indigo-600/20 border-t border-white/20 ${
                  saving ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
