import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Unlock,
  AlertTriangle,
  ScanFace,
  Fingerprint,
  KeyRound,
  Eye,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/axios';
import { authApi, BiometricStatus } from '../../api/auth';
import { toast } from 'sonner';
import { FaceBlinkScanner, FaceBlinkResult } from '../../components/biometrics/FaceBlinkScanner';
import { FingerprintScanner } from '../../components/biometrics/FingerprintScanner';

type AuthMode = 'FACE' | 'FINGERPRINT' | 'PASSWORD';

export const LoginPage = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('FACE');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountLockedMessage, setAccountLockedMessage] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);

  // Unblock request modal states
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [unblockIdentifier, setUnblockIdentifier] = useState('');
  const [unblockReason, setUnblockReason] = useState('');
  const [unblockSubmitting, setUnblockSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Load account biometric status on identifier change
  React.useEffect(() => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setBiometricStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await authApi.getBiometricStatus(trimmed);
        setBiometricStatus(res);
      } catch {
        setBiometricStatus(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [identifier]);

  // Handle Standard Password Login
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your email or username');
      return;
    }
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await login({
        login: identifier.trim(),
        password,
        auth_mode: 'PASSWORD'
      });
      toast.success('Successfully authenticated with password');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      handleAuthError(error, identifier);
    } finally {
      setLoading(false);
    }
  };

  // Handle Face Biometric + Eye Blink Login
  const handleFaceVerified = async (result: FaceBlinkResult) => {
    if (!identifier.trim()) {
      toast.error('Please enter your username or registered email first');
      return;
    }

    setLoading(true);
    try {
      toast.info('Verifying facial biometric and blink liveness token...');
      await login({
        login: identifier.trim(),
        auth_mode: 'FACE',
        face_data: result.descriptor,
        liveness_blink_verified: true
      });
      toast.success('Face biometric & eye blink confirmed! Access granted.');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      handleAuthError(error, identifier);
    } finally {
      setLoading(false);
    }
  };

  // Handle Fingerprint Biometric Login
  const handleFingerprintVerified = async (credentialId: string) => {
    if (!identifier.trim()) {
      toast.error('Please enter your username or registered email first');
      return;
    }

    setLoading(true);
    try {
      toast.info('Verifying fingerprint biometric credential...');
      await login({
        login: identifier.trim(),
        auth_mode: 'FINGERPRINT',
        fingerprint_credential_id: credentialId
      });
      toast.success('Fingerprint verified! Access granted.');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      handleAuthError(error, identifier);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error: any, currentId: string) => {
    const msg = error?.response?.data?.detail || 'Authentication failed. Check credentials or biometric sensor.';
    toast.error(msg);
    if (
      error?.response?.status === 403 ||
      msg.toLowerCase().includes('locked') ||
      msg.toLowerCase().includes('suspend') ||
      msg.toLowerCase().includes('block')
    ) {
      setAccountLockedMessage(msg);
      setUnblockIdentifier(currentId.trim() || '');
    }
  };

  // Unblock Request submission
  const handleUnblockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unblockIdentifier.trim()) {
      toast.error('Please enter your username or registered email');
      return;
    }
    setUnblockSubmitting(true);
    try {
      const res = await apiClient.post('/auth/request-unblock', {
        username_or_email: unblockIdentifier.trim(),
        reason: unblockReason.trim() || 'User requested account unblock for access restoration.'
      });
      toast.success(res.data.message || 'Unblock request submitted to administrators!');
      setShowUnblockModal(false);
      setAccountLockedMessage(null);
      setUnblockReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit unblock request');
    } finally {
      setUnblockSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 shadow-lg shadow-cyan-950/40 mb-3">
            <Shield size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black text-gray-100 tracking-wider">CYBERSHIELD AI</h1>
          <p className="text-gray-400 text-xs mt-1">
            Biometric Threat Defense & Autonomous Access Gateway
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-blue-600"></div>

          {/* Account Locked Banner */}
          {accountLockedMessage && (
            <div className="m-6 mb-0 p-4 bg-rose-950/50 border border-rose-500/60 rounded-xl space-y-2 text-xs text-rose-200 animate-in fade-in">
              <div className="flex items-center gap-2 font-semibold text-rose-300">
                <AlertTriangle size={16} />
                <span>Account Access Restricted / Locked</span>
              </div>
              <p className="leading-relaxed">{accountLockedMessage}</p>
              <button
                type="button"
                onClick={() => setShowUnblockModal(true)}
                className="w-full mt-2 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 shadow transition-colors"
              >
                <Unlock size={14} />
                Request Account Unblock
              </button>
            </div>
          )}

          <div className="p-6 md:p-8 space-y-6">
            {/* Identity Input (Shared across modes) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Account Identifier
                </label>
                <span className="text-[11px] text-cyan-400 font-mono">
                  admin, analyst, or Roll No (e.g. 1CK21CS099)
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <Mail size={18} />
                </span>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setUnblockIdentifier(e.target.value);
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  placeholder="Enter username or registered email"
                />
              </div>

              {biometricStatus && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] animate-in fade-in">
                  {biometricStatus.face_registered ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-600/80 flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>1 Face Enrolled & Bound to @{biometricStatus.username}</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-gray-400 border border-gray-700">
                      No Face Enrolled (Will bind on 1st login)
                    </span>
                  )}

                  {biometricStatus.fingerprint_registered ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-600/80 flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>1 Fingerprint Enrolled & Bound to @{biometricStatus.username}</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-gray-400 border border-gray-700">
                      No Fingerprint Enrolled
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Verification Method Switcher Tabs */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Authentication Mode
              </label>
              <div className="grid grid-cols-3 gap-2 bg-gray-900/80 p-1.5 rounded-xl border border-gray-700/80">
                {/* 1. Face ID + Eye Blink (Primary Anti-Spoofing Mode) */}
                <button
                  type="button"
                  onClick={() => setAuthMode('FACE')}
                  className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    authMode === 'FACE'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40 ring-1 ring-cyan-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <ScanFace size={16} />
                    <Eye size={12} className={authMode === 'FACE' ? 'text-cyan-200' : 'text-gray-500'} />
                  </div>
                  <span>Face ID + Blink</span>
                </button>

                {/* 2. Fingerprint Scanner (Optional Fast Biometric) */}
                <button
                  type="button"
                  onClick={() => setAuthMode('FINGERPRINT')}
                  className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    authMode === 'FINGERPRINT'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40 ring-1 ring-cyan-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  <Fingerprint size={16} className="mb-1" />
                  <span>Fingerprint</span>
                </button>

                {/* 3. Password Verification (Standard / Fallback) */}
                <button
                  type="button"
                  onClick={() => setAuthMode('PASSWORD')}
                  className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    authMode === 'PASSWORD'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40 ring-1 ring-cyan-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  <KeyRound size={16} className="mb-1" />
                  <span>Password</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: Face Recognition with Eye Blink */}
            {authMode === 'FACE' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl flex items-start gap-3">
                  <div className="p-1.5 bg-cyan-900/80 rounded-lg text-cyan-300 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div className="text-xs text-cyan-100">
                    <span className="font-bold text-cyan-300">Anti-Spoofing Protocol: </span>
                    Align your face in the oval frame and <strong className="text-cyan-300 underline">blink your eyes</strong> naturally to confirm living presence and sign in.
                  </div>
                </div>

                {!identifier.trim() ? (
                  <div className="p-4 bg-gray-900/90 border border-gray-700 rounded-xl text-center text-xs text-amber-400 flex items-center justify-center gap-2">
                    <AlertTriangle size={15} />
                    <span>Please enter your username or registered email above to activate face recognition</span>
                  </div>
                ) : (
                  <FaceBlinkScanner
                    mode="login"
                    title="Live Face & Eye Blink Verification"
                    subtitle="Strict 1:1 facial matching: Verifies living human blink against bound profile"
                    enrolledDescriptor={biometricStatus?.face_descriptor}
                    onVerified={handleFaceVerified}
                  />
                )}
              </div>
            )}

            {/* TAB CONTENT: Biometric Fingerprint */}
            {authMode === 'FINGERPRINT' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl flex items-start gap-3">
                  <div className="p-1.5 bg-cyan-900/80 rounded-lg text-cyan-300 mt-0.5">
                    <Fingerprint size={16} />
                  </div>
                  <div className="text-xs text-cyan-100">
                    <span className="font-bold text-cyan-300">Hardware Touch Authentication: </span>
                    Place your enrolled finger on the biometric scanner or sensor to authenticate instantly.
                  </div>
                </div>

                {!identifier.trim() ? (
                  <div className="p-4 bg-gray-900/90 border border-gray-700 rounded-xl text-center text-xs text-amber-400 flex items-center justify-center gap-2">
                    <AlertTriangle size={15} />
                    <span>Please enter your username or registered email above to activate fingerprint scan</span>
                  </div>
                ) : (
                  <FingerprintScanner
                    mode="login"
                    title="Enrolled Fingerprint Authentication"
                    username={identifier}
                    enrolledCredentialId={biometricStatus?.fingerprint_credential_id}
                    onVerified={handleFingerprintVerified}
                  />
                )}
              </div>
            )}

            {/* TAB CONTENT: Master Password Verification */}
            {authMode === 'PASSWORD' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Password
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setShowUnblockModal(true)}
                        className="text-amber-400 hover:text-amber-300 font-medium"
                      >
                        Request Unblock
                      </button>
                      <span className="text-gray-600">•</span>
                      <Link to="/forgot-password" className="text-cyan-400 hover:text-cyan-300">
                        Forgot Password?
                      </Link>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                      <Lock size={18} />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 bg-gray-900 border-gray-700 rounded text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
                  />
                  <label htmlFor="remember" className="ml-2 block text-xs text-gray-400">
                    Remember me on this trusted terminal
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/30 disabled:opacity-70 text-sm"
                >
                  {loading ? (
                    <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span>
                  ) : (
                    <>
                      <span>Authenticate with Password</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 md:px-8 py-4 bg-gray-900/60 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
            <span>
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2">
                Request Access
              </Link>
            </span>
            <button
              type="button"
              onClick={() => setShowUnblockModal(true)}
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Account Locked?
            </button>
          </div>
        </div>
      </div>

      {/* Account Unblock Request Modal */}
      {showUnblockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <Unlock size={18} className="text-emerald-400" />
                Request Account Unblock
              </h3>
              <button
                type="button"
                onClick={() => setShowUnblockModal(false)}
                className="text-gray-400 hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              If your account has been locked due to repeated incorrect password entries or administrative suspension, submit a restoration request to notify the security administrator.
            </p>

            <form onSubmit={handleUnblockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-gray-300 mb-1">Username or Registered Email</label>
                <input
                  type="text"
                  required
                  value={unblockIdentifier}
                  onChange={(e) => setUnblockIdentifier(e.target.value)}
                  placeholder="e.g. 1CK21CS099 or user@example.com"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-300 mb-1">Reason for Unblock Request</label>
                <textarea
                  required
                  rows={3}
                  value={unblockReason}
                  onChange={(e) => setUnblockReason(e.target.value)}
                  placeholder="Please specify why your account should be unblocked (e.g. 'Accidentally mistyped password multiple times during lab test', 'Authorized student login needed')."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnblockModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={unblockSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-950 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {unblockSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Unlock size={14} />
                      Submit Unblock Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
