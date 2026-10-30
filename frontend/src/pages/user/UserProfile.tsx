import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { 
  User, Mail, Shield, Calendar, Key, Upload, Camera, Loader2, Save, CheckCircle, Clock
} from 'lucide-react';

export default function UserProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    email: '',
    role: '',
    created_at: '',
    last_login: '',
    photo_url: '',
    study_duration: '2021 - 2025',
    semester: 6
  });

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const { user, refreshUser } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/users/me');
        if (response.data) {
          setProfile({
            full_name: response.data.full_name || '',
            username: response.data.username || '',
            email: response.data.email || '',
            role: response.data.role || '',
            created_at: response.data.created_at || '',
            last_login: response.data.last_login || '',
            photo_url: response.data.profile_photo || '',
            study_duration: response.data.study_duration || '2021 - 2025',
            semester: response.data.semester || 6
          });
        }
      } catch {
        if (user) {
          setProfile({
            full_name: user.full_name || 'Student User',
            username: user.username || 'user',
            email: user.email || 'user@cbit.ac.in',
            role: user.role || 'USER',
            created_at: user.created_at || new Date().toISOString(),
            last_login: user.last_login || new Date().toISOString(),
            photo_url: user.profile_photo || '',
            study_duration: (user as any).study_duration || '2021 - 2025',
            semester: (user as any).semester || 6
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiClient.patch('/users/me', {
        full_name: profile.full_name.trim(),
        username: profile.username.trim(),
        study_duration: profile.study_duration,
        semester: Number(profile.semester)
      });
      if (res.data) {
        setProfile(prev => ({
          ...prev,
          full_name: res.data.full_name || prev.full_name,
          username: res.data.username || prev.username,
          study_duration: res.data.study_duration || prev.study_duration,
          semester: res.data.semester || prev.semester
        }));
      }
      try {
        if (refreshUser) {
          await refreshUser();
        }
      } catch {
        const cached = localStorage.getItem('auth_user');
        if (cached) {
          const u = JSON.parse(cached);
          u.full_name = profile.full_name;
          u.username = profile.username;
          u.study_duration = profile.study_duration;
          u.semester = profile.semester;
          localStorage.setItem('auth_user', JSON.stringify(u));
        }
      }
      toast.success('Profile changes saved successfully!');
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Failed to update profile';
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.post('/users/me/change-password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      toast.success('Password changed successfully!');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Failed to change password. Check your current password.';
      toast.error(detail);
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      toast.loading('Uploading photo...');
      const response = await apiClient.post('/users/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(p => ({ ...p, photo_url: response.data.photo_url || URL.createObjectURL(file) }));
      toast.dismiss();
      toast.success('Profile photo updated');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to upload photo');
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length > 8) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 25;
    if (pass.match(/[0-9]/)) strength += 25;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };
  const strength = getPasswordStrength(passwords.new_password);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <User className="text-cyan-400" size={24} />
          My Profile & Account
        </h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account information and login password.</p>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Photo & Read-only Info */}
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
              <div className="relative inline-block mb-4">
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-gray-700 bg-gray-900 flex items-center justify-center">
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-gray-500" />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-2 bg-cyan-600 rounded-full hover:bg-cyan-500 transition-colors shadow-lg border-2 border-gray-800"
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              </div>
              <h3 className="text-xl font-bold text-white">{profile.full_name || profile.username}</h3>
              <p className="text-cyan-500 font-medium text-sm mt-1">{profile.role}</p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4">Account Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span>Role: {profile.role}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Duration: {profile.study_duration || '2021 - 2025'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Semester: Semester {profile.semester || 6}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>Last login {new Date(profile.last_login).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="md:col-span-2 space-y-6">
            
            <form onSubmit={handleProfileSave} className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Edit Profile</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.full_name}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">Username</label>
                  <input 
                    type="text" 
                    value={profile.username}
                    onChange={(e) => setProfile({...profile, username: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">Semester</label>
                  <select 
                    value={profile.semester}
                    onChange={(e) => setProfile({...profile, semester: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">Study Duration</label>
                  <select 
                    value={profile.study_duration}
                    onChange={(e) => setProfile({...profile, study_duration: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all font-mono"
                  >
                    <option value="2021 - 2025">2021 - 2025</option>
                    <option value="2022 - 2026">2022 - 2026</option>
                    <option value="2023 - 2027">2023 - 2027</option>
                    <option value="2024 - 2028">2024 - 2028</option>
                    <option value="2025 - 2029">2025 - 2029</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </form>

            <form onSubmit={handlePasswordChange} className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
                <Key className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Change Password</h3>
              </div>
              
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">Current Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.current_password}
                    onChange={(e) => setPasswords({...passwords, current_password: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">New Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({...passwords, new_password: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  />
                  
                  {/* Strength indicator */}
                  {passwords.new_password && (
                    <div className="mt-2">
                      <div className="flex gap-1 h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full ${strength > 0 ? 'bg-rose-500' : 'bg-transparent'}`} style={{width: '25%'}}></div>
                        <div className={`h-full ${strength > 25 ? 'bg-amber-500' : 'bg-transparent'}`} style={{width: '25%'}}></div>
                        <div className={`h-full ${strength > 50 ? 'bg-blue-500' : 'bg-transparent'}`} style={{width: '25%'}}></div>
                        <div className={`h-full ${strength > 75 ? 'bg-emerald-500' : 'bg-transparent'}`} style={{width: '25%'}}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {strength <= 25 && 'Weak'}
                        {strength === 50 && 'Fair'}
                        {strength === 75 && 'Good'}
                        {strength === 100 && 'Strong'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">Confirm New Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-700">
                <button 
                  type="submit" 
                  disabled={savingPassword || !passwords.new_password}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mt-4"
                >
                  {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Update Password
                </button>
              </div>
            </form>

          </div>
        </div>
    </div>
  );
}
