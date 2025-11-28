import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simple 401 handling: clear session and redirect immediately.
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone: string;
  user_type: 'RIDER' | 'DRIVER';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RegisterRoutePayload {
  destination: string;
  availableSeats: number;
  metroStations: string[];
}

export interface RegisterRideRequestPayload {
  riderId: string;
  metroStation: string;
  destination: string;
  arrivalTime: number;
}

export interface MatchRiderPayload {
  riderId: string;
  rideRequestId: string;
  metroStation: string;
  destination: string;
  arrivalTime: number;
}

export interface CancelMatchPayload {
  matchId: string;
  riderId: string;
}

export const userApi = {
  register: (data: RegisterPayload) => api.post('/user/register', data),
  login: (data: LoginPayload) => api.post('/user/login', data),
  getProfile: (userId: string) => api.get(`/user/profile/${userId}`),
  logout: () => api.post('/user/logout', {}),
};

export const stationApi = {
  getStationsAlongRoute: (origin: string, destination: string, routePoints: LatLng[]) =>
    api.post('/station/route', { origin, destination, routePoints }),
  getAllStations: () => api.get('/station'),
};

export const driverApi = {
  registerRoute: (driverId: string, data: RegisterRoutePayload) => api.post(`/driver/${driverId}/register-route`, data),
  updateLocation: (driverId: string, data: { latitude: number; longitude: number }) => api.post(`/driver/${driverId}/location`, data),
  getDashboard: (driverId: string) => api.get(`/driver/dashboard/${driverId}`),
};

export const riderApi = {
  registerRideRequest: (riderId: string, data: RegisterRideRequestPayload) => api.post(`/rider/ride-register/${riderId}`, data),
  getRideStatus: (riderId: string) => api.get(`/rider/ride-status/${riderId}`),
  listRideRequests: (riderId: string) => api.get(`/rider/ride-requests/${riderId}`),
  getDashboard: (riderId: string) => api.get(`/rider/dashboard/${riderId}`),
};

export const matchingApi = {
  matchRiderWithDriver: (data: MatchRiderPayload) => api.post('/match', data),
  getMatchStatus: (matchId: string) => api.get(`/match/${matchId}`),
  acceptMatch: (matchId: string, data: { driverId: string }) => api.post(`/match/${matchId}/accept`, data),
  declineMatch: (matchId: string, data: { driverId: string }) => api.post(`/match/${matchId}/decline`, data),
  cancelMatch: (matchId: string, data: CancelMatchPayload) => api.post(`/match/${matchId}/cancel`, data),
};

export const tripApi = {
  getTripInfo: (tripId: string) => api.get(`/trip/${tripId}`),
  recordPickup: (tripId: string, data: { latitude: number; longitude: number }) => api.post(`/trip/${tripId}/pickup`, data),
  recordDropoff: (tripId: string, data: { latitude: number; longitude: number; fare?: number }) => api.post(`/trip/${tripId}/dropoff`, data),
};

export const locationApi = {
  updateLocation: (driverId: string, data: { latitude: number; longitude: number }) => api.post(`/location/${driverId}`, data),
  findNearbyDrivers: (latitude: number, longitude: number, radiusKm: number) =>
    api.get(`/location/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`),
};

export default api;
