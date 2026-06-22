import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setToken, setUser, apiFetch } = useStudyStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      // Save to store
      setToken(data.token);
      setUser(data.user);

      // Navigate to dashboard
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[80px]" />
      
      <div className="w-full max-w-md glass-card rounded-[2rem] p-8 border border-white/10 relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-indigo-400 font-bold text-2xl">
            <Sparkles className="animate-pulse" />
            <span>StudyGen AI</span>
          </div>
          <h2 className="text-xl font-bold text-white font-headline-lg">Welcome back</h2>
          <p className="text-xs text-slate-400">Enter your credentials to access your study companion.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@stanford.edu"
              className="w-full bg-[#131b2e] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Password</label>
            <input 
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#131b2e] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
