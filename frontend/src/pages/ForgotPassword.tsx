import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const ForgotPassword: React.FC = () => {
  const { apiFetch } = useStudyStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);
    setResetLink('');

    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setMessage({ type: 'success', text: data.message });
      if (data.resetToken) {
        setResetLink(`${window.location.origin}/reset-password/${data.resetToken}`);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to send reset link.' });
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
          <h2 className="text-xl font-bold text-white font-headline-lg">Reset your password</h2>
          <p className="text-xs text-slate-400">Enter your email and we'll send you a reset link.</p>
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

          {resetLink && (
            <div className="bg-[#131b2e] border border-indigo-500/20 rounded-xl p-4 text-center space-y-2">
              <p className="text-xs text-[#c7c4d7]">Click the link below to reset your password (expires in 1 hour):</p>
              <a
                href={resetLink}
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium break-all hover:underline"
              >
                {resetLink}
              </a>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || !!message}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>
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

export default ForgotPassword;
