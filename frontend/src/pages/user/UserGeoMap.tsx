import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  MapPin, RefreshCw, AlertTriangle, Filter, Search, 
  Crosshair, Navigation, Copy, Globe, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import apiClient from '../../api/axios';
import { formatTimeAgo } from '../../utils/formatters';
import { toast } from 'sonner';

// Helper component to programmatically pan & zoom the map
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

interface GeoEvent {
  id: number;
  ip_address: string;
  country: string;
  country_code: string;
  city?: string;
  latitude: number;
  longitude: number;
  threat_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  timestamp: string;
  is_private: boolean;
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

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#3b82f6',
  INFO:     '#6b7280',
};

const COUNTRY_STAT_COUNT = 8;

export default function UserGeoMap() {
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [severityFilter, setSeverityFilter] = useState('');

  // IP Tracking state
  const [ipInput, setIpInput] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedIP, setTrackedIP] = useState<TrackedIPData | null>(null);
  const [mapTargetCoords, setMapTargetCoords] = useState<[number, number] | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: Record<string, unknown> = { time_range: timeRange, limit: 300 };
      if (severityFilter) params.severity = severityFilter;
      const response = await apiClient.get('/geolocation/events', { params });
      const data: GeoEvent[] = response.data;
      setEvents(data.filter(e => !e.is_private && e.latitude && e.longitude));
    } catch {
      setError('Unable to load geo data. The backend may not be connected yet.');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, severityFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // IP Tracking function
  const handleTrackIP = async (ipToTrack?: string) => {
    const target = (ipToTrack || ipInput).trim();
    if (!target) {
      toast.error('Please enter an IP address to track');
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
      toast.error(err.response?.data?.detail || `Failed to track IP ${target}`);
    } finally {
      setTrackingLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.info(`Copied ${text} to clipboard`);
  };

  // Country stats
  const countryStats = Object.entries(
    events.reduce<Record<string, number>>((acc, e) => {
      acc[e.country] = (acc[e.country] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, COUNTRY_STAT_COUNT);

  return (
    <div className="space-y-4 h-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0 bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Globe className="text-cyan-400" size={24} />
            Global Threat Geolocation & IP Tracking
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            Approximate geographic coordinates and threat forensics of inbound network sessions.
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-xs"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* IP Tracking Command Bar & Filters */}
      <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 space-y-3 flex-shrink-0">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleTrackIP(); }}
            className="flex-1 flex items-center gap-2 bg-gray-900 p-1.5 rounded-lg border border-cyan-800/80 focus-within:border-cyan-500 transition-all shadow-inner"
          >
            <div className="pl-2 text-cyan-400">
              <Crosshair size={18} />
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
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs text-gray-300">
            <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">Quick:</span>
            <button
              type="button"
              onClick={() => handleTrackIP('current')}
              className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded-md text-[11px] font-mono flex items-center gap-1 whitespace-nowrap"
            >
              <Navigation size={11} /> My IP
            </button>
            <button
              type="button"
              onClick={() => handleTrackIP('185.220.101.5')}
              className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-md text-[11px] font-mono whitespace-nowrap"
            >
              🇳🇱 185.220.101.5
            </button>
            <button
              type="button"
              onClick={() => handleTrackIP('103.21.244.12')}
              className="px-2.5 py-1 bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded-md text-[11px] font-mono whitespace-nowrap"
            >
              🇮🇳 103.21.244.12
            </button>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-700/60 text-xs">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1">
            <Filter size={13} className="text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
              className="bg-transparent text-gray-300 text-xs focus:outline-none"
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Severities</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {events.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-cyan-900/20 border border-cyan-700 text-cyan-400 rounded-lg text-xs">
              <MapPin size={12} />
              {events.length} threat events plotted
            </span>
          )}
        </div>
      </div>

      {/* Map + Stats Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Map Display */}
        <div className="lg:col-span-3 bg-gray-950 rounded-xl border border-gray-700 overflow-hidden relative shadow-2xl">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
              <AlertTriangle size={40} className="text-yellow-400" />
              <p className="text-gray-300 font-medium">Map Unavailable</p>
              <p className="text-gray-500 text-sm">{error}</p>
              <button onClick={fetchEvents} className="text-cyan-400 hover:text-cyan-300 text-sm">Retry</button>
            </div>
          ) : (
            <>
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%', backgroundColor: '#0b0f19' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Camera controller to pan to tracked IP */}
                <MapPanController targetCoords={mapTargetCoords} zoom={6} />

                {/* Tracked Target IP Marker (If Actively Tracked) */}
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
                              <span className="text-gray-400">Network / ISP:</span>{' '}
                              <span className="text-gray-200">{trackedIP.isp} ({trackedIP.asn})</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Security Score:</span>{' '}
                              <span className="font-mono text-cyan-400 font-semibold">{trackedIP.threat_score}/100</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Status:</span>{' '}
                              <span className="text-emerald-400 font-semibold">{trackedIP.autonomous_defense}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-700">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(trackedIP.ip)}
                              className="w-full py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-medium flex items-center justify-center gap-1 border border-gray-700"
                            >
                              <Copy size={12} /> Copy IP Address
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Radar circle */}
                    <CircleMarker
                      center={[trackedIP.latitude, trackedIP.longitude]}
                      radius={30}
                      pathOptions={{
                        color: trackedIP.threat_level === 'CRITICAL' ? '#ef4444' : '#06b6d4',
                        fillColor: trackedIP.threat_level === 'CRITICAL' ? '#ef4444' : '#06b6d4',
                        fillOpacity: 0.25,
                        weight: 2,
                        dashArray: '5, 5'
                      }}
                    />
                  </>
                )}

                {/* Plotted Events */}
                {events.map((event) => (
                  <CircleMarker
                    key={event.id}
                    center={[event.latitude, event.longitude]}
                    radius={event.severity === 'CRITICAL' ? 10 : event.severity === 'HIGH' ? 8 : 6}
                    pathOptions={{
                      color: SEVERITY_COLOR[event.severity] ?? '#6b7280',
                      fillColor: SEVERITY_COLOR[event.severity] ?? '#6b7280',
                      fillOpacity: 0.7,
                      weight: 1,
                    }}
                  >
                    <Popup className="dark-popup">
                      <div className="bg-gray-900 text-gray-100 p-3 rounded-lg min-w-[200px] text-xs space-y-1.5">
                        <div className="font-semibold text-cyan-400">{event.threat_type.replace(/_/g, ' ')}</div>
                        <div className="text-xs font-mono text-orange-400">{event.ip_address}</div>
                        <div className="flex items-center gap-1">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: SEVERITY_COLOR[event.severity] }}
                          />
                          <span className="text-xs font-semibold">{event.severity}</span>
                        </div>
                        <div className="text-gray-400">
                          📍 {event.city ? `${event.city}, ` : ''}{event.country}
                        </div>
                        <div className="text-gray-500 text-[11px]">{formatTimeAgo(event.timestamp)}</div>
                        <button
                          type="button"
                          onClick={() => handleTrackIP(event.ip_address)}
                          className="w-full mt-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1"
                        >
                          <Crosshair size={11} /> Track IP Trajectory
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              {isLoading && (
                <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar: Tracked Target Details & Top Countries */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-4">
            {/* Active Tracked IP Card */}
            {trackedIP ? (
              <div className="p-3 bg-gray-900 border border-cyan-500 rounded-xl shadow-lg space-y-2 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-gray-800">
                  <span className="font-bold text-gray-100 flex items-center gap-1">
                    <Crosshair size={14} className="text-cyan-400" /> Tracked Target
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                    {trackedIP.threat_level}
                  </span>
                </div>
                <div>
                  <div className="font-mono font-bold text-cyan-300 text-sm">
                    {trackedIP.country_flag} {trackedIP.ip}
                  </div>
                  <p className="text-gray-300 text-[11px] mt-0.5">
                    {trackedIP.city}, {trackedIP.country}
                  </p>
                  <p className="text-gray-500 font-mono text-[10px]">
                    {trackedIP.latitude.toFixed(4)}, {trackedIP.longitude.toFixed(4)}
                  </p>
                </div>
                <div className="p-2 bg-gray-950/70 rounded border border-gray-800 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ISP:</span>
                    <span className="text-gray-200 truncate max-w-[120px]" title={trackedIP.isp}>{trackedIP.isp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Threat Score:</span>
                    <span className="font-mono font-bold text-cyan-400">{trackedIP.threat_score}/100</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(trackedIP.ip)}
                  className="w-full py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-medium border border-gray-700 flex items-center justify-center gap-1"
                >
                  <Copy size={12} /> Copy IP Address
                </button>
              </div>
            ) : (
              <div className="p-3 bg-gray-900/60 border border-gray-750 rounded-xl text-center text-xs">
                <Navigation size={20} className="text-cyan-400 mx-auto mb-1 opacity-80" />
                <p className="font-medium text-gray-200">No Target Tracked</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Type an IP above or click any marker on the map to inspect live geolocation.
                </p>
              </div>
            )}

            {/* Country Stats Panel */}
            <div>
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe size={13} /> Top Geographic Threat Origins
              </h3>
              {countryStats.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {countryStats.map(([country, count]) => {
                    const maxCount = countryStats[0]?.[1] ?? 1;
                    const pct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={country}>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-gray-300 truncate text-[11px]" title={country}>{country}</span>
                          <span className="text-cyan-400 font-mono text-[11px] ml-2">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-gray-700 text-[10px] space-y-1 text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Critical Security Events</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>High / Medium Severity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Target IP Tracking Position</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
