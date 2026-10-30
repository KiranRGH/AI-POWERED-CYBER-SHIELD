import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  requiredPermissions?: string[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles = [],
  requiredPermissions = [],
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-cyan-400 text-sm font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Case-insensitive Role check
  if (allowedRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    if (!normalizedAllowed.includes(userRole)) {
      // If a standard user was directed to an admin route, send them to user dashboard
      if (userRole === 'user') {
        return <Navigate to="/dashboard" replace />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Permission check (if specified)
  if (requiredPermissions.length > 0 && user.permissions) {
    const hasAll = requiredPermissions.every((p) => user.permissions?.includes(p));
    if (!hasAll) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
