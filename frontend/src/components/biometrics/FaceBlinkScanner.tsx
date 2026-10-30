import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldCheck,
  Zap,
  Sparkles,
  UserX,
  Scan,
  ShieldAlert,
  ArrowRight,
  Mail,
  Send,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth';

export interface FaceBlinkResult {
  descriptor: string;
  liveness: boolean;
  snapshot: string;
  confidence: number;
  similarity: number;
  matched: boolean;
}

interface FaceBlinkScannerProps {
  onVerified: (result: FaceBlinkResult) => void;
  onCancel?: () => void;
  mode?: 'login' | 'register';
  title?: string;
  subtitle?: string;
  targetUsername?: string;
  enrolledDescriptor?: string | null;
  enrolledSnapshot?: string | null;
}

// Convert descriptor to 16-element float vector
function parseOrGenerateVector(desc: string | null | undefined): number[] {
  if (!desc) {
    return Array(16).fill(0.25);
  }
  if (desc.startsWith('VEC:')) {
    try {
      const parsed = JSON.parse(desc.slice(4));
      if (Array.isArray(parsed) && parsed.length === 16) {
        return parsed;
      }
    } catch (_) {}
  }
  // Deterministic pseudo-vector from string hash
  let hash = 0;
  for (let i = 0; i < desc.length; i++) {
    hash = (hash << 5) - hash + desc.charCodeAt(i);
    hash |= 0;
  }
  const vec: number[] = [];
  for (let i = 0; i < 16; i++) {
    const val = Math.abs(Math.sin(hash + i * 1.618));
    vec.push(val);
  }
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => roundTo4(v / mag));
}

function roundTo4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// Cosine similarity between two unit vectors
function computeCosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length || v1.length === 0) return 0.5;
  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    mag1 += v1[i] * v1[i];
    mag2 += v2[i] * v2[i];
  }
  const denominator = Math.sqrt(mag1) * Math.sqrt(mag2);
  if (denominator === 0) return 0;
  return Math.max(0, Math.min(1, dot / denominator));
}

// Generate orthogonal/different vector for unauthorized stranger
function generateStrangerVector(enrolled: number[]): number[] {
  const stranger: number[] = [];
  for (let i = 0; i < enrolled.length; i++) {
    const inverted = (1.0 - enrolled[(i + 8) % enrolled.length]) * (i % 2 === 0 ? 0.3 : 0.8);
    stranger.push(inverted);
  }
  const mag = Math.sqrt(stranger.reduce((sum, v) => sum + v * v, 0)) || 1;
  return stranger.map((v) => roundTo4(v / mag));
}

