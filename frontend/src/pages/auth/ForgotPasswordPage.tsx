import React, { useState } from 'react';
import { Mail, ArrowRight, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { toast } from 'sonner';

export const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [devToken, setDevToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSent(true);
      if (res.dev_token) {
        setDevToken(res.dev_token);
        toast.success(`Reset token: ${res.dev_token}`);
      } else {
        toast.success('Password reset instructions sent to your email.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-cyan-900/30 border border-cyan-500/50 mb-4">
            <Shield size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Recovery Protocol</h1>
          <p className="text-gray-400 text-sm mt-2">Reset your authentication credentials</p>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
          <div className="p-8">
            {sent ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-900/30 border border-emerald-500/50 mb-4 text-emerald-400">
                  <Mail size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-100 mb-2">Check Your Inbox</h3>
                <p className="text-gray-400 text-sm mb-4">
                  If an account matches <span className="text-cyan-400 font-medium">{email}</span>, a recovery code has been dispatched.
                </p>
                {devToken && (
                  <div className="mb-5 p-3 bg-cyan-950/60 border border-cyan-600/50 rounded-lg text-xs text-gray-300">
                    <p className="text-cyan-400 font-semibold mb-1">Local Dev / Simulation Token:</p>
                    <code className="text-cyan-300 font-mono text-sm">{devToken}</code>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(`/reset-password${devToken ? `?token=${devToken}` : ''}`)}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                  >
                    Enter Reset Token →
                  </button>
                  <div>
                    <Link to="/login" className="text-xs text-cyan-500 hover:text-cyan-400">
                      Return to Login
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Registered Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      <Mail size={18} />
                    </span>
                    <input 
                      name="email" 
                      required 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" 
                      placeholder="admin@cybershield.ai" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/20 disabled:opacity-70"
                >
                  {loading ? (
                    <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
          <div className="px-8 py-4 bg-gray-900/50 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400">
              Remembered your credentials? <Link to="/login" className="text-cyan-500 hover:text-cyan-400 font-medium">Cancel Protocol</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
