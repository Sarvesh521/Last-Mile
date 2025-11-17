import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userApi = {
  register: (data) => api.post('/user/register', data),
  login: (data) => api.post('/user/login', data),
  getProfile: (userId) => api.get(`/user/profile/${userId}`),
};

export const stationApi = {
  getStationsAlongRoute: (origin, destination) =>
    api.post('/station/route', { origin, destination }),
  getAllStations: () => api.get('/station'),
};

export const driverApi = {
  registerRoute: (data) => api.post('/driver/register-route', data),
  updateLocation: (driverId, data) => api.post(`/driver/${driverId}/location`, data),
  updatePickupStatus: (driverId, data) => api.post(`/driver/${driverId}/pickup-status`, data),
  getDriverInfo: (driverId) => api.get(`/driver/${driverId}`),
};

export const riderApi = {
  registerRideRequest: (data) => api.post('/rider/ride-request', data),
  getRideStatus: (rideRequestId) => api.get(`/rider/ride-request/${rideRequestId}`),
  cancelRideRequest: (rideRequestId) => api.post(`/rider/ride-request/${rideRequestId}/cancel`),
};

export const matchingApi = {
  matchRiderWithDriver: (data) => api.post('/match', data),
  getMatchStatus: (matchId) => api.get(`/match/${matchId}`),
};

export const tripApi = {
  getTripInfo: (tripId) => api.get(`/trip/${tripId}`),
  recordPickup: (tripId, data) => api.post(`/trip/${tripId}/pickup`, data),
  recordDropoff: (tripId, data) => api.post(`/trip/${tripId}/dropoff`, data),
};

export const locationApi = {
  updateLocation: (driverId, data) => api.post(`/location/${driverId}`, data),
  findNearbyDrivers: (latitude, longitude, radiusKm) =>
    api.get(`/location/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`),
};

export default api;
