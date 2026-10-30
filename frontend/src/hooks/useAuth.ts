import { useAuthContext } from '../contexts/AuthContext';

/**
 * Convenience hook to consume AuthContext.
 * Use in all components:
 *   const { user, isAuthenticated, login, logout, hasRole, hasPermission } = useAuth();
 */
export const useAuth = useAuthContext;
export default useAuth;
