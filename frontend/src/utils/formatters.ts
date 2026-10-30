/**
 * Utility functions for formatting dates, numbers, severity, etc.
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns';

// ─── Date formatters ─────────────────────────────────────────

export const formatDate = (dateStr: string | null | undefined, fmt = 'MMM d, yyyy'): string => {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), fmt); }
  catch { return dateStr; }
};

export const formatDateTime = (dateStr: string | null | undefined): string => {
  return formatDate(dateStr, 'MMM d, yyyy HH:mm:ss');
};

export const formatTimeAgo = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); }
  catch { return dateStr; }
};

// ─── Number formatters ───────────────────────────────────────

export const formatNumber = (n: number | null | undefined): string => {
  if (n == null) return '—';
  return new Intl.NumberFormat().format(n);
};

export const formatPercent = (n: number | null | undefined, decimals = 1): string => {
  if (n == null) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
};

export const formatScore = (n: number | null | undefined, decimals = 2): string => {
  if (n == null) return '—';
  return n.toFixed(decimals);
};

// ─── Severity formatters ─────────────────────────────────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: 'text-red-400 bg-red-900/30 border-red-700',
  HIGH: 'text-orange-400 bg-orange-900/30 border-orange-700',
  MEDIUM: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  LOW: 'text-blue-400 bg-blue-900/30 border-blue-700',
  INFO: 'text-gray-400 bg-gray-700/30 border-gray-600',
};

export const SEVERITY_DOT_COLORS: Record<Severity, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-gray-500',
};

export const getSeverityColor = (severity: string): string => {
  return SEVERITY_COLORS[(severity?.toUpperCase() as Severity)] ?? SEVERITY_COLORS.INFO;
};

export const getSeverityDot = (severity: string): string => {
  return SEVERITY_DOT_COLORS[(severity?.toUpperCase() as Severity)] ?? SEVERITY_DOT_COLORS.INFO;
};

// ─── Role formatters ─────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  analyst: 'Security Analyst',
  user: 'User',
};

export const getRoleLabel = (role: string): string => ROLE_LABELS[role] ?? role;

export const ROLE_COLORS: Record<string, string> = {
  superadmin: 'text-purple-400 bg-purple-900/30 border-purple-700',
  admin: 'text-cyan-400 bg-cyan-900/30 border-cyan-700',
  analyst: 'text-blue-400 bg-blue-900/30 border-blue-700',
  user: 'text-gray-400 bg-gray-700/30 border-gray-600',
};

export const getRoleColor = (role: string): string => ROLE_COLORS[role] ?? ROLE_COLORS.user;

// ─── Status formatters ───────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  OPEN: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  IN_PROGRESS: 'text-blue-400 bg-blue-900/30 border-blue-700',
  INVESTIGATING: 'text-blue-400 bg-blue-900/30 border-blue-700',
  RESOLVED: 'text-green-400 bg-green-900/30 border-green-700',
  CLOSED: 'text-green-400 bg-green-900/30 border-green-700',
  FALSE_POSITIVE: 'text-gray-400 bg-gray-700/30 border-gray-600',
  ESCALATED: 'text-red-400 bg-red-900/30 border-red-700',
  ACTIVE: 'text-green-400 bg-green-900/30 border-green-700',
  INACTIVE: 'text-gray-400 bg-gray-700/30 border-gray-600',
  BLOCKED: 'text-red-400 bg-red-900/30 border-red-700',
  APPROVED: 'text-green-400 bg-green-900/30 border-green-700',
  REJECTED: 'text-red-400 bg-red-900/30 border-red-700',
  SIMULATED: 'text-purple-400 bg-purple-900/30 border-purple-700',
};

export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status?.toUpperCase()] ?? STATUS_COLORS.PENDING;
};

// ─── IP formatters ───────────────────────────────────────────

export const maskIp = (ip: string): string => {
  // Mask last octet for privacy in user-facing views
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  return ip;
};

// ─── File size formatter ─────────────────────────────────────

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// ─── Confidence formatter ────────────────────────────────────

export const formatConfidence = (score: number): string => {
  const pct = Math.round(score * 100);
  if (pct >= 90) return `${pct}% (High)`;
  if (pct >= 70) return `${pct}% (Medium)`;
  if (pct >= 50) return `${pct}% (Low)`;
  return `${pct}% (Very Low)`;
};
