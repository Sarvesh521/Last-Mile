import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { MapPin, Users, CheckCircle2, Plus, Activity, DollarSign, Star, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MapView, PlaceSearchBox } from './MapView';
import { RatingDialog } from './RatingDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useLoadScript } from '@react-google-maps/api';

// API & gRPC Imports
import { driverApi, locationApi, tripApi, stationApi, matchingApi } from '../lib/api';
import { driverClient } from '../lib/grpc';
import * as DriverPb from '../proto/driver_pb.js';

// @ts-ignore
const MonitorDriverDashboardRequest = DriverPb.MonitorDriverDashboardRequest || DriverPb.default.MonitorDriverDashboardRequest;

const libraries: ("places")[] = ["places"];

// Helper for Auth Headers in gRPC
const getAuthMetadata = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

interface DriverDashboardProps {
  user: any;
}

export function DriverDashboard({ user }: DriverDashboardProps) {
  const ROUTE_STORAGE_KEY = `driver_active_route_${user.id}`;

  // Google Maps Load
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_APP_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // --- State Management ---
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState({ lat: 28.6139, lng: 77.2090 });

  // Dashboard Data
  const [trips, setTrips] = useState<any[]>([]);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [driverRating, setDriverRating] = useState(5.0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  // UI State
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRiderForRating, setSelectedRiderForRating] = useState<any>(null);

  // Incoming Match State
  const [incomingMatch, setIncomingMatch] = useState<any>(null);

  // Route Form State
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<any>(null);
  const [availableSeats, setAvailableSeats] = useState(4);

  // Refs for Cleanup
  const streamRef = useRef<any>(null);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<any>(null);
  const [isLocationResolved, setIsLocationResolved] = useState(false);

  // --- 1. Initial Data Load (REST) ---
  // We only do this ONCE on mount to populate history/earnings. 
  // --- 1. Initial Data Load (REST) ---
  const loadInitialData = async () => {
    try {
      // Restore route from local storage if exists
      const storedRouteRaw = localStorage.getItem(ROUTE_STORAGE_KEY);
      if (storedRouteRaw) {
        setActiveRoute(JSON.parse(storedRouteRaw));
      }

      // Fetch baseline data
      const { data } = await driverApi.getDashboard(user.id);
      if (data?.success) {
        setDriverRating(data.driverRating || 5.0);
        setTotalEarnings(data.totalEarnings || 0);

        // Set History
        const history = Array.isArray(data.rideHistory) ? data.rideHistory.map((r: any) => ({
          id: r.tripId,
          date: r.date,
          riderName: r.riderName,
          destination: r.destination,
          fare: r.fare,
          rating: r.ratingGiven,
          duration: '—',
        })) : [];
        setRideHistory(history);

        // Set Active Route if backend has one
        if (data.destination) {
          const routeData = {
            id: 'route_backend',
            driverId: user.id,
            destination: data.destination,
            availableSeats: data.availableSeats,
            destinationCoords: activeRoute?.destinationCoords,
          };
          setActiveRoute(routeData);
          setDestination(data.destination);
          // If backend says we have a route, start pushing location immediately
          startLocationUpdates();
        }
      }
    } catch (e) {
      console.error("Failed to load initial dashboard data", e);
    }
  };

  useEffect(() => {
    // Geolocation Init
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLocationResolved(true);
          loadInitialData();
        },
        () => {
          setIsLocationResolved(true); // Fallback to default
          loadInitialData();
        }
      );
    } else {
      setIsLocationResolved(true);
      loadInitialData();
    }
  }, [user.id]);

  // --- 2. Server-Side Streaming (gRPC) ---
  // Listens for updates (New Rides, Trip Status). No polling.
  useEffect(() => {
    if (!user.id) return;

    // Cancel existing stream if any
    if (streamRef.current) {
      streamRef.current.cancel();
    }

    const request = new MonitorDriverDashboardRequest();
    request.setDriverId(user.id);

    console.log("📡 Connecting to Driver Stream...");
    // FIX: Passing Auth Metadata here
    const stream = driverClient.monitorDriverDashboard(request, getAuthMetadata());
    streamRef.current = stream;

    stream.on('data', (response: any) => {
      // A. Handle New Ride Requests
      const matchRequest = response.getMatchRequest();
      if (matchRequest) {
        const matchData = {
          matchId: matchRequest.getMatchId(),
          riderId: matchRequest.getRiderId(),
          pickupStation: matchRequest.getPickupStation(),
          destination: matchRequest.getDestination(),
          fare: matchRequest.getFare(),
        };
        console.log("New Match Request:", matchData);
        setIncomingMatch(matchData);
        toast.info(`New Ride Request!`, {
          description: `Fare: ₹${matchData.fare} to ${matchData.destination}`
        });
      }

      // B. Handle Trip Status Updates
      const tripUpdate = response.getTripUpdate();
      if (tripUpdate) {
        const tripId = tripUpdate.getTripId();
        const status = tripUpdate.getStatus();
        console.log(`Trip Update: ${tripId} -> ${status}`);

        setTrips(prev => {
          const exists = prev.find(t => t.id === tripId);
          if (exists) {
            return prev.map(t => t.id === tripId ? { ...t, status } : t);
          } else {
            // New trip detected (e.g. just accepted), reload to get full details
            console.log("New trip detected, reloading dashboard...");
            loadInitialData();
            return prev;
          }
        });
      }

      // C. Handle Active Trips List Refresh
      const activeTripsList = response.getActiveTripsList();
      if (activeTripsList) {
        const active = activeTripsList.map((t: any) => ({
          id: t.getTripId(),
          riderId: t.getRiderId(),
          riderName: t.getRiderName(),
          riderRating: t.getRiderRating(),
          pickupStation: t.getPickupStation(),
          destination: t.getDestination(),
          status: t.getStatus(),
          pickupTime: t.getPickupTimestamp(),
          fare: t.getFare(),
        }));
        setTrips(active);
      }
    });

    stream.on('error', (err: any) => {
      if (err.code !== 1) { // Ignore cancelled errors
        console.error('Stream error:', err);
      }
    });

    return () => {
      if (streamRef.current) streamRef.current.cancel();
    };
  }, [user.id]);


  // --- 3. Location Push Polling (The "Write" Loop) ---
  // Kept exactly as requested. Pushes location every 10s.
  const startLocationUpdates = () => {
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
    }

    const interval = setInterval(async () => {
      // 1. Jitter location slightly (Simulate movement)
      setCurrentLocation(prev => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.001,
        lng: prev.lng + (Math.random() - 0.5) * 0.001,
      }));

      // 2. Push to Backend
      try {
        const { lat, lng } = currentLocation;
        // Fire and forget - we don't need to wait for response
        driverApi.updateLocation(user.id, { latitude: lat, longitude: lng });
        locationApi.updateLocation(user.id, { latitude: lat, longitude: lng });
      } catch {
        // ignore errors to prevent spamming console
      }
    }, 10000); // 10 seconds

    setLocationUpdateInterval(interval);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (locationUpdateInterval) clearInterval(locationUpdateInterval);
    };
  }, [locationUpdateInterval]);


  // --- Event Handlers ---

  const handleRegisterRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !destinationCoords) {
      toast.error('Please select a valid destination');
      return;
    }

    try {
      // 1. Calculate Route Points for Station Matching
      let metroStations: string[] = [];
      if (isLoaded && window.google) {
        const directionsService = new window.google.maps.DirectionsService();
        const result = await directionsService.route({
          origin: currentLocation,
          destination: destinationCoords,
          travelMode: window.google.maps.TravelMode.DRIVING,
        });

        if (result.routes[0]?.overview_path) {
          const points = result.routes[0].overview_path.map(p => ({
            latitude: p.lat(),
            longitude: p.lng()
          }));
          // Fetch stations (One-time REST call)
          const { data } = await stationApi.getStationsAlongRoute(
            `${currentLocation.lat},${currentLocation.lng}`,
            destination,
            points
          );
          metroStations = data?.stations?.map((s: any) => s.name) || [];
        }
      }

      // 2. Register with Backend
      await driverApi.registerRoute(user.id, {
        destination,
        availableSeats,
        metroStations,
      });

      // 3. Update Local State
      const newRoute = {
        id: 'route_' + Date.now(),
        driverId: user.id,
        currentLocation,
        destination,
        destinationCoords,
        availableSeats,
      };

      setActiveRoute(newRoute);
      localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(newRoute));
      setShowRouteDialog(false);
      toast.success(`Route registered! Matching with riders near ${metroStations.length} stations.`);

      // 4. Start the Push Polling Loop
      startLocationUpdates();

    } catch (error) {
      console.error(error);
      toast.error('Failed to register route');
    }
  };

  const handleAcceptMatch = async () => {
    if (!incomingMatch) return;
    try {
      await matchingApi.acceptMatch(incomingMatch.matchId, { driverId: user.id });
      toast.success("Ride Accepted!");
      setIncomingMatch(null);
      // The stream will update the active trips list automatically
    } catch (error) {
      console.error("Accept match error", error);
      toast.error("Failed to accept ride");
    }
  };

  const handleDeclineMatch = async () => {
    if (!incomingMatch) return;
    try {
      await matchingApi.declineMatch(incomingMatch.matchId, { driverId: user.id });
      toast.info("Ride Declined");
      setIncomingMatch(null);
    } catch (error) {
      console.error("Decline match error", error);
    }
  };

  const handlePickup = async (tripId: string) => {
    try {
      await tripApi.recordPickup(tripId, {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng
      });
      toast.success('Pickup confirmed!');
      // Stream will handle UI update
    } catch (error) {
      toast.error('Failed to confirm pickup');
    }
  };

  const handleDropoff = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    try {
      await tripApi.recordDropoff(tripId, {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng
      });

      if (trip) setTotalEarnings(prev => prev + trip.fare);

      toast.success('Drop-off confirmed!');
      if (trip) {
        setSelectedRiderForRating(trip);
        setRatingDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to confirm drop-off');
    }
  };

  const handleRateRider = async (rating: number) => {
    if (!selectedRiderForRating) return;
    try {
      // Call your Rating API here
      toast.success("Rating submitted");
    } catch (e) {
      toast.error("Could not submit rating");
    }
  };

  // --- Render Helpers ---

  if (loadError) return <div>Error loading maps configuration.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-semibold">
              {user.name?.charAt(0).toUpperCase() || 'D'}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl mb-1">{user.name}</h1>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span>{driverRating.toFixed(1)} Rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span>₹{totalEarnings} Earned</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN: Map & Route */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Live Map</CardTitle>
                  {!activeRoute && (
                    <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
                      <DialogTrigger asChild>
                        <Button><Plus className="h-4 w-4 mr-2" /> Start Route</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Register Route</DialogTitle>
                          <DialogDescription>Where are you heading?</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleRegisterRoute} className="space-y-4">
                          <Label>Destination</Label>
                          {isLoaded && (
                            <PlaceSearchBox
                              onPlaceSelect={(place) => {
                                setDestination(place.address);
                                setDestinationCoords(place.coords);
                              }}
                            />
                          )}
                          <Label>Seats</Label>
                          <Input type="number" min="1" max="8" value={availableSeats} onChange={e => setAvailableSeats(Number(e.target.value))} />
                          <Button type="submit" className="w-full">Start Driving</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!isLocationResolved ? (
                  <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-500">Acquiring location...</p>
                    </div>
                  </div>
                ) : (
                  <MapView
                    isLoaded={isLoaded}
                    currentLocation={currentLocation}
                    destination={activeRoute ? { ...activeRoute.destinationCoords, name: activeRoute.destination } : undefined}
                    showRoute={!!activeRoute}
                  />
                )}
                {activeRoute && (
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded flex justify-between">
                    <span>Heading to: <strong>{activeRoute.destination}</strong></span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      localStorage.removeItem(ROUTE_STORAGE_KEY);
                      setActiveRoute(null);
                      if (locationUpdateInterval) clearInterval(locationUpdateInterval);
                    }}>End Route</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Trips List */}
            <Card>
              <CardHeader><CardTitle>Active Trips</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trips.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Waiting for ride requests...</div>
                  ) : (
                    trips.map(trip => (
                      <div key={trip.id} className="border p-4 rounded-lg flex flex-col gap-2">
                        <div className="flex justify-between">
                          <span className="font-semibold">{trip.riderName}</span>
                          <Badge>{trip.status}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                          <span>📍 Pickup: {trip.pickupStation}</span>
                          <span>🏁 Drop: {trip.destination}</span>
                          <span>💰 Fare: ₹{trip.fare}</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {trip.status === 'scheduled' && (
                            <Button size="sm" className="w-full" onClick={() => handlePickup(trip.id)}>
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Arrived at Pickup
                            </Button>
                          )}
                          {trip.status === 'active' && (
                            <Button size="sm" className="w-full" onClick={() => handleDropoff(trip.id)}>
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Dropoff
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Stats & History */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Ride History</CardTitle></CardHeader>
              <CardContent>
                <Tabs defaultValue="recent">
                  <TabsList className="w-full">
                    <TabsTrigger value="recent" className="flex-1">Recent</TabsTrigger>
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                  </TabsList>
                  <TabsContent value="recent">
                    {rideHistory.slice(0, 5).map(ride => (
                      <div key={ride.id} className="text-sm border-b py-2 last:border-0">
                        <div className="flex justify-between font-medium">
                          <span>{ride.riderName}</span>
                          <span className="text-green-600">₹{ride.fare}</span>
                        </div>
                        <div className="text-gray-500 text-xs">{ride.date} • {ride.destination}</div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* Incoming Match Dialog */}
      <Dialog open={!!incomingMatch} onOpenChange={(open) => !open && setIncomingMatch(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Ride Request!</DialogTitle>
            <DialogDescription>A rider is looking for a ride near you.</DialogDescription>
          </DialogHeader>
          {incomingMatch && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Estimated Fare</p>
                  <p className="text-xl font-bold text-green-700">₹{incomingMatch.fare}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Pickup</p>
                    <p className="font-medium">{incomingMatch.pickupStation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-red-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Destination</p>
                    <p className="font-medium">{incomingMatch.destination}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" className="flex-1" onClick={handleDeclineMatch}>
              Decline
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptMatch}>
              Accept Ride
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        targetName={selectedRiderForRating?.riderName || ''}
        targetRole="rider"
        onSubmit={handleRateRider}
      />
    </div>
  );
}