import apiClient from './axios';

export interface Notification {
  id: number;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  is_read: boolean;
  notification_type: string;
  created_at: string;
  threat_id?: number;
}

export interface NotificationsParams {
  page?: number;
  page_size?: number;
  is_read?: boolean;
}

export const notificationsApi = {
  getNotifications: async (params?: NotificationsParams): Promise<{ items: Notification[]; total: number; unread_count: number }> => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  },

  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};

export default notificationsApi;
