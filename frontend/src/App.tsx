import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import { Toaster } from 'sonner';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';

// ─── Auth Pages ──────────────────────────────────────────────
import LoginPage from './pages/auth/LoginPage';
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// ─── Admin Pages ──────────────────────────────────────────────
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const RegisteredUsers = lazy(() => import('./pages/admin/RegisteredUsers'));
const ThreatMonitoring = lazy(() => import('./pages/admin/ThreatMonitoring'));
const FirewallDefense = lazy(() => import('./pages/admin/FirewallDefense'));
const AdminGeoMap = lazy(() => import('./pages/admin/AdminGeoMap'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AlertManagement = lazy(() => import('./pages/admin/AlertManagement'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'));
const AdminHelpSupport = lazy(() => import('./pages/admin/AdminHelpSupport'));
const AdminSecurity = lazy(() => import('./pages/admin/AdminSecurity'));
const SystemHealth = lazy(() => import('./pages/admin/SystemHealth'));

// ─── User Pages ───────────────────────────────────────────────
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const ThreatAnalysis = lazy(() => import('./pages/user/ThreatAnalysis'));
const UserGeoMap = lazy(() => import('./pages/user/UserGeoMap'));
const UserAnalytics = lazy(() => import('./pages/user/UserAnalytics'));
const BlockedIPs = lazy(() => import('./pages/user/BlockedIPs'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const UserSettings = lazy(() => import('./pages/user/UserSettings'));
const Notifications = lazy(() => import('./pages/user/Notifications'));
const LoginSecurity = lazy(() => import('./pages/user/LoginSecurity'));
const HelpSupport = lazy(() => import('./pages/user/HelpSupport'));

// ─── Shared Pages ─────────────────────────────────────────────
const UnauthorizedPage = lazy(() => import('./pages/shared/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/shared/NotFoundPage'));
const StudentAttendance = lazy(() => import('./pages/shared/StudentAttendance'));
const CyberCrimeDataset = lazy(() => import('./pages/shared/CyberCrimeDataset'));

// ─── Loader ───────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-cyan-400 text-sm font-medium">Loading...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: '#1f2937',
              border: '1px solid #374151',
              color: '#f3f4f6',
            },
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Root redirect ─────────────────────────────────── */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ── Public routes ─────────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* ── Admin routes ──────────────────────────────────── */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={['superadmin', 'admin', 'analyst']}
                  redirectTo="/unauthorized"
                />
              }
            >
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="registrations" element={<RegisteredUsers />} />
                <Route path="threats" element={<ThreatMonitoring />} />
                <Route path="firewall" element={<FirewallDefense />} />
                <Route path="geo-map" element={<AdminGeoMap />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="alerts" element={<AlertManagement />} />
                <Route path="support" element={<AdminHelpSupport />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="system-settings" element={<SystemSettings />} />
                <Route path="security" element={<AdminSecurity />} />
                <Route path="system-health" element={<SystemHealth />} />
                <Route path="attendance" element={<StudentAttendance />} />
                <Route path="cyber-crimes" element={<CyberCrimeDataset />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>

            {/* ── User routes ───────────────────────────────────── */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={['user', 'admin', 'superadmin', 'analyst']}
                  redirectTo="/login"
                />
              }
            >
              <Route element={<UserLayout />}>
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/threat-analysis" element={<ThreatAnalysis />} />
                <Route path="/geo-map" element={<UserGeoMap />} />
                <Route path="/analytics" element={<UserAnalytics />} />
                <Route path="/blocked-ips" element={<BlockedIPs />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/settings" element={<UserSettings />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/login-security" element={<LoginSecurity />} />
                <Route path="/help-support" element={<HelpSupport />} />
                <Route path="/attendance" element={<StudentAttendance />} />
                <Route path="/cyber-crimes" element={<CyberCrimeDataset />} />
              </Route>
            </Route>

            {/* ── 404 catch-all ─────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
