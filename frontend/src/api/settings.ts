import apiClient from './axios';

export interface AppSettings {
  simulation_mode: boolean;
  auto_defense_enabled: boolean;
  max_login_attempts: number;
  account_lockout_minutes: number;
  otp_expire_minutes: number;
  otp_resend_cooldown_seconds: number;
  alert_email_enabled: boolean;
  alert_email_threshold: string;
}

export interface UserSettings {
  email_alerts_enabled: boolean;
  alert_severity_threshold: string;
  notifications_enabled: boolean;
  items_per_page: number;
  show_ip_in_reports: boolean;
  timezone: string;
}

export const settingsApi = {
  getAppSettings: async (): Promise<AppSettings> => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  updateAppSettings: async (data: Partial<AppSettings>): Promise<AppSettings> => {
    const response = await apiClient.patch('/admin/settings', data);
    return response.data;
  },

  getUserSettings: async (): Promise<UserSettings> => {
    const response = await apiClient.get('/settings/me');
    return response.data;
  },

  updateUserSettings: async (data: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await apiClient.patch('/settings/me', data);
    return response.data;
  },
};

export default settingsApi;
