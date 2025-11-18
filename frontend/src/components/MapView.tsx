import { MapPin, Navigation } from 'lucide-react';
import { Card } from './ui/card';

interface MapViewProps {
  currentLocation?: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number; name: string };
  driverLocation?: { latitude: number; longitude: number };
  showRoute?: boolean;
}

export function MapView({ currentLocation, destination, driverLocation, showRoute }: MapViewProps) {
  // This is a mock map component. In production, integrate with Google Maps API
  // Use @googlemaps/react-wrapper or similar for real implementation
  
  return (
    <Card className="h-full min-h-[400px] relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Mock map grid pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Map markers */}
        <div className="relative w-full h-full p-8">
          {currentLocation && (
            <div className="absolute top-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2 animate-pulse">
              <div className="relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-lg"></div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-white px-2 py-1 rounded shadow-md text-xs">
                    <Navigation className="h-3 w-3 inline mr-1 text-blue-500" />
                    Your Location
                  </div>
                </div>
              </div>
            </div>
          )}

          {driverLocation && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white">
                  🚗
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-white px-2 py-1 rounded shadow-md text-xs">
                    Driver
                  </div>
                </div>
              </div>
            </div>
          )}

          {destination && (
            <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2">
              <div className="relative">
                <MapPin className="h-8 w-8 text-red-500 fill-red-100" />
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-white px-2 py-1 rounded shadow-md text-xs max-w-[150px] truncate">
                    {destination.name}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showRoute && currentLocation && destination && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path
                d="M 33% 33% Q 50% 50%, 75% 75%"
                stroke="#6366f1"
                strokeWidth="3"
                fill="none"
                strokeDasharray="5,5"
                className="animate-pulse"
              />
            </svg>
          )}
        </div>

        {/* Integration note */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md">
          <p className="text-xs text-gray-600">
            📍 <span className="font-medium">Map Preview</span> - In production, integrate with Google Maps API for real-time navigation
          </p>
        </div>
      </div>
    </Card>
  );
}
