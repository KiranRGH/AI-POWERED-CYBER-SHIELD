import apiClient from './axios';

export interface Role {
  id: number;
  name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
  permissions: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export const rolesApi = {
  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get('/roles');
    return response.data;
  },

  getRole: async (id: number): Promise<Role> => {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data;
  },

  createRole: async (data: { name: string; description: string; permission_ids?: number[] }): Promise<Role> => {
    const response = await apiClient.post('/roles', data);
    return response.data;
  },

  updateRole: async (id: number, data: { name?: string; description?: string; permission_ids?: number[] }): Promise<Role> => {
    const response = await apiClient.patch(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: number): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },

  getPermissions: async (): Promise<Permission[]> => {
    const response = await apiClient.get('/permissions');
    return response.data;
  },

  assignUserRole: async (userId: number, roleId: number): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/role`, { role_id: roleId });
  },
};

export default rolesApi;
