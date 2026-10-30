import React, { useState, useRef, useEffect } from 'react';
import { Shield, ArrowRight, RefreshCw, Mail, AlertCircle, Info } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { toast } from 'sonner';

export const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const initialEmail = 
    queryParams.get('email') || 
    (location.state as any)?.email || 
    sessionStorage.getItem('pending_verification_email') || 
    '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value !== '' && index < 5) {
        inputs.current[index + 1]?.focus();
      }

      if (newCode.every(v => v !== '')) {
        handleVerify(newCode.join(''));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setCode(digits);
      inputs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullCode: string) => {
    if (!email) {
      toast.error('Please specify your registration email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyEmail({
        email: email.trim(),
        otp: fullCode.trim(),
      });

      toast.success(res.message || 'Email verified successfully! You can now log in.');
      sessionStorage.removeItem('pending_verification_email');
      navigate('/login');
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Invalid or expired verification code.';
      toast.error(detail);
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Please enter your email address to receive a new code.');
      return;
    }

    setResending(true);
    try {
      await authApi.resendOTP(email.trim());
      toast.success('A new verification code has been dispatched to your email.');
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Failed to resend code.';
      toast.error(detail);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden relative p-8">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-cyan-900/30 border border-cyan-500/50 mb-4">
            <Shield size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Verify Email</h1>
          <p className="text-gray-400 text-sm mt-2">
            Enter the 6-digit verification code sent to:
          </p>
          <div className="mt-2 flex items-center justify-center space-x-1.5 text-cyan-400 font-medium text-sm">
            <Mail size={16} />
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="bg-gray-900/80 border border-gray-700 rounded px-2.5 py-1 text-xs text-center text-gray-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex justify-between gap-2 mb-6" onPaste={handlePaste}>
          {code.map((v, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={v}
              onChange={e => handleChange(e, i)}
              onKeyDown={e => handleKeyDown(e, i)}
              className="w-12 h-12 text-center text-xl font-bold bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          ))}
        </div>

        <button 
          onClick={() => handleVerify(code.join(''))}
          disabled={loading || code.some(v => v === '')}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/20 disabled:opacity-70 mb-4"
        >
          {loading ? (
            <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span>
          ) : (
            <>
              <span>Verify Account</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-700/60 pt-4">
          <span>Didn't get the code?</span>
          <button 
            type="button"
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="text-cyan-400 hover:text-cyan-300 font-medium disabled:opacity-50 flex items-center space-x-1"
          >
            {resending && <RefreshCw size={12} className="animate-spin mr-1" />}
            <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}</span>
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-900/40 rounded-lg border border-gray-700/50 text-[11px] text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Mail size={13} className="text-cyan-400" />
            Email Verification Code
          </p>
          <p className="text-gray-400">
            A 6-digit verification code has been dispatched to your email address. Please check your inbox and spam folder.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-gray-400 hover:text-gray-200">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
