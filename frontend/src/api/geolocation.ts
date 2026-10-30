import apiClient from './axios';

export interface GeoEvent {
  id: number;
  ip_address: string;
  country: string;
  country_code: string;
  city?: string;
  latitude: number;
  longitude: number;
  threat_type: string;
  severity: string;
  timestamp: string;
  is_private: boolean;
}

export interface IPLookupResult {
  ip_address: string;
  is_private: boolean;
  country?: string;
  country_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  org?: string;
  isp?: string;
  disclaimer: string;
}

export interface GeoParams {
  time_range?: '24h' | '7d' | '30d';
  severity?: string;
  limit?: number;
}

export const geolocationApi = {
  getGeoEvents: async (params?: GeoParams): Promise<GeoEvent[]> => {
    const response = await apiClient.get('/geolocation/events', { params });
    return response.data;
  },

  lookupIP: async (ip: string): Promise<IPLookupResult> => {
    const response = await apiClient.get(`/geolocation/lookup/${ip}`);
    return response.data;
  },

  getCountryStats: async (params?: GeoParams): Promise<Array<{ country: string; country_code: string; count: number }>> => {
    const response = await apiClient.get('/geolocation/country-stats', { params });
    return response.data;
  },
};

export default geolocationApi;
