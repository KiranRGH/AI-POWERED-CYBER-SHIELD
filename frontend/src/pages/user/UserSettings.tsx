import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';
import { 
  Settings, Bell, Monitor, Eye, Save, Loader2, ShieldAlert
} from 'lucide-react';

export default function UserSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    notifications: {
      emailAlerts: true,
      criticalThreats: true,
      highThreats: true,
      weeklyReport: false
    },
    display: {
      theme: 'dark',
      itemsPerPage: '25'
    },
    privacy: {
      showIpInReports: true,
      shareAnonymousData: false
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      // Restore from local storage if available
      try {
        const saved = localStorage.getItem('user_settings_preferences');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(prev => ({
            notifications: { ...prev.notifications, ...parsed.notifications },
            display: { ...prev.display, ...parsed.display },
            privacy: { ...prev.privacy, ...parsed.privacy }
          }));
        }
      } catch {}

      try {
        const response = await apiClient.get('/settings/me');
        if (response.data && response.data.notifications) {
          setSettings(prev => ({
            notifications: { ...prev.notifications, ...response.data.notifications },
            display: { ...prev.display, ...response.data.display },
            privacy: { ...prev.privacy, ...response.data.privacy }
          }));
        }
      } catch (error) {
        // Keep current or saved settings
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('user_settings_preferences', JSON.stringify(settings));
      const res = await apiClient.patch('/settings/me', settings);
      if (res.data && res.data.notifications) {
        setSettings(prev => ({
          notifications: { ...prev.notifications, ...res.data.notifications },
          display: { ...prev.display, ...res.data.display },
          privacy: { ...prev.privacy, ...res.data.privacy }
        }));
      }
      toast.success('Preferences and settings saved successfully!');
    } catch (error) {
      toast.success('Preferences saved to local device successfully!');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (category: keyof typeof settings, key: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !(prev[category] as any)[key]
      }
    }));
  };

  const updateSetting = (category: keyof typeof settings, key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Settings className="text-cyan-400" size={24} />
            Preferences & Settings
          </h1>
          <p className="text-gray-400 text-sm mt-1">Configure your personal security preferences and interface options.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Notifications Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-700 pb-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-200">Email Alerts</p>
                  <p className="text-sm text-gray-400">Receive alerts via email</p>
                </div>
                <button 
                  onClick={() => toggleSetting('notifications', 'emailAlerts')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.notifications.emailAlerts ? 'bg-cyan-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notifications.emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-200 flex items-center gap-1">Critical Threats <ShieldAlert className="h-3 w-3 text-rose-500"/></p>
                  <p className="text-sm text-gray-400">Immediate alerts for CRITICAL severity</p>
                </div>
                <button 
                  onClick={() => toggleSetting('notifications', 'criticalThreats')}
                  disabled={!settings.notifications.emailAlerts}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!settings.notifications.emailAlerts ? 'opacity-50 cursor-not-allowed' : ''} ${settings.notifications.criticalThreats && settings.notifications.emailAlerts ? 'bg-cyan-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notifications.criticalThreats && settings.notifications.emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-200">High Threats</p>
                  <p className="text-sm text-gray-400">Alerts for HIGH severity events</p>
                </div>
                <button 
                  onClick={() => toggleSetting('notifications', 'highThreats')}
                  disabled={!settings.notifications.emailAlerts}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!settings.notifications.emailAlerts ? 'opacity-50 cursor-not-allowed' : ''} ${settings.notifications.highThreats && settings.notifications.emailAlerts ? 'bg-cyan-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notifications.highThreats && settings.notifications.emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-200">Weekly Security Report</p>
                  <p className="text-sm text-gray-400">Digest of events every Monday</p>
                </div>
                <button 
                  onClick={() => toggleSetting('notifications', 'weeklyReport')}
                  disabled={!settings.notifications.emailAlerts}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!settings.notifications.emailAlerts ? 'opacity-50 cursor-not-allowed' : ''} ${settings.notifications.weeklyReport && settings.notifications.emailAlerts ? 'bg-cyan-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notifications.weeklyReport && settings.notifications.emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Display Preferences */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-700 pb-3">
                <Monitor className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Display Preferences</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                  <select 
                    value={settings.display.theme}
                    onChange={(e) => updateSetting('display', 'theme', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  >
                    <option value="dark">Dark Theme (Default)</option>
                    <option value="system">System Default</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Items Per Page</label>
                  <select 
                    value={settings.display.itemsPerPage}
                    onChange={(e) => updateSetting('display', 'itemsPerPage', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  >
                    <option value="10">10 items</option>
                    <option value="25">25 items</option>
                    <option value="50">50 items</option>
                    <option value="100">100 items</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy Section */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-700 pb-3">
                <Eye className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Privacy</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">Show IP in Exported Reports</p>
                    <p className="text-sm text-gray-400">Include full IP addresses in PDF/CSV exports</p>
                  </div>
                  <button 
                    onClick={() => toggleSetting('privacy', 'showIpInReports')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.privacy.showIpInReports ? 'bg-cyan-500' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.privacy.showIpInReports ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">Share Anonymous Telemetry</p>
                    <p className="text-sm text-gray-400">Help improve the platform with basic usage data</p>
                  </div>
                  <button 
                    onClick={() => toggleSetting('privacy', 'shareAnonymousData')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.privacy.shareAnonymousData ? 'bg-cyan-500' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.privacy.shareAnonymousData ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
    </div>
  );
}
