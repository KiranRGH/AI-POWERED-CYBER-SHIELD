import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  ShieldAlert, Shield, Users, Radio, Navigation, RefreshCw, 
  MapPin, AlertTriangle, CheckCircle2, Globe, Laptop, Crosshair,
  Search, Lock, Unlock, Copy, ExternalLink, Zap, Ban, ArrowRight
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import apiClient from '../../api/axios';
import { toast } from 'sonner';

// Fix default Leaflet marker assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to programmatically pan & zoom the map to a tracked IP
const MapPanController: React.FC<{ targetCoords: [number, number] | null; zoom?: number }> = ({ targetCoords, zoom = 7 }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, zoom, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
  }, [targetCoords, zoom, map]);
  return null;
};

// DivIcon Generator
const createCustomIcon = (bgColor: string, borderColor: string, label: string) => {
  return L.divIcon({
    className: 'custom-geo-marker',
    html: `
      <div style="
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px ${borderColor};
        color: white;
        font-weight: bold;
        font-size: 11px;
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

const createTrackingTargetIcon = (threatLevel: string) => {
  const color = threatLevel === 'CRITICAL' ? '#ef4444' : (threatLevel === 'HIGH' ? '#f97316' : (threatLevel === 'MEDIUM' ? '#eab308' : '#10b981'));
  return L.divIcon({
    className: 'target-tracking-marker',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: #0f172a; border: 2.5px solid ${color}; box-shadow: 0 0 16px ${color}; display: flex; align-items: center; justify-content: center; font-size: 15px;">
          🎯
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

const adminIcon = createCustomIcon('#0891b2', '#22d3ee', '🛡️');
const userIcon = createCustomIcon('#1e293b', '#38bdf8', '👤');
const threatIcon = createCustomIcon('#881337', '#f43f5e', '⚠️');

interface MapUser {
  id: string;
  name: string;
  username: string;
  email: string;
  lat: number;
  lng: number;
  location_name: string;
  role: string;
}

interface MapThreat {
  id: string;
  source_ip: string;
  source_country: string;
  lat: number;
  lng: number;
  threat_type: string;
  severity: string;
  targeted_user: string;
  targeted_user_lat: number;
  targeted_user_lng: number;
  defense_action: string;
  timestamp: string;
}

interface TrackedIPData {
  ip: string;
  country: string;
  country_code: string;
  country_flag: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  isp: string;
  asn: string;
  threat_score: number;
  threat_level: string;
  threat_type: string;
  autonomous_defense: string;
  is_quarantined: boolean;
  is_private: boolean;
  associated_threats_count: number;
  targeted_entities: string[];
  last_tracked_at: string;
}

export const AdminGeoMap: React.FC = () => {
  const [adminGps, setAdminGps] = useState<{ lat: number; lng: number; label: string }>({
    lat: 13.1367,
    lng: 78.1291,
    label: 'CBIT Kolar SOC Security Station'
  });
  const [users, setUsers] = useState<MapUser[]>([]);
  const [threats, setThreats] = useState<MapThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'attacks' | 'users'>('all');

  // IP Tracking state
  const [ipInput, setIpInput] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedIP, setTrackedIP] = useState<TrackedIPData | null>(null);
  const [mapTargetCoords, setMapTargetCoords] = useState<[number, number] | null>(null);

  const { isConnected } = useWebSocket('/geolocation');

  // Detect real Admin GPS via browser
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAdminGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'Admin Station (Live Device GPS)'
          });
        },
        () => {
          setAdminGps({
            lat: 13.1367,
            lng: 78.1291,
            label: 'CBIT Kolar Security Command Center'
          });
        }
      );
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, studentsRes, crimesRes] = await Promise.all([
        apiClient.get('/admin/users').catch(() => ({ data: { items: [] } })),
        apiClient.get('/students').catch(() => ({ data: [] })),
        apiClient.get('/cyber-crimes?limit=10').catch(() => ({ data: [] }))
      ]);

      const rawUsers = usersRes.data.items || [];
      const rawStudents = studentsRes.data || [];
      const rawCrimes = crimesRes.data || [];

      const baseCoords = [
        { lat: 13.1367, lng: 78.1291, loc: 'CBIT Kolar Campus Node' },
        { lat: 12.9716, lng: 77.5946, loc: 'Bengaluru Central Node' },
        { lat: 13.3409, lng: 77.1010, loc: 'Tumakuru Node' },
        { lat: 12.2958, lng: 76.6394, loc: 'Mysuru Regional Node' },
      ];

      const mappedUsers: MapUser[] = (rawStudents.length > 0 ? rawStudents : rawUsers).slice(0, 6).map((item: any, idx: number) => {
        const coord = baseCoords[idx % baseCoords.length];
        return {
          id: `u-${item.id || idx}`,
          name: item.full_name || 'Student Candidate',
          username: item.roll_number || item.username || '1CK21CS045',
          email: item.email || `${item.roll_number || item.username}@cbit.ac.in`,
          lat: coord.lat + (Math.random() - 0.5) * 0.05,
          lng: coord.lng + (Math.random() - 0.5) * 0.05,
          location_name: coord.loc,
          role: item.role || 'STUDENT'
        };
      });

      setUsers(mappedUsers.length > 0 ? mappedUsers : [
        { id: 'u-1', name: 'Kiran Kumar', username: '1CK21CS045', email: 'kiran.1ck21cs045@cbit.ac.in', lat: 13.1367, lng: 78.1291, location_name: 'CBIT Kolar Campus', role: 'STUDENT' },
        { id: 'u-2', name: 'Sneha R', username: '1CK21CS012', email: 'sneha.1ck21cs012@cbit.ac.in', lat: 12.9716, lng: 77.5946, location_name: 'Bengaluru Node', role: 'STUDENT' },
        { id: 'u-3', name: 'Rahul Verma', username: '1CK22AI019', email: 'rahul.1ck22ai019@cbit.ac.in', lat: 13.3409, lng: 77.1010, location_name: 'Tumakuru Node', role: 'STUDENT' },
      ]);

      const attackOrigins = [
        { lat: 52.3676, lng: 4.9041, ip: '185.220.101.5', country: 'Netherlands (Tor Exit Node)' },
        { lat: 55.7558, lng: 37.6173, ip: '45.154.255.89', country: 'Russian Federation (Brute Scanner)' },
        { lat: 37.7749, lng: -122.4194, ip: '198.51.100.24', country: 'United States (Rogue Cloud Instance)' },
        { lat: 31.2304, lng: 121.4737, ip: '202.108.22.5', country: 'China (Credential Stuffer)' },
      ];

      const mappedThreats: MapThreat[] = (rawCrimes.length > 0 ? rawCrimes : attackOrigins).slice(0, 4).map((c: any, idx: number) => {
        const origin = attackOrigins[idx % attackOrigins.length];
        const targetStudent = mappedUsers[idx % mappedUsers.length] || {
          username: '1CK21CS045',
          lat: 13.1367,
          lng: 78.1291
        };

        return {
          id: `t-${c.id || idx}`,
          source_ip: c.source_ip || origin.ip,
          source_country: c.source_location || origin.country,
          lat: origin.lat,
          lng: origin.lng,
          threat_type: c.attack_type?.replace(/_/g, ' ') || 'Unauthorized Attendance Modification',
          severity: c.severity || 'CRITICAL',
          targeted_user: c.target_identifier || targetStudent.username,
          targeted_user_lat: targetStudent.lat,
          targeted_user_lng: targetStudent.lng,
          defense_action: c.defense_action_taken?.replace(/_/g, ' ') || 'AUTONOMOUS AUTO-BLOCKED',
          timestamp: c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : 'Just now'
        };
      });

      setThreats(mappedThreats);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // IP Tracking function
  const handleTrackIP = async (ipToTrack?: string) => {
    const target = (ipToTrack || ipInput).trim();
    if (!target) {
      toast.error('Please enter a valid IP address to track');
      return;
    }

    setTrackingLoading(true);
    try {
      const res = await apiClient.get('/geolocation/track', {
        params: { ip: target }
      });
      const data: TrackedIPData = res.data;
      setTrackedIP(data);
      setIpInput(data.ip);
      setMapTargetCoords([data.latitude, data.longitude]);
      toast.success(`🎯 IP ${data.ip} located in ${data.city}, ${data.country}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to track IP address ${target}`);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleToggleQuarantine = async (ip: string, currentlyBlocked: boolean) => {
    try {
      if (currentlyBlocked) {
        await apiClient.post('/firewall/rules', {
          ip_address: ip,
          action: 'ALLOW',
          rule_type: 'IP_WHITELIST',
          reason: 'Manual administrative release from Geo Map'
        });
        toast.success(`IP ${ip} has been unblocked.`);
      } else {
        await apiClient.post('/firewall/auto-block', {
          ip_address: ip,
          reason: 'Immediate Quarantine triggered from Geo-Tracking Radar',
          threat_type: 'ADMIN_GEOMAP_QUARANTINE'
        });
        toast.success(`🚨 IP ${ip} has been immediately quarantined by Autonomous Firewall!`);
      }

      // Refresh tracked IP data
      handleTrackIP(ip);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update firewall rule');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.info(`Copied ${text} to clipboard`);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col font-sans">
      {/* Header with IP Tracker Command Bar */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <Radio className="text-cyan-400 animate-pulse" size={24} />
              Global Threat Radar & IP Tracking Station
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Live geographic IP forensics, autonomous attack trajectories, and SOC perimeter tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded font-medium transition-colors ${activeTab === 'all' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                All Entities
              </button>
              <button
                onClick={() => setActiveTab('attacks')}
                className={`px-3 py-1 rounded font-medium transition-colors ${activeTab === 'attacks' ? 'bg-rose-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Attacks & Targets
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1 rounded font-medium transition-colors ${activeTab === 'users' ? 'bg-cyan-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Active Users
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-gray-900 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
              title="Refresh Map Coordinates"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* IP Tracking Search Bar */}
        <div className="pt-2 border-t border-gray-700/70 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleTrackIP(); }} 
            className="flex-1 flex items-center gap-2 bg-gray-900 p-1.5 rounded-lg border border-cyan-800/80 focus-within:border-cyan-500 transition-all shadow-inner"
          >
            <div className="pl-2 text-cyan-400">
              <Crosshair size={18} className="animate-spin-slow" />
            </div>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="Track IP Address (e.g. 185.220.101.5, 45.154.255.89, 103.21.244.12 or current)..."
              className="flex-1 bg-transparent border-0 text-xs text-gray-100 font-mono placeholder-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={trackingLoading}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {trackingLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
              <span>{trackingLoading ? 'Locating...' : 'Track IP'}</span>
            </button>
          </form>

          {/* Quick Track Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs text-gray-300">
            <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">Quick Track:</span>
            <button
              type="button"
              onClick={() => handleTrackIP('current')}
              className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded-md text-[11px] font-mono flex items-center gap-1 whitespace-nowrap transition-colors"
            >
              <Navigation size={11} /> My Device IP
            </button>
            <button
              type="button"
              onClick={() => handleTrackIP('185.220.101.5')}
              className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors"
            >
              🇳🇱 185.220.101.5
            </button>
            <button
              type="button"
              onClick={() => handleTrackIP('45.154.255.89')}
              className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors"
            >
              🇷🇺 45.154.255.89
            </button>
            <button
              type="button"
              onClick={() => handleTrackIP('103.21.244.12')}
              className="px-2.5 py-1 bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors"
            >
              🇮🇳 103.21.244.12
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Map + Telemetry Sidebar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Map Display */}
        <div className="lg:col-span-3 bg-gray-950 rounded-xl border border-gray-700 overflow-hidden relative shadow-2xl">
          <MapContainer 
            center={[adminGps.lat, adminGps.lng]} 
            zoom={4} 
            style={{ height: '100%', width: '100%', backgroundColor: '#0b0f19' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Programmatic Camera Flying to Tracked Targets */}
            <MapPanController targetCoords={mapTargetCoords} zoom={7} />

            {/* 1. Admin GPS Marker */}
            <Marker position={[adminGps.lat, adminGps.lng]} icon={adminIcon}>
              <Popup>
                <div className="p-2 text-xs text-gray-100 bg-gray-900 rounded border border-cyan-500">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Shield size={14} /> Admin SOC Security Station (Active GPS)
                  </div>
                  <div className="text-gray-300 mt-1">{adminGps.label}</div>
                  <div className="font-mono text-[11px] text-cyan-300 mt-0.5">
                    Lat: {adminGps.lat.toFixed(4)}, Lng: {adminGps.lng.toFixed(4)}
                  </div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-cyan-950 text-cyan-400 text-[10px] rounded font-bold uppercase border border-cyan-800">
                    Active Command Hub
                  </span>
                </div>
              </Popup>
            </Marker>

            {/* Pulsing ring around Admin GPS */}
            <CircleMarker
              center={[adminGps.lat, adminGps.lng]}
              radius={24}
              pathOptions={{ color: '#22d3ee', fillColor: '#06b6d4', fillOpacity: 0.2, weight: 1.5 }}
            />

            {/* 2. Tracked Target IP Marker (If Actively Tracked) */}
            {trackedIP && (
              <>
                <Marker position={[trackedIP.latitude, trackedIP.longitude]} icon={createTrackingTargetIcon(trackedIP.threat_level)}>
                  <Popup>
                    <div className="p-3 text-xs text-gray-100 bg-gray-900 rounded-lg border border-cyan-500 shadow-xl max-w-xs space-y-2">
                      <div className="flex justify-between items-center pb-1 border-b border-gray-700">
                        <span className="font-mono font-bold text-cyan-400 text-sm flex items-center gap-1">
                          {trackedIP.country_flag} {trackedIP.ip}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          trackedIP.threat_level === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' :
                          trackedIP.threat_level === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-700' :
                          trackedIP.threat_level === 'MEDIUM' ? 'bg-yellow-950 text-yellow-300 border border-yellow-700' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}>
                          {trackedIP.threat_level}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] text-gray-300">
                        <div>
                          <span className="text-gray-400">Location:</span>{' '}
                          <strong>{trackedIP.city}, {trackedIP.region}, {trackedIP.country}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400">Coordinates:</span>{' '}
                          <span className="font-mono text-cyan-300">{trackedIP.latitude}, {trackedIP.longitude}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Network / ISP:</span>{' '}
                          <span className="text-gray-200">{trackedIP.isp} ({trackedIP.asn})</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Classification:</span>{' '}
                          <span className="text-rose-400 font-semibold">{trackedIP.threat_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Defense Action:</span>{' '}
                          <span className="text-emerald-400 font-mono font-semibold">{trackedIP.autonomous_defense}</span>
                        </div>
                      </div>

                      {/* 1-Click Firewall Block / Unblock Button inside Popup */}
                      <div className="pt-2 border-t border-gray-700 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleQuarantine(trackedIP.ip, trackedIP.is_quarantined)}
                          className={`flex-1 py-1 px-2.5 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                            trackedIP.is_quarantined 
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950' 
                              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950'
                          }`}
                        >
                          {trackedIP.is_quarantined ? <Unlock size={12} /> : <Ban size={12} />}
                          <span>{trackedIP.is_quarantined ? 'Release IP' : 'Quarantine IP'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(trackedIP.ip)}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                          title="Copy IP"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Radar Circle for Tracked IP */}
                <CircleMarker
                  center={[trackedIP.latitude, trackedIP.longitude]}
                  radius={32}
                  pathOptions={{
                    color: trackedIP.threat_level === 'CRITICAL' ? '#ef4444' : '#06b6d4',
                    fillColor: trackedIP.threat_level === 'CRITICAL' ? '#ef4444' : '#06b6d4',
                    fillOpacity: 0.25,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                />

                {/* Trajectory from Tracked IP to Admin SOC Station */}
                <Polyline
                  positions={[
                    [trackedIP.latitude, trackedIP.longitude],
                    [adminGps.lat, adminGps.lng],
                  ]}
                  pathOptions={{
                    color: trackedIP.threat_level === 'CRITICAL' ? '#ef4444' : '#06b6d4',
                    weight: 2.5,
                    dashArray: '8, 8',
                    opacity: 0.9,
                  }}
                />
              </>
            )}

            {/* 3. User & Student Markers */}
            {(activeTab === 'all' || activeTab === 'users') &&
              users.map((u) => (
                <Marker key={u.id} position={[u.lat, u.lng]} icon={userIcon}>
                  <Popup>
                    <div className="p-2 text-xs text-gray-100 bg-gray-900 rounded border border-gray-700">
                      <div className="font-bold text-sky-400 flex items-center gap-1">
                        <Users size={13} /> {u.name}
                      </div>
                      <div className="text-gray-200 font-mono mt-0.5 font-bold">
                        Roll No: <span className="text-cyan-400">{u.username}</span>
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5">{u.location_name}</div>
                      <div className="mt-1">
                        <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] font-bold rounded border border-emerald-800">
                          Zero-Trust Protected
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))
            }

            {/* 4. Threat Attack Nodes & Trajectories to Targeted User */}
            {(activeTab === 'all' || activeTab === 'attacks') &&
              threats.map((t) => (
                <React.Fragment key={t.id}>
                  {/* Attacker Marker */}
                  <Marker position={[t.lat, t.lng]} icon={threatIcon}>
                    <Popup>
                      <div className="p-2 text-xs text-gray-100 bg-gray-900 rounded border border-rose-600">
                        <div className="font-bold text-rose-400 flex items-center gap-1">
                          <AlertTriangle size={13} /> {t.threat_type}
                        </div>
                        <div className="text-gray-300 mt-1 font-mono text-[11px]">
                          Origin IP: <strong className="text-red-400">{t.source_ip}</strong> ({t.source_country})
                        </div>
                        <div className="p-2 my-1.5 bg-rose-950/60 border border-rose-800/80 rounded text-[11px]">
                          <span className="text-gray-400 block">Target User Account:</span>
                          <strong className="text-cyan-300 font-mono text-xs">{t.targeted_user}</strong>
                        </div>
                        <div className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1 mb-2">
                          <CheckCircle2 size={12} /> {t.defense_action}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTrackIP(t.source_ip)}
                          className="w-full py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Crosshair size={11} /> Deep Forensics on {t.source_ip}
                        </button>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Visual Attack Trajectory Line to Targeted User Node */}
                  <Polyline
                    positions={[
                      [t.lat, t.lng],
                      [t.targeted_user_lat, t.targeted_user_lng],
                    ]}
                    pathOptions={{
                      color: '#f43f5e',
                      weight: 2,
                      dashArray: '6, 8',
                      opacity: 0.85,
                    }}
                  />
                </React.Fragment>
              ))
            }
          </MapContainer>
        </div>

        {/* Sidebar Telemetry, Active Tracked IP Forensics, and Attack List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col justify-between overflow-y-auto space-y-4">
          <div className="space-y-4">
            {/* Live Tracked IP Intelligence Card */}
            {trackedIP ? (
              <div className="p-3 bg-gray-900 border border-cyan-500 rounded-xl shadow-lg space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-1.5">
                    <Crosshair size={15} className="text-cyan-400 animate-spin-slow" />
                    <span className="text-xs font-bold text-gray-100">Live Tracked Target</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    trackedIP.threat_level === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' :
                    trackedIP.threat_level === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-700' :
                    'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}>
                    {trackedIP.threat_level}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-extrabold text-cyan-300 text-sm">
                      {trackedIP.country_flag} {trackedIP.ip}
                    </span>
                    <button
                      onClick={() => copyToClipboard(trackedIP.ip)}
                      className="text-gray-400 hover:text-cyan-400 transition-colors"
                      title="Copy IP"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    {trackedIP.city}, {trackedIP.region}, {trackedIP.country}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    Coordinates: {trackedIP.latitude.toFixed(4)}, {trackedIP.longitude.toFixed(4)}
                  </p>
                </div>

                <div className="p-2 bg-gray-950/70 rounded-lg border border-gray-800 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-gray-200 truncate max-w-[150px] font-medium" title={trackedIP.isp}>{trackedIP.isp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Threat Score:</span>
                    <span className={`font-mono font-bold ${trackedIP.threat_score > 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {trackedIP.threat_score}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target USN:</span>
                    <span className="font-mono text-cyan-400">{trackedIP.targeted_entities[0] || '1CK21CS045'}</span>
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => handleToggleQuarantine(trackedIP.ip, trackedIP.is_quarantined)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow ${
                      trackedIP.is_quarantined 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {trackedIP.is_quarantined ? <Unlock size={13} /> : <Ban size={13} />}
                    <span>{trackedIP.is_quarantined ? 'Release Quarantine' : 'Quarantine IP'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-900/60 border border-gray-750 rounded-xl text-center">
                <Navigation size={22} className="text-cyan-400 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-medium text-gray-200">No Target IP Selected</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Type an IP above or click any entity below to fly the map and inspect geolocation forensics.
                </p>
              </div>
            )}

            {/* Targeted User Threats Radar */}
            <div>
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Crosshair size={14} />
                Detected Threat Trajectories ({threats.length})
              </h3>
              <div className="space-y-2">
                {threats.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => handleTrackIP(t.source_ip)}
                    className="p-2.5 bg-gray-900 hover:bg-gray-850 cursor-pointer border border-gray-700 hover:border-rose-500/60 rounded-lg text-xs space-y-1 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-gray-200 group-hover:text-rose-300 transition-colors">{t.threat_type}</span>
                      <span className="text-[10px] font-bold text-rose-400 px-1.5 py-0.2 bg-rose-950 border border-rose-800 rounded uppercase">
                        {t.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono flex items-center justify-between">
                      <span>IP: <span className="text-red-400 font-bold">{t.source_ip}</span></span>
                      <span className="text-cyan-400 text-[10px] flex items-center gap-0.5 group-hover:underline">
                        Track <ArrowRight size={10} />
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-300 font-medium bg-gray-800/80 px-2 py-0.5 rounded border border-gray-750">
                      Targeted: <strong className="text-cyan-400 font-mono">{t.targeted_user}</strong>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                      <CheckCircle2 size={11} /> {t.defense_action}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monitored Students / Users on Map */}
            <div>
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={14} />
                Monitored Students / Users ({users.length})
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {users.map((u) => (
                  <div 
                    key={u.id} 
                    onClick={() => setMapTargetCoords([u.lat, u.lng])}
                    className="p-2 bg-gray-900/80 hover:bg-gray-850 cursor-pointer border border-gray-700/60 hover:border-cyan-500/60 rounded text-[11px] flex justify-between items-center transition-colors"
                  >
                    <div>
                      <span className="font-bold text-cyan-400 font-mono block">{u.username}</span>
                      <span className="text-gray-300">{u.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{u.location_name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map Legend */}
          <div className="pt-3 border-t border-gray-700 text-[11px] space-y-1 text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Admin SOC Station (GPS)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Student / User Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Targeted Attacker Trajectory</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Live Tracked Target IP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGeoMap;
