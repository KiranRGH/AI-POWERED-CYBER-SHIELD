import React, { useState } from 'react';
import {
  Shield,
  Mail,
  Lock,
  User,
  ArrowRight,
  ScanFace,
  Eye,
  CheckCircle2,
  Fingerprint,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { toast } from 'sonner';
import { FaceBlinkScanner, FaceBlinkResult } from '../../components/biometrics/FaceBlinkScanner';
import { FingerprintScanner } from '../../components/biometrics/FingerprintScanner';

export const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Face biometric state (Mandatory)
  const [faceData, setFaceData] = useState<string | null>(null);
  const [faceBlinkVerified, setFaceBlinkVerified] = useState<boolean>(false);
  const [faceSnapshot, setFaceSnapshot] = useState<string | null>(null);
  const [showFaceScanner, setShowFaceScanner] = useState<boolean>(true);

  // Fingerprint biometric state (Optional)
  const [enableFingerprint, setEnableFingerprint] = useState<boolean>(false);
  const [fingerprintCredentialId, setFingerprintCredentialId] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [semester, setSemester] = useState('6');
  const [studyDuration, setStudyDuration] = useState('2021 - 2025');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle Face Blink Verification callback
  const handleFaceVerified = (result: FaceBlinkResult) => {
    setFaceData(result.descriptor);
    setFaceBlinkVerified(true);
    setFaceSnapshot(result.snapshot);
    setShowFaceScanner(false);
    toast.success('Face biometric enrolled & eye-blink liveness confirmed! ✓');
  };

  // Handle Fingerprint Verification callback
  const handleFingerprintVerified = (credentialId: string) => {
    setFingerprintCredentialId(credentialId);
    toast.success('Biometric fingerprint enrolled successfully! ✓');
  };

  const handleResetFaceScan = () => {
    setFaceData(null);
    setFaceBlinkVerified(false);
    setFaceSnapshot(null);
    setShowFaceScanner(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanUsername = username.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Institutional Roll Number validation
    const usnRegex = /^1[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{3}$/;
    if (!usnRegex.test(cleanUsername)) {
      toast.error('Username must be a valid institutional Roll Number / USN in format: 1(College)(Year)(Branch)(Roll) e.g. 1CK21CS045');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // MANDATORY Anti-spoofing Face + Eye Blink Check
    if (!faceBlinkVerified || !faceData) {
      toast.error('Face Recognition with Eye Blink liveness verification is REQUIRED to create an account.');
      setShowFaceScanner(true);
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        username: cleanUsername,
        email: cleanEmail,
        password,
        full_name: fullName.trim(),
        study_duration: studyDuration,
        semester: parseInt(semester, 10),
        face_data: faceData,
        face_registered: true,
        liveness_blink_verified: true,
        fingerprint_credential_id: fingerprintCredentialId || undefined,
        fingerprint_registered: !!fingerprintCredentialId,
      });

      sessionStorage.setItem('pending_verification_email', cleanEmail);
      toast.success('Registration successful! Verification code dispatched to your email.');

      navigate(`/verify-email?email=${encodeURIComponent(cleanEmail)}`, {
        state: { email: cleanEmail }
      });
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Registration failed. Check network or server connection.';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 shadow-lg shadow-cyan-950/40 mb-3">
            <Shield size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black text-gray-100 tracking-wider">CREATE SECURE ACCOUNT</h1>
          <p className="text-gray-400 text-xs mt-1">
            Biometric Enrollment & Identity Defense Gateway
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-blue-600"></div>

          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      <User size={16} />
                    </span>
                    <input
                      name="full_name"
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      <Mail size={16} />
                    </span>
                    <input
                      name="email"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      placeholder="john@college.edu"
                    />
                  </div>
                </div>
              </div>

              {/* Student Roll Number / USN */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Student Roll Number / USN (Username)
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">Format: 1CK21CS045</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    <User size={16} />
                  </span>
                  <input
                    name="username"
                    required
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-gray-100 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                    placeholder="e.g. 1CK21CS045"
                  />
                </div>
              </div>

              {/* Semester & Study Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Semester
                  </label>
                  <select
                    name="semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-200 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Study Duration
                  </label>
                  <select
                    name="study_duration"
                    value={studyDuration}
                    onChange={(e) => setStudyDuration(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="2021 - 2025">2021 - 2025</option>
                    <option value="2022 - 2026">2022 - 2026</option>
                    <option value="2023 - 2027">2023 - 2027</option>
                    <option value="2024 - 2028">2024 - 2028</option>
                    <option value="2025 - 2029">2025 - 2029</option>
                  </select>
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Master Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      <Lock size={16} />
                    </span>
                    <input
                      name="password"
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      <Lock size={16} />
                    </span>
                    <input
                      name="confirm_password"
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* SECTION 1: MANDATORY FACE BIOMETRIC + EYE BLINK LIVENESS */}
              {/* ======================================================== */}
              <div className="border-t border-gray-700 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-700">
                      <ScanFace size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-100 uppercase tracking-wide flex items-center gap-1.5">
                        <span>Face Recognition & Eye Blink Liveness</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950/80 text-rose-400 border border-rose-800 font-semibold">
                          Required
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Anti-spoofing check: natural eye blink verifies living human presence
                      </p>
                    </div>
                  </div>

                  {faceBlinkVerified && (
                    <button
                      type="button"
                      onClick={handleResetFaceScan}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800"
                    >
                      <RefreshCw size={12} />
                      Re-scan Face
                    </button>
                  )}
                </div>

                {faceBlinkVerified ? (
                  /* Verified Confirmation Card */
                  <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-4 flex items-center justify-between animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                      {faceSnapshot ? (
                        <div className="relative">
                          <img
                            src={faceSnapshot}
                            alt="Face Snapshot"
                            className="w-14 h-14 object-cover rounded-xl border border-emerald-400 shadow-md shadow-emerald-950"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-gray-950 p-0.5 rounded-full">
                            <CheckCircle2 size={14} />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-900/50 rounded-xl text-emerald-400 border border-emerald-600">
                          <CheckCircle2 size={24} />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <span>Face Biometric Enrolled & Eye Blink Verified ✓</span>
                        </div>
                        <p className="text-[11px] text-emerald-200/80 mt-0.5 font-mono">
                          Anti-Spoofing: Living Human Confirmed (100% Liveness)
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                          Vector: {faceData?.slice(0, 28)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                        LIVENESS CONFIRMED
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Camera Scanner Component */
                  <div className="space-y-2">
                    <FaceBlinkScanner
                      mode="register"
                      title="Enroll Facial Biometric"
                      subtitle="Look into camera and blink eyes naturally to prove living identity"
                      onVerified={handleFaceVerified}
                    />
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 2: OPTIONAL FINGERPRINT ENROLLMENT               */}
              {/* ======================================================== */}
              <div className="border-t border-gray-700 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-700">
                      <Fingerprint size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-100 uppercase tracking-wide flex items-center gap-1.5">
                        <span>Fingerprint Authentication</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold">
                          Optional
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Enable instant Touch ID / Windows Hello login
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFingerprint}
                      onChange={(e) => setEnableFingerprint(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                {enableFingerprint && (
                  <div className="animate-in fade-in duration-200">
                    {fingerprintCredentialId ? (
                      <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-300 text-xs font-medium">
                          <CheckCircle2 size={16} />
                          <span>Biometric Fingerprint Enrolled ✓</span>
                          <span className="text-[10px] font-mono text-gray-400 ml-2">
                            ({fingerprintCredentialId.slice(0, 16)}...)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFingerprintCredentialId(null)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <FingerprintScanner
                        mode="register"
                        title="Enroll Fingerprint Sensor"
                        username={username || fullName}
                        onVerified={handleFingerprintVerified}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-700">
                {!faceBlinkVerified && (
                  <div className="mb-3 p-3 bg-amber-950/40 border border-amber-600/50 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>Please complete face alignment & eye blink liveness above to unlock account creation.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !faceBlinkVerified}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? (
                    <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Register Account with Biometrics</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Bar */}
          <div className="px-6 md:px-8 py-4 bg-gray-900/60 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
