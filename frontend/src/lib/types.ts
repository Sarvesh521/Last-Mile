export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'rider' | 'driver';
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  metroLine?: string;
}

export interface Route {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  metroStations: string[];
  availableSeats: number;
  departureTime: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export interface RideRequest {
  id: string;
  riderId: string;
  metroStation: string;
  destination: string;
  arrivalTime: string;
  status: 'pending' | 'matched' | 'active' | 'completed' | 'cancelled';
}

export interface Trip {
  id: string;
  driverId: string;
  riderId: string;
  pickupStation: string;
  destination: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  pickupTime?: string;
  dropoffTime?: string;
}

export interface Match {
  id: string;
  riderId: string;
  driverId: string;
  tripId: string;
  status: 'pending' | 'accepted' | 'rejected';
}
