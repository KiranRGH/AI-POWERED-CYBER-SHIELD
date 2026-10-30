import { 
  LayoutDashboard, GraduationCap, Database, ShieldAlert, 
  Users, UserPlus, Activity, Shield, Map, BarChart3, 
  Bell, LifeBuoy, ClipboardList, Lock, User, Settings 
} from 'lucide-react';

export interface NavItemConfig {
  path: string;
  icon: any;
  label: string;
  roles?: string[];
}

export const getNavItemsForRole = (userRole?: string): NavItemConfig[] => {
  const role = (userRole || 'USER').toUpperCase();
  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';
  const isAnalyst = role === 'ANALYST';
  const isStaff = isSuperAdmin || isAdmin || isAnalyst;

  const items: NavItemConfig[] = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/attendance', icon: GraduationCap, label: 'Student Attendance' },
    { path: '/cyber-crimes', icon: Database, label: 'Threat Records' },
    { path: '/threat-analysis', icon: ShieldAlert, label: 'Security Events' },
  ];

  // User Management & Registered Users for Superadmin & Admin
  if (isSuperAdmin || isAdmin) {
    items.push({ path: '/admin/users', icon: Users, label: 'User Management' });
    items.push({ path: '/admin/registrations', icon: UserPlus, label: 'Registered Users' });
  }

  // Threat Monitoring & Firewall Defense for Superadmin, Admin, Analyst
  if (isStaff) {
    items.push({ path: '/admin/threats', icon: Activity, label: 'Threat Monitoring' });
    items.push({ path: '/admin/firewall', icon: Shield, label: 'Firewall Defense' });
    items.push({ path: '/admin/geo-map', icon: Map, label: 'Geo Map' });
    items.push({ path: '/admin/analytics', icon: BarChart3, label: 'Analytics' });
  } else {
    items.push({ path: '/geo-map', icon: Map, label: 'Geo Map' });
    items.push({ path: '/analytics', icon: BarChart3, label: 'Analytics' });
  }

  // Notifications for all
  items.push({ path: '/notifications', icon: Bell, label: 'Notifications' });

  // Alert Policies for Superadmin & Admin
  if (isSuperAdmin || isAdmin) {
    items.push({ path: '/admin/alerts', icon: Bell, label: 'Alert Policies' });
  }

  // Help & Support: Admins & Analysts get Admin Help Support Desk, standard users get User Help Support
  if (isStaff) {
    items.push({ path: '/admin/support', icon: LifeBuoy, label: 'Help & Support' });
  } else {
    items.push({ path: '/help-support', icon: LifeBuoy, label: 'Help & Support' });
  }

  // Audit Logs for Superadmin & Admin
  if (isSuperAdmin || isAdmin) {
    items.push({ path: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' });
  }

  // Standard Account & Profile Items for all
  items.push(
    { path: '/login-security', icon: Lock, label: 'Account Security' },
    { path: '/profile', icon: User, label: 'My Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  );

  return items;
};
