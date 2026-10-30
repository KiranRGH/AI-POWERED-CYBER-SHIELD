import apiClient from './axios';

export interface Student {
  id: number;
  roll_number: string;
  full_name: string;
  college_code: string;
  college_name: string;
  year: number;
  branch: string;
  semester: number;
  study_duration?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  attendance_count?: number;
  attendance_percentage?: number;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  roll_number: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  subject: string;
  semester: number;
  is_tampered: boolean;
  original_status?: string;
  created_at: string;
}

export interface StudentDetailResponse {
  student: Student;
  stats: {
    total_classes: number;
    present: number;
    absent: number;
    late: number;
    attendance_percentage: number;
    threats_blocked_count: number;
  };
  attendance_history: AttendanceRecord[];
  cyber_crime_alerts: Array<{
    incident_id: string;
    attack_type: string;
    source_ip: string;
    severity: string;
    defense_action_taken: string;
    timestamp: string;
    payload_details: string;
  }>;
}

export interface CyberCrimeIncident {
  id: number;
  incident_id: string;
  target_type: string;
  target_identifier: string;
  attack_type: string;
  source_ip: string;
  source_location: string;
  user_agent: string;
  payload_details: string;
  severity: string;
  risk_score: number;
  defense_action_taken: string;
  is_blocked: boolean;
  timestamp: string;
  investigation_status: string;
}

export const studentsAttendanceApi = {
  getStudents: async (params?: { branch?: string; year?: number; search?: string }): Promise<Student[]> => {
    const res = await apiClient.get('/students', { params });
    return res.data;
  },

  searchStudents: async (q: string) => {
    const res = await apiClient.get('/students/search', { params: { q } });
    return res.data;
  },

  getStudentDetails: async (rollNumber: string): Promise<StudentDetailResponse> => {
    const res = await apiClient.get(`/students/${encodeURIComponent(rollNumber)}`);
    return res.data;
  },

  createStudent: async (data: {
    roll_number: string;
    full_name: string;
    college_code?: string;
    year?: number;
    branch?: string;
    semester?: number;
    study_duration?: string;
    email?: string;
    phone?: string;
  }): Promise<Student> => {
    const res = await apiClient.post('/students', data);
    return res.data;
  },

  markAttendance: async (
    rollNumber: string,
    data: { status: string; subject?: string; semester?: number }
  ): Promise<AttendanceRecord> => {
    const res = await apiClient.post(`/students/${encodeURIComponent(rollNumber)}/attendance`, data);
    return res.data;
  },

  simulateTamper: async (data: {
    roll_number: string;
    attack_type: string;
    fake_attacker_ip?: string;
    tampered_status?: string;
    malicious_payload?: string;
  }) => {
    const res = await apiClient.post('/students/tamper-simulate', data);
    return res.data;
  },

  getCyberCrimes: async (params?: { attack_type?: string; severity?: string; target_identifier?: string }): Promise<CyberCrimeIncident[]> => {
    const res = await apiClient.get('/cyber-crimes', { params });
    return res.data;
  },

  getCyberCrimeStats: async () => {
    const res = await apiClient.get('/cyber-crimes/stats');
    return res.data;
  },

  getExportCsvUrl: () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
    return `${baseUrl}/api/v1/cyber-crimes/export/csv`;
  }
};
