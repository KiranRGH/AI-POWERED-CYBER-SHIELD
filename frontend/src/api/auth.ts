import apiClient from './axios';

export interface LoginCredentials {
  login: string;   // email or username
  password?: string;
  auth_mode?: 'PASSWORD' | 'FACE' | 'FINGERPRINT' | 'MULTI_FACTOR';
  face_data?: string;
  face_snapshot?: string;
  face_similarity?: number;
  liveness_blink_verified?: boolean;
  fingerprint_credential_id?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  study_duration?: string;
  semester?: number;
  face_data?: string;
  face_snapshot?: string;
  face_registered?: boolean;
  liveness_blink_verified?: boolean;
  fingerprint_credential_id?: string;
  fingerprint_registered?: boolean;
}

export interface BiometricStatus {
  username: string;
  full_name?: string;
  face_registered: boolean;
  face_snapshot?: string | null;
  face_descriptor?: string | null;
  fingerprint_registered: boolean;
  fingerprint_credential_id?: string | null;
  has_password: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface VerifyEmailData {
  email: string;
  otp: string;
}

export const authApi = {
  register: async (data: RegisterData) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailData) => {
    const response = await apiClient.post('/auth/verify-email', data);
    return response.data;
  },

  resendOTP: async (email: string) => {
    const response = await apiClient.post('/auth/resend-otp', { email });
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  getBiometricStatus: async (identifier: string): Promise<BiometricStatus> => {
    const response = await apiClient.get('/auth/biometric-status', {
      params: { identifier }
    });
    return response.data;
  },

  refreshToken: async (): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (data: { token: string; new_password: string }) => {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },
};
