import apiClient from './axios';
import { User } from '../contexts/AuthContext';

export interface UsersListParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: string;
  status?: string;
  is_verified?: boolean;
}

export interface UsersListResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}

export interface UpdateUserData {
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export interface UpdateMeData {
  full_name?: string;
  username?: string;
}

export const usersApi = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  updateMe: async (data: UpdateMeData): Promise<User> => {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
  },

  uploadProfilePhoto: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post('/users/me/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  changePassword: async (data: { current_password: string; new_password: string }) => {
    const response = await apiClient.post('/users/me/change-password', data);
    return response.data;
  },

  // ── Admin endpoints ──
  getUsers: async (params?: UsersListParams): Promise<UsersListResponse> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  getRegistrations: async (params?: UsersListParams): Promise<UsersListResponse> => {
    const response = await apiClient.get('/admin/registrations', { params });
    return response.data;
  },

  getUser: async (userId: number): Promise<User> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: number, data: UpdateUserData): Promise<User> => {
    const response = await apiClient.patch(`/admin/users/${userId}`, data);
    return response.data;
  },

  revokeUserSessions: async (userId: number) => {
    const response = await apiClient.post(`/admin/users/${userId}/revoke-sessions`);
    return response.data;
  },

  deleteUser: async (userId: number) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  resetUserPassword: async (userId: number) => {
    const response = await apiClient.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  },
};
