import * as LocationServicePb from '../proto/location_grpc_web_pb.js';
import * as MatchingServicePb from '../proto/matching_grpc_web_pb.js';
import * as DriverServicePb from '../proto/driver_grpc_web_pb.js';
import * as TripServicePb from '../proto/trip_grpc_web_pb.js';

const ENVOY_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api'; // Envoy proxy URL

// @ts-ignore
const LocationServiceClient = LocationServicePb.LocationServiceClient || LocationServicePb.default.LocationServiceClient;
// @ts-ignore
const MatchingServiceClient = MatchingServicePb.MatchingServiceClient || MatchingServicePb.default.MatchingServiceClient;
// @ts-ignore
const DriverServiceClient = DriverServicePb.DriverServiceClient || DriverServicePb.default.DriverServiceClient;
// @ts-ignore
const TripServiceClient = TripServicePb.TripServiceClient || TripServicePb.default.TripServiceClient;

export const locationClient = new LocationServiceClient(ENVOY_URL, null, null);
export const matchingClient = new MatchingServiceClient(ENVOY_URL, null, null);
export const driverClient = new DriverServiceClient(ENVOY_URL, null, null);
export const tripClient = new TripServiceClient(ENVOY_URL, null, null);

// Helper to get metadata with auth token
export const getAuthMetadata = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'authorization': `Bearer ${token}` } : {};
};
