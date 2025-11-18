import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MapPin, Clock, Car, Plus, CheckCircle2, XCircle, Loader2, Navigation, Star, Phone } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { mockStations } from '../lib/mockData';
import { riderApi, matchingApi } from '../lib/api';
import { MapView } from './MapView';
import { RatingDialog } from './RatingDialog';
import { LocationSearch } from './LocationSearch';

interface RiderDashboardProps {
  user: any;
}

export function RiderDashboard({ user }: RiderDashboardProps) {
  const [rides, setRides] = useState<any[]>([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedDriverForRating, setSelectedDriverForRating] = useState<any>(null);
  const [rideAccepted, setRideAccepted] = useState(false);
  const [inRide, setInRide] = useState(false);

  // Ride request form
  const [metroStation, setMetroStation] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<any>(null);
  const [arrivalTime, setArrivalTime] = useState('');
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    // Load mock rides
    const mockRides = [
      {
        id: 'rr1',
        riderId: user.id,
        metroStation: 'Central Station',
        destination: 'Sector 62, Noida',
        destinationCoords: { latitude: 28.6200, longitude: 77.3700 },
        arrivalTime: '08:30 AM',
        status: 'matched',
        driver: {
          id: 'd1',
          name: 'John Driver',
          vehicle: 'Honda City - DL 01 AB 1234',
          rating: 4.8,
          phone: '+91 98765 43210',
          currentLocation: { latitude: 28.6100, longitude: 77.2200 },
        },
        fare: 150,
      },
    ];
    setRides(mockRides);
    
    // Set active ride if exists
    const active = mockRides.find(r => r.status === 'matched' || r.status === 'active');
    if (active) {
      setActiveRide(active);
    }
  }, [user.id]);

  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!destination || !destinationCoords) {
      toast.error('Please select a destination from the search');
      return;
    }

    setMatching(true);

    try {
      // In production, call riderApi.registerRideRequest
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newRide = {
        id: 'rr_' + Date.now(),
        riderId: user.id,
        metroStation,
        destination,
        destinationCoords,
        arrivalTime,
        status: 'pending',
        fare: Math.floor(Math.random() * 100) + 100,
      };

      setRides(prev => [...prev, newRide]);
      setShowRequestDialog(false);
      toast.success('Ride request submitted! Matching with nearby drivers...');

      // Simulate matching
      setTimeout(() => {
        const matchedRide = {
          ...newRide,
          status: 'matched',
          driver: {
            id: 'd_' + Date.now(),
            name: 'Jane Driver',
            vehicle: 'Toyota Camry - DL 02 CD 5678',
            rating: 4.9,
            phone: '+91 98765 12345',
            currentLocation: { latitude: 28.6100, longitude: 77.2200 },
          },
        };
        setRides(prev => prev.map(r => r.id === newRide.id ? matchedRide : r));
        setActiveRide(matchedRide);
        toast.success('Match found! Your driver is on the way.');
      }, 3000);

    } catch (error) {
      toast.error('Failed to request ride');
    } finally {
      setMatching(false);
    }
  };

  const handleAcceptRide = () => {
    setRideAccepted(true);
    toast.success('Ride accepted! You can track your driver on the map.');
  };

  const handleEnterRide = () => {
    setInRide(true);
    if (activeRide) {
      setActiveRide(prev => ({ ...prev, status: 'active' }));
      toast.success('Ride started! Navigating to your destination.');
    }
  };

  const handleCompleteRide = () => {
    if (activeRide?.driver) {
      setSelectedDriverForRating(activeRide.driver);
      setRatingDialogOpen(true);
      
      setActiveRide(prev => ({ ...prev, status: 'completed' }));
      setRideAccepted(false);
      setInRide(false);
      toast.success('Ride completed! Please rate your driver.');
    }
  };

  const handleRateDriver = (rating: number, feedback: string) => {
    toast.success(`Thank you for rating ${selectedDriverForRating?.name}!`);
    // In production, send rating to backend
  };

  const handleCancelRide = async (rideId: string) => {
    try {
      // In production, call riderApi.cancelRideRequest
      setRides(prev => prev.map(ride =>
        ride.id === rideId ? { ...ride, status: 'cancelled' } : ride
      ));
      if (activeRide?.id === rideId) {
        setActiveRide(null);
        setRideAccepted(false);
        setInRide(false);
      }
      toast.success('Ride cancelled');
    } catch (error) {
      toast.error('Failed to cancel ride');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Rider Dashboard</h1>
          <p className="text-gray-600">Book and track your rides</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Rides</p>
                  <p className="text-2xl mt-1">
                    {rides.filter(r => r.status === 'matched' || r.status === 'active').length}
                  </p>
                </div>
                <Car className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl mt-1">{rides.filter(r => r.status === 'pending').length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl mt-1">{rides.filter(r => r.status === 'completed').length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Rides</p>
                  <p className="text-2xl mt-1">{rides.length}</p>
                </div>
                <Navigation className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Ride & Map */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Ride</CardTitle>
                    <CardDescription>Your active or upcoming ride</CardDescription>
                  </div>
                  {!activeRide && (
                    <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Request Ride
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Request a Ride</DialogTitle>
                          <DialogDescription>Enter your pickup and destination details</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleRequestRide} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="station">Metro Station (Pickup Point)</Label>
                            <Select value={metroStation} onValueChange={setMetroStation} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your metro station" />
                              </SelectTrigger>
                              <SelectContent>
                                {mockStations.map((station) => (
                                  <SelectItem key={station.id} value={station.name}>
                                    {station.name} ({station.metroLine})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <LocationSearch
                            value={destination}
                            onChange={(location, coords) => {
                              setDestination(location);
                              setDestinationCoords(coords);
                            }}
                            label="Destination"
                            placeholder="Search destination on map..."
                          />

                          <div className="space-y-2">
                            <Label htmlFor="arrival">Arrival Time at Station</Label>
                            <Input
                              id="arrival"
                              type="time"
                              value={arrivalTime}
                              onChange={(e) => setArrivalTime(e.target.value)}
                              required
                            />
                          </div>

                          <Button type="submit" className="w-full" disabled={matching}>
                            {matching ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Finding Match...
                              </>
                            ) : (
                              'Request Ride'
                            )}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeRide ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={getStatusColor(activeRide.status)}>
                        {activeRide.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600">Fare: ₹{activeRide.fare}</span>
                    </div>

                    {activeRide.driver && (
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-900 mb-3">Your Driver</p>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl">
                            {activeRide.driver.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p>{activeRide.driver.name}</p>
                            <p className="text-sm text-gray-600">{activeRide.driver.vehicle}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{activeRide.driver.rating}</span>
                            </div>
                          </div>
                        </div>
                        <a 
                          href={`tel:${activeRide.driver.phone}`}
                          className="flex items-center justify-center gap-2 bg-white text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{activeRide.driver.phone}</span>
                        </a>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-green-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Pickup</p>
                          <p>{activeRide.metroStation}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-red-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Destination</p>
                          <p>{activeRide.destination}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2 mt-4">
                      {!rideAccepted && activeRide.status === 'matched' && (
                        <Button
                          className="w-full"
                          onClick={handleAcceptRide}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept Ride
                        </Button>
                      )}

                      {rideAccepted && !inRide && activeRide.status !== 'active' && (
                        <Button
                          className="w-full"
                          onClick={handleEnterRide}
                        >
                          <Car className="h-4 w-4 mr-2" />
                          I'm in the Car
                        </Button>
                      )}

                      {inRide && activeRide.status === 'active' && (
                        <Button
                          className="w-full"
                          onClick={handleCompleteRide}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete Ride
                        </Button>
                      )}

                      {activeRide.status !== 'completed' && activeRide.status !== 'cancelled' && (
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleCancelRide(activeRide.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Ride
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Car className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No active rides</p>
                    <p className="text-sm">Request a ride to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map View */}
            {activeRide && rideAccepted && (
              <Card>
                <CardHeader>
                  <CardTitle>Live Tracking</CardTitle>
                  <CardDescription>
                    {inRide ? 'Navigating to your destination' : 'Driver is on the way to pick you up'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MapView
                    driverLocation={inRide ? undefined : activeRide.driver?.currentLocation}
                    destination={inRide ? activeRide.destinationCoords : undefined}
                    showRoute={inRide}
                  />
                </CardContent>
              </Card>
            )}

            {/* Ride History */}
            <Card>
              <CardHeader>
                <CardTitle>Ride History</CardTitle>
                <CardDescription>Your past and pending rides</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rides.map((ride) => (
                    <div key={ride.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p>{ride.metroStation}</p>
                          <p className="text-sm text-gray-600">{ride.destination}</p>
                        </div>
                        <Badge className={getStatusColor(ride.status)}>
                          {ride.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{ride.arrivalTime}</span>
                        </div>
                        {ride.fare && <span>₹{ride.fare}</span>}
                      </div>
                      {ride.driver && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-600">
                            Driver: {ride.driver.name} 
                            <Star className="h-3 w-3 inline ml-2 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs ml-1">{ride.driver.rating}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {rides.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No rides yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Rides</span>
                  <span>{rides.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-green-600">{rides.filter(r => r.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="text-blue-600">
                    {rides.filter(r => r.status === 'matched' || r.status === 'active').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cancelled</span>
                  <span className="text-red-600">{rides.filter(r => r.status === 'cancelled').length}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Spent</span>
                    <span>₹{rides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.fare || 0), 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {activeRide && activeRide.driver && (
              <Card>
                <CardHeader>
                  <CardTitle>Trip Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge className={getStatusColor(activeRide.status)} variant="outline">
                      {activeRide.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fare</span>
                    <span>₹{activeRide.fare}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ETA</span>
                    <span>~15 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Distance</span>
                    <span>~8.5 km</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-white">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                <Button variant="outline" className="w-full justify-start bg-white">
                  <MapPin className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rating Dialog */}
      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        targetName={selectedDriverForRating?.name || ''}
        targetRole="driver"
        onSubmit={handleRateDriver}
      />
    </div>
  );
}