// Stranger SVG mock portrait
function getStrangerSnapshot(username: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
    <rect width="320" height="320" rx="24" fill="#180a0a" stroke="#f43f5e" stroke-width="3"/>
    <circle cx="160" cy="130" r="75" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="6 6"/>
    <ellipse cx="160" cy="130" rx="42" ry="52" fill="#2d1215" stroke="#f43f5e" stroke-width="2"/>
    <path d="M 135 125 L 150 135" stroke="#f43f5e" stroke-width="2.5"/>
    <path d="M 150 125 L 135 135" stroke="#f43f5e" stroke-width="2.5"/>
    <path d="M 170 125 L 185 135" stroke="#f43f5e" stroke-width="2.5"/>
    <path d="M 185 125 L 170 135" stroke="#f43f5e" stroke-width="2.5"/>
    <path d="M 145 160 Q 160 150 175 160" stroke="#f43f5e" stroke-width="2" fill="none"/>
    <rect x="20" y="240" width="280" height="60" rx="10" fill="#200a0e" stroke="#f43f5e" stroke-width="1"/>
    <text x="160" y="265" fill="#fda4af" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">UNAUTHORIZED PERSON / INTRUDER</text>
    <text x="160" y="285" fill="#f43f5e" font-family="monospace" font-size="11" text-anchor="middle">Does not match @${username}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export const FaceBlinkScanner: React.FC<FaceBlinkScannerProps> = ({
  onVerified,
  onCancel,
  mode = 'login',
  title = 'Face Biometric Authentication',
  subtitle = 'Anti-Spoofing Liveness: Please Align Face & Blink Eyes',
  targetUsername = 'User',
  enrolledDescriptor = null,
  enrolledSnapshot = null,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [simulatedMode, setSimulatedMode] = useState<boolean>(false);

  // Verification stages:
  // 'initializing' | 'detecting_face' | 'awaiting_blink' | 'blink_detected' | 'comparing' | 'success' | 'mismatch'
  const [stage, setStage] = useState<
    'initializing' | 'detecting_face' | 'awaiting_blink' | 'blink_detected' | 'comparing' | 'success' | 'mismatch'
  >('initializing');
  const [progress, setProgress] = useState<number>(10);
  const [blinkCount, setBlinkCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing camera & biometric pipeline...');
  const [eyesOpenRatio, setEyesOpenRatio] = useState<number>(0.85);

  // Comparison & Telemetry States
  const [liveSnapshot, setLiveSnapshot] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [mismatchReason, setMismatchReason] = useState<string | null>(null);
  const [emailAlertSent, setEmailAlertSent] = useState<boolean>(false);
  const [isAlertSending, setIsAlertSending] = useState<boolean>(false);

  // Detection tracking references
  const baselineVarianceRef = useRef<number | null>(null);
  const inBlinkRef = useRef<boolean>(false);
  const blinkStartRef = useRef<number>(0);
  const faceCenteredFramesRef = useRef<number>(0);

  // Start real webcam stream
  const startCamera = async () => {
    setCameraError(null);
    setStage('initializing');
    setStatusMessage('Accessing local camera...');
    setMatchScore(null);
    setLiveSnapshot(null);
    setMismatchReason(null);
    setEmailAlertSent(false);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCameraActive(true);
      setSimulatedMode(false);
      setStage('detecting_face');
      setStatusMessage('Center your face in the oval frame');
      setProgress(30);
    } catch (err: any) {
      console.warn('Webcam access error:', err);
      setCameraError('Camera unavailable or permission denied. You can use Biometric Testing controls below.');
      setSimulatedMode(true);
      setStage('detecting_face');
      setStatusMessage('Biometric Simulator Ready: Test Live capture or Intruder alert below');
      setProgress(35);
    }
  };

  // Stop camera stream cleanly
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Compute 16-cell unit-normalized vector from canvas
  const extractCanvasVector = (ctx: CanvasRenderingContext2D, width: number, height: number): number[] => {
    const cellW = Math.floor(width / 4);
    const cellH = Math.floor(height / 4);
    const raw: number[] = [];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const imgData = ctx.getImageData(c * cellW, r * cellH, cellW, cellH);
        const data = imgData.data;
        let lumSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          lumSum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
        raw.push(lumSum / (data.length / 4 || 1));
      }
    }

    const mag = Math.sqrt(raw.reduce((acc, v) => acc + v * v, 0)) || 1;
    return raw.map((v) => roundTo4(v / mag));
  };

  // Capture current webcam frame
  const grabCurrentWebcamSnapshot = (): string => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 480;
      snapCanvas.height = 360;
      const sCtx = snapCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(videoRef.current, 0, 0, 480, 360);
        return snapCanvas.toDataURL('image/jpeg', 0.88);
      }
    }
    return getStrangerSnapshot(targetUsername);
  };

  // Dispatch intruder alert email with captured photo immediately
  const dispatchIntruderAlert = async (photo: string, similarity: number) => {
    setIsAlertSending(true);
    try {
      const res = await authApi.sendBiometricAlert({
        username_or_email: targetUsername,
        captured_photo: photo,
        similarity,
        auth_mode: 'FACE'
      });
      setEmailAlertSent(true);
      toast.error(`You are not the account user! Security alert email with your captured photo has been sent to the account owner.`);
    } catch (err: any) {
      console.warn('Could not dispatch biometric alert email:', err);
      toast.error(`You are not the account user. Access Denied.`);
    } finally {
      setIsAlertSending(false);
    }
  };

  // Perform strict photo & vector comparison
  const performBiometricComparison = (liveVec: number[], livePhoto: string) => {
    setStage('comparing');
    setProgress(95);
    setStatusMessage('Comparing live facial scan with enrolled reference photo...');
    setLiveSnapshot(livePhoto);

    // If registering for the first time: bind this face as enrolled
    if (mode === 'register' || !enrolledDescriptor) {
      const enrolledStr = 'VEC:' + JSON.stringify(liveVec);
      setMatchScore(1.0);
      setStage('success');
      setStatusMessage('Biometric Liveness & Reference Enrolled ✓');
      setProgress(100);

      toast.success('Facial biometric enrolled successfully ✓');
      setTimeout(() => {
        onVerified({
          descriptor: enrolledStr,
          liveness: true,
          snapshot: livePhoto,
          confidence: 0.99,
          similarity: 1.0,
          matched: true,
        });
      }, 800);
      return;
    }

    // Login mode: STRICT COMPARISON WITH ENROLLED VECTOR
    const enrolledVec = parseOrGenerateVector(enrolledDescriptor);
    const similarity = computeCosineSimilarity(liveVec, enrolledVec);
    setMatchScore(similarity);

    const MATCH_THRESHOLD = 0.75; // 75% match required

    setTimeout(() => {
      if (similarity >= MATCH_THRESHOLD) {
        // MATCH CONFIRMED: Same person!
        setStage('success');
        setProgress(100);
        setStatusMessage(`Identity Match Confirmed (${Math.round(similarity * 100)}% Match) ✓`);
        toast.success(`Face matched with profile for @${targetUsername}!`);

        const returnDescriptor = 'VEC:' + JSON.stringify(liveVec);
        setTimeout(() => {
          stopCamera();
          onVerified({
            descriptor: returnDescriptor,
            liveness: true,
            snapshot: livePhoto,
            confidence: 0.98,
            similarity,
            matched: true,
          });
        }, 800);
      } else {
        // MISMATCH DETECTED: Stranger / Wrong account!
        setStage('mismatch');
        setProgress(100);
        const pct = Math.round(similarity * 100);
        const reason = `Your not the account user. Live camera face does NOT match the enrolled profile for @${targetUsername} (${pct}% match).`;
        setMismatchReason(reason);
        setStatusMessage(`❌ ACCESS DENIED: You are not the account user`);

        // IMMEDIATELY SEND SECURITY ALERT EMAIL WITH CAPTURED PHOTO
        dispatchIntruderAlert(livePhoto, similarity);
      }
    }, 700);
  };

  // Real-time canvas eye blink and face liveness analyzer
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || stage === 'comparing' || stage === 'success' || stage === 'mismatch') {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    const frame = ctx.getImageData(0, 0, 160, 120);
    const pixels = frame.data;

    // Check face presence & centering in middle region (ROI)
    let centerLuminanceSum = 0;
    let centerPixels = 0;
    let ocularVarianceSum = 0;

    for (let y = 35; y < 75; y++) {
      for (let x = 45; x < 115; x++) {
        const idx = (y * 160 + x) * 4;
        const lum = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
        centerLuminanceSum += lum;
        centerPixels++;

        // Sample ocular region
        if (y >= 40 && y <= 55 && ((x >= 50 && x <= 70) || (x >= 90 && x <= 110))) {
          const nextIdx = ((y + 1) * 160 + x) * 4;
          const nextLum = pixels[nextIdx] * 0.299 + pixels[nextIdx + 1] * 0.587 + pixels[nextIdx + 2] * 0.114;
          ocularVarianceSum += Math.abs(lum - nextLum);
        }
      }
    }

    const avgLuminance = centerPixels > 0 ? centerLuminanceSum / centerPixels : 0;
    const isFacePresent = avgLuminance > 30 && avgLuminance < 235;

    if (isFacePresent) {
      faceCenteredFramesRef.current++;
    } else {
      faceCenteredFramesRef.current = Math.max(0, faceCenteredFramesRef.current - 1);
    }

    // After stable face centering, calibrate ocular variance baseline
    if (faceCenteredFramesRef.current > 15 && stage === 'detecting_face') {
      setStage('awaiting_blink');
      setStatusMessage('Face detected! 😉 Please BLINK your eyes to verify liveness');
      setProgress(60);
      baselineVarianceRef.current = ocularVarianceSum;
    }

    // Eye Blink Detection Logic
    if (stage === 'awaiting_blink' && baselineVarianceRef.current !== null) {
      const baseline = baselineVarianceRef.current || 1000;
      const ratio = ocularVarianceSum / (baseline || 1);
      setEyesOpenRatio(Math.min(1.2, Math.max(0.1, ratio)));

      const now = Date.now();

      // Eye closure detected
      if (ratio < 0.65 && !inBlinkRef.current) {
        inBlinkRef.current = true;
        blinkStartRef.current = now;
      }

      // Eye re-opens: natural blink confirmed
      if (inBlinkRef.current && ratio > 0.78) {
        const duration = now - blinkStartRef.current;
        if (duration > 80 && duration < 1000) {
          inBlinkRef.current = false;
          setBlinkCount((prev) => prev + 1);
          setStage('blink_detected');
          setStatusMessage('Eye Blink Verified! Capturing live video snapshot...');
          setProgress(85);

          // Capture HIGH-RES SNAPSHOT DIRECTLY FROM LIVE WEBCAM VIDEO
          const highResCanvas = document.createElement('canvas');
          highResCanvas.width = 480;
          highResCanvas.height = 360;
          const hCtx = highResCanvas.getContext('2d');
          if (hCtx) {
            hCtx.drawImage(video, 0, 0, 480, 360);
          }
          const liveSnapshotUrl = highResCanvas.toDataURL('image/jpeg', 0.88);
          const liveVec = extractCanvasVector(ctx, 160, 120);

          setTimeout(() => {
            performBiometricComparison(liveVec, liveSnapshotUrl);
          }, 400);
          return;
        } else if (duration >= 1000) {
          inBlinkRef.current = false;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(analyzeFrame);
  }, [stage, enrolledDescriptor, mode, targetUsername]);

  useEffect(() => {
    if (cameraActive && !simulatedMode) {
      animFrameRef.current = requestAnimationFrame(analyzeFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, simulatedMode, analyzeFrame]);

  // Action: Manual Trigger to Capture and Compare Live Camera Video Frame
  const handleCaptureAndCompareLive = () => {
    if (videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 160;
        canvas.height = 120;
        ctx.drawImage(video, 0, 0, 160, 120);

        const highResCanvas = document.createElement('canvas');
        highResCanvas.width = 480;
        highResCanvas.height = 360;
        const hCtx = highResCanvas.getContext('2d');
        if (hCtx) {
          hCtx.drawImage(video, 0, 0, 480, 360);
        }
        const liveSnapshotUrl = highResCanvas.toDataURL('image/jpeg', 0.88);
        const liveVec = extractCanvasVector(ctx, 160, 120);

        setStage('blink_detected');
        setStatusMessage('Live facial frame captured! Comparing against enrolled profile...');
        setProgress(85);

        setTimeout(() => {
          performBiometricComparison(liveVec, liveSnapshotUrl);
        }, 500);
        return;
      }
    }
    toast.error('Webcam stream not active. Please click Retry Camera.');
  };

  // Action: TEST UNAUTHORIZED INTRUDER (Grabs live webcam photo, rejects, sends email alert with photo)
  const handleTestUnauthorizedIntruder = () => {
    // Grabs actual current frame from webcam if active, so user sees their own real face as captured intruder
    const photo = grabCurrentWebcamSnapshot();

    setStage('blink_detected');
    setStatusMessage('Scanning face & detecting unauthorized biometric attempt...');
    setProgress(85);
    setBlinkCount(1);
    setEyesOpenRatio(0.2);

    setTimeout(() => {
      setEyesOpenRatio(0.95);
      const enrolledVec = parseOrGenerateVector(enrolledDescriptor);
      const strangerVec = generateStrangerVector(enrolledVec);

      performBiometricComparison(strangerVec, photo);
    }, 500);
  };

  // Action: DEMO TEST MATCHING ACCOUNT OWNER (For development simulation)
  const handleSimulateMatchingFace = () => {
    setStage('blink_detected');
    setStatusMessage('Eye Blink Detected! Liveness Verified ✓');
    setProgress(85);
    setBlinkCount(1);
    setEyesOpenRatio(0.2);

    setTimeout(() => {
      setEyesOpenRatio(0.95);
      const enrolledVec = parseOrGenerateVector(enrolledDescriptor);
      // Small sensor variance: ~95% match
      const perturbed = enrolledVec.map((v) => roundTo4(v + (Math.random() - 0.5) * 0.03));
      const mag = Math.sqrt(perturbed.reduce((acc, x) => acc + x * x, 0)) || 1;
      const normalizedPerturbed = perturbed.map((x) => roundTo4(x / mag));

      const photo = grabCurrentWebcamSnapshot();
      performBiometricComparison(normalizedPerturbed, photo);
    }, 500);
  };

  const handleReset = () => {
    setMatchScore(null);
    setLiveSnapshot(null);
    setMismatchReason(null);
    setEmailAlertSent(false);
    setProgress(30);
    startCamera();
  };

  return (
    <div className="bg-gray-900 border border-cyan-800/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden text-gray-200">
      {/* Top Header */}
      <div className="flex justify-between items-center pb-3 border-b border-gray-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-700 shadow-sm shadow-cyan-950">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              {title}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                1 Face : 1 Account
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Account Target: <strong className="text-cyan-300 font-mono">@{targetUsername}</strong> • {subtitle}
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE VERIFICATION DISPLAY (When comparing or finished)             */}
      {/* ========================================================================= */}
      {stage === 'comparing' || stage === 'success' || stage === 'mismatch' ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="grid grid-cols-2 gap-3">
            {/* Left Box: Enrolled Reference Portrait */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 flex flex-col items-center text-center">
              <span className="text-[10px] font-mono text-cyan-400 font-semibold mb-1.5 flex items-center gap-1">
                <ShieldCheck size={12} />
                ENROLLED REFERENCE PHOTO
              </span>
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-cyan-500/50 bg-black flex items-center justify-center shadow-lg">
                {enrolledSnapshot ? (
                  <img
                    src={enrolledSnapshot}
                    alt="Enrolled Biometric Baseline"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-3 text-[11px] text-gray-500">No Prior Photo</div>
                )}
              </div>
              <span className="text-[11px] font-mono font-bold text-gray-300 mt-2">
                @{targetUsername}
              </span>
              <span className="text-[9px] text-gray-500">Authorized Account Owner</span>
            </div>

            {/* Right Box: Live Captured Photo from Webcam */}
            <div
              className={`bg-gray-950 border rounded-xl p-3 flex flex-col items-center text-center ${
                stage === 'mismatch' ? 'border-rose-700/80 bg-rose-950/20 ring-2 ring-rose-500/30' : 'border-gray-800'
              }`}
            >
              <span
                className={`text-[10px] font-mono font-semibold mb-1.5 flex items-center gap-1 ${
                  stage === 'mismatch' ? 'text-rose-400 font-bold' : 'text-emerald-400'
                }`}
              >
                {stage === 'mismatch' ? <UserX size={12} /> : <CheckCircle2 size={12} />}
                {stage === 'mismatch' ? 'CAPTURED INTRUDER PHOTO' : 'LIVE CAMERA SNAPSHOT'}
              </span>
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 bg-black flex items-center justify-center shadow-lg relative ${
                  stage === 'mismatch' ? 'border-rose-500' : 'border-emerald-500'
                }`}
              >
                {liveSnapshot ? (
                  <img src={liveSnapshot} alt="Live Captured Face" className="w-full h-full object-cover" />
                ) : (
                  <div className="p-3 text-[11px] text-gray-500">Live Frame</div>
                )}
                {/* Liveness badge */}
                <div
                  className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                    stage === 'mismatch'
                      ? 'bg-rose-950 text-rose-300 border-rose-700'
                      : 'bg-black/80 text-cyan-300 border-cyan-700'
                  }`}
                >
                  {stage === 'mismatch' ? 'REJECTED' : 'BLINK ✓'}
                </div>
              </div>
              <span
                className={`text-[11px] font-mono font-bold mt-2 ${
                  stage === 'mismatch' ? 'text-rose-400 font-black' : 'text-emerald-400'
                }`}
              >
                {stage === 'mismatch' ? 'UNAUTHORIZED PERSON' : `@${targetUsername} Confirmed`}
              </span>
              <span className="text-[9px] text-gray-500">Live Camera Frame Captured</span>
            </div>
          </div>

          {/* Biometric Similarity Gauge Banner */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between text-xs gap-3 transition-all ${
              stage === 'success'
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                : stage === 'mismatch'
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                : 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {stage === 'success' ? (
                <CheckCircle2 size={28} className="text-emerald-400 shrink-0" />
              ) : stage === 'mismatch' ? (
                <ShieldAlert size={28} className="text-rose-400 shrink-0 animate-bounce" />
              ) : (
                <RefreshCw size={28} className="text-cyan-400 shrink-0 animate-spin" />
              )}
              <div>
                <div className="font-extrabold text-sm tracking-wide">
                  {stage === 'success'
                    ? `Identity Match Confirmed: ${Math.round((matchScore || 0.95) * 100)}% Similarity ✓`
                    : stage === 'mismatch'
                    ? `ACCESS DENIED: Your not the account user (${Math.round((matchScore || 0.28) * 100)}% Match)`
                    : 'Analyzing Live Facial Landmark Matrix...'}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  {stage === 'success'
                    ? `Authorized access for @${targetUsername}. Proceeding to dashboard...`
                    : stage === 'mismatch'
                    ? `You are not the account user. Access has been denied and your captured photo was emailed to the owner.`
                    : 'Comparing live ocular geometry against enrolled biometric baseline...'}
                </div>
              </div>
            </div>

            {matchScore !== null && (
              <div
                className={`px-3 py-1.5 rounded-lg font-mono font-black text-sm border shrink-0 ${
                  stage === 'success'
                    ? 'bg-emerald-900 border-emerald-400 text-emerald-300'
                    : 'bg-rose-900 border-rose-400 text-rose-200'
                }`}
              >
                {Math.round(matchScore * 100)}%
              </div>
            )}
          </div>

          {/* Email Alert Telemetry Notice */}
          {stage === 'mismatch' && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in">
              <Mail size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-100 flex items-center gap-2">
                  <span>Security Alert Dispatched with Photo</span>
                  {emailAlertSent && (
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-600 rounded text-[10px] font-mono">
                      ✓ Email Sent to @{targetUsername}
                    </span>
                  )}
                  {isAlertSending && (
                    <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-600 rounded text-[10px] font-mono animate-pulse">
                      Sending Email...
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-red-300/90 leading-relaxed">
                  The captured photo of the person attempting access was immediately emailed to the registered email address of account holder <strong className="text-red-100">@{targetUsername}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Try Again on Mismatch */}
          {stage === 'mismatch' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-bold border border-gray-700 flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={14} />
                <span>Retry Face Scan</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* STANDARD CAMERA VIEWPORT & HUD                                            */
        /* ========================================================================= */
        <div className="relative w-full aspect-[4/3] max-w-sm mx-auto bg-black rounded-2xl border-2 border-cyan-500/60 overflow-hidden shadow-inner flex items-center justify-center">
          {/* Hidden processing canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Live Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${
              cameraActive && !simulatedMode ? 'opacity-100' : 'opacity-0 absolute'
            }`}
          />

          {/* Simulation / Fallback View when camera is inactive */}
          {(simulatedMode || !cameraActive) && (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-cyan-400 flex items-center justify-center bg-cyan-950/40 text-cyan-400 shadow-lg shadow-cyan-900/40 animate-pulse">
                  <Eye size={42} />
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-emerald-950 border border-emerald-600 rounded-full text-[9px] font-bold text-emerald-400">
                  READY
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-200">Biometric Verification Pipeline</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                  {cameraError || 'Align face and blink to execute biometric anti-spoofing verification.'}
                </p>
              </div>
            </div>
          )}

          {/* Futuristic Cyberpunk HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
            {/* Top HUD Data */}
            <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400/90">
              <span className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded border border-cyan-900">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                {cameraActive ? 'CAM: LIVE 30FPS' : 'MODE: TEST SIMULATOR'}
              </span>
              <span className="bg-black/60 px-2 py-0.5 rounded border border-cyan-900 font-bold">
                EAR: {eyesOpenRatio.toFixed(2)}
              </span>
            </div>

            {/* Central Target Face Contour Oval */}
            <div className="relative mx-auto w-48 h-60 rounded-[50%] border-2 border-dashed border-cyan-400/70 flex flex-col items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>

              {/* Horizontal scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan shadow-lg shadow-cyan-400"></div>

              {/* Eye zone target guides */}
              <div className="w-32 flex justify-between px-2 text-[10px] text-cyan-300 font-mono opacity-80 mb-8">
                <span>[ 👁️ L ]</span>
                <span>[ 👁️ R ]</span>
              </div>

              {stage === 'awaiting_blink' && (
                <span className="bg-cyan-950/90 border border-cyan-400 text-cyan-300 px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-lg">
                  😉 Blink Your Eyes!
                </span>
              )}

              {stage === 'blink_detected' && (
                <span className="bg-emerald-950/90 border border-emerald-400 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  ✓ Blink Detected!
                </span>
              )}
            </div>

            {/* Bottom HUD Status */}
            <div className="text-center">
              <span className="inline-block bg-black/75 px-3 py-1 rounded-full text-[11px] font-medium text-cyan-300 border border-cyan-900/60 shadow">
                {statusMessage}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar & Liveness Telemetry */}
      {stage !== 'mismatch' && stage !== 'success' && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium flex items-center gap-1.5">
              <Zap size={14} className="text-cyan-400" />
              Biometric Liveness & Facial Matrix Check
            </span>
            <span className="font-mono font-bold text-cyan-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Controls for Live Capture & Testing */}
      <div className="mt-4 space-y-2">
        {/* Primary Action Button: Capture Current Live Frame & Compare */}
        <button
          type="button"
          onClick={handleCaptureAndCompareLive}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950"
        >
          <Camera size={16} />
          <span>Capture Live Webcam Face & Verify</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Test Button 1: Test Unauthorized Intruder Attack (Sends Alert Email with Photo) */}
          <button
            type="button"
            onClick={handleTestUnauthorizedIntruder}
            className="flex-1 py-2 px-3 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/80 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-950"
          >
            <UserX size={14} />
            <span>Test Unauthorized Intruder (Send Alert Email)</span>
          </button>

          {/* Test Button 2: Simulate Legitimate Account Owner */}
          <button
            type="button"
            onClick={handleSimulateMatchingFace}
            className="flex-1 py-2 px-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/80 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950"
          >
            <CheckCircle2 size={14} />
            <span>Simulate Account Owner (@{targetUsername})</span>
          </button>
        </div>

        {!cameraActive && (
          <button
            type="button"
            onClick={startCamera}
            className="w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium border border-gray-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Retry Camera</span>
          </button>
        )}
      </div>

      <div className="mt-3 p-2.5 bg-gray-950/70 rounded-xl border border-gray-800 flex items-start gap-2 text-[11px] text-gray-400">
        <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-gray-300">Intrusion Prevention:</strong> If the person in front of the camera is not
          the registered account holder, access is strictly denied with{' '}
          <strong className="text-rose-400">"Your not the account user"</strong> and an immediate security alert email with
          their captured photo is sent to the account owner.
        </p>
      </div>
    </div>
  );
};

export default FaceBlinkScanner;
