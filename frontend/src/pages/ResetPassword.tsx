import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { apiFetch } = useStudyStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const data = await apiFetch(`/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      setMessage({ type: 'success', text: data.message });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reset password.' });
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
          <h2 className="text-xl font-bold text-white font-headline-lg">Set new password</h2>
          <p className="text-xs text-slate-400">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">New Password</label>
            <input 
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#131b2e] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Confirm Password</label>
            <input 
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#131b2e] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-xs flex gap-2 items-center ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle size={14} className="flex-shrink-0" /> : <AlertCircle size={14} className="flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {message?.type === 'success' ? (
            <Link
              to="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Go to Login
            </Link>
          ) : (
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          )}
        </form>

        <div className="text-center">
          <Link to="/login" className="text-xs text-indigo-400 hover:underline font-medium inline-flex items-center gap-1">
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
