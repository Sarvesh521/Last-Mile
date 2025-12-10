import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  InfoWindow,
} from "@react-google-maps/api";
import { stationApi } from "../lib/api";

const containerStyle = { width: "100%", height: "100%" };

type LatLng = { lat: number; lng: number };

// Interface for the Station object coming from Backend
interface Station {
  station_id: string;
  name: string;
  latitude: number;
  longitude: number;
  line?: string;
}

// Helper to check if coordinates are valid numbers
const isValidLatLng = (coords: any): coords is LatLng => {
  return (
    coords &&
    typeof coords.lat === "number" &&
    typeof coords.lng === "number" &&
    !isNaN(coords.lat) &&
    !isNaN(coords.lng)
  );
};

// ----------------------------------------------------------------------
// Helper Component: PlaceSearchBox (No changes here)
// ----------------------------------------------------------------------
export const PlaceSearchBox = ({
  placeholder,
  onPlaceSelect,
}: {
  placeholder: string;
  onPlaceSelect: (place: { coords: LatLng; address: string }) => void;
}) => {
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!inputContainerRef.current || !window.google) return;
    let active = true;

    const init = async () => {
      // @ts-ignore
      const { PlaceAutocompleteElement } = (await google.maps.importLibrary(
        "places"
      )) as any;

      if (!active) return;

      if (!autocompleteRef.current) {
        const autocomplete = new PlaceAutocompleteElement();
        autocomplete.placeholder = placeholder;
        autocompleteRef.current = autocomplete;

        autocomplete.classList.add(
          "w-full", "h-10", "rounded-md", "border", "border-input", "bg-white", "text-black"
        );

        Object.assign(autocomplete.style, {
          width: '100%', height: '40px', backgroundColor: '#ffffff', color: '#000000',
          '--gmp-px-color-surface': '#ffffff', '--gmp-px-color-text-primary': '#000000',
          '--gmp-px-color-text-secondary': '#4b5563',
        });

        autocomplete.addEventListener("gmp-select", async ({ placePrediction }: any) => {
          const place = placePrediction.toPlace();
          if (!place) return;

          try {
            await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
            const location = place.location;
            let name = place.displayName;
            if (typeof name === "object" && name !== null && "text" in name) name = name.text;
            const address = place.formattedAddress || name || "Selected Location";

            if (location) {
              onPlaceSelect({
                coords: { lat: location.lat(), lng: location.lng() },
                address: address,
              });
            }
          } catch (err) {
            console.error("Error fetching place details:", err);
          }
        });
        inputContainerRef.current.appendChild(autocomplete);
      }
    };
    init();
    return () => { active = false; };
  }, [placeholder]);

  return <div ref={inputContainerRef} className="w-full text-black" />;
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
interface MapViewProps {
  isLoaded: boolean;
  currentLocation?: LatLng | null;
  destination?: { lat: number; lng: number; name: string };
  showRoute?: boolean;
}

export function MapView({
  isLoaded,
  currentLocation: propCurrentLocation,
  destination,
  showRoute,
}: MapViewProps) {
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 28.6139, lng: 77.209 });
  const [internalCurrentLocation, setInternalCurrentLocation] = useState<LatLng | null>(null);

  const currentLocation = isValidLatLng(propCurrentLocation)
    ? propCurrentLocation
    : internalCurrentLocation;

  const [originPlace, setOriginPlace] = useState<{ coords?: LatLng; address?: string } | null>(null);
  const [destPlace, setDestPlace] = useState<{ coords?: LatLng; address?: string } | null>(null);

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // NEW: State to store Metro Stations
  const [stations, setStations] = useState<Station[]>([]);
  // NEW: State for InfoWindow (optional, if you want to click a station)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const hasCentered = useRef(false);

  // Handle Internal Geolocation
  useEffect(() => {
    if (isValidLatLng(propCurrentLocation)) {
      if (!hasCentered.current) {
        setMapCenter(propCurrentLocation);
        hasCentered.current = true;
      }
    } else if (navigator.geolocation && !hasCentered.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setInternalCurrentLocation(coords);
          if (!isValidLatLng(propCurrentLocation) && !hasCentered.current) {
            setMapCenter(coords);
            hasCentered.current = true;
          }
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }
  }, [propCurrentLocation]);

  const currentRouteDestRef = useRef<string | null>(null);

  // Handle prop-based routing
  useEffect(() => {
    if (isLoaded && showRoute && destination && isValidLatLng(destination) && isValidLatLng(currentLocation)) {
      // Check if destination changed to reset fitBounds state
      const destKey = `${destination.lat},${destination.lng}`;
      if (currentRouteDestRef.current !== destKey) {
        // Destination changed, allow fitBounds
        // We update the ref inside the callback on success
      }

      const ds = new google.maps.DirectionsService();
      ds.route(
        {
          origin: currentLocation,
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);

            // Only fit bounds if this is a new destination
            if (mapRef.current && currentRouteDestRef.current !== destKey) {
              mapRef.current.fitBounds(result.routes[0].bounds);
              currentRouteDestRef.current = destKey;
            }
          }
        }
      );
    } else if (!showRoute) {
      // Clear route and stations if showRoute is false
      setDirections(null);
      setStations([]);
      currentRouteDestRef.current = null;
    }
  }, [isLoaded, showRoute, destination, currentLocation]);

  const onLoadMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setZoom(14);
  }, []);

  const requestRoute = async () => {
    const origin = originPlace?.coords ?? currentLocation;
    const destination = destPlace?.coords;

    if (!origin || !destination) {
      alert("Please provide both origin and destination.");
      return;
    }
    setLoadingRoute(true);
    // Clear previous stations when new route requested
    setStations([]);

    const ds = new google.maps.DirectionsService();
    ds.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date() },
      },
      (result, status) => {
        setLoadingRoute(false);
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const routeBounds = result.routes[0].bounds;
          if (mapRef.current) mapRef.current.fitBounds(routeBounds);
        } else {
          console.error("Directions request failed:", status);
          alert("Could not get route. Try again.");
        }
      }
    );
  };

  // ----------------------------------------------------------------------
  // Send Route to Backend & Get Stations
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!directions || !directions.routes || directions.routes.length === 0) {
      return;
    }

    const route = directions.routes[0];
    const routePoints = route.overview_path.map((point) => ({
      latitude: point.lat(),
      longitude: point.lng(),
    }));

    const leg = route.legs[0];
    const summary = {
      start_address: leg.start_address,
      end_address: leg.end_address,
    };

    const sendToBackend = async () => {
      try {
        console.log("Fetching stations along route...");
        const response = await stationApi.getStationsAlongRoute(
          summary.start_address,
          summary.end_address,
          routePoints
        );

        console.log("Stations received:", response.data);

        // UPDATE STATE WITH RECEIVED STATIONS
        if (response.data && response.data.stations) {
          setStations(response.data.stations);
        } else {
          console.warn("No stations found in response");
        }

      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };

    if (routePoints.length > 0) {
      sendToBackend();
    }

  }, [directions]);

  if (!isLoaded) {
    return (
      <Card className="h-full min-h-[400px] p-4 flex items-center justify-center">
        <div>Loading map...</div>
      </Card>
    );
  }

  return (
    <Card className="h-full min-h-[400px] relative overflow-hidden">
      {!showRoute && (
        <div className="absolute top-4 left-4 right-4 z-30 pointer-events-auto">
          <div className="flex gap-2 items-center bg-white/90 p-2 rounded-lg backdrop-blur-sm shadow-md">
            <div className="flex-1 max-w-[420px]">
              <PlaceSearchBox
                placeholder={currentLocation ? "Current Location (or search)" : "Search Source"}
                onPlaceSelect={(place) => {
                  setOriginPlace(place);
                  if (isValidLatLng(place.coords)) setMapCenter(place.coords);
                }}
              />
            </div>
            <div className="flex-1 max-w-[420px]">
              <PlaceSearchBox
                placeholder="Search Destination"
                onPlaceSelect={(place) => {
                  setDestPlace(place);
                  if (isValidLatLng(place.coords)) setMapCenter(place.coords);
                }}
              />
            </div>
            <button
              onClick={requestRoute}
              disabled={loadingRoute}
              className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 whitespace-nowrap text-sm font-medium"
            >
              {loadingRoute ? "Routing..." : "Get Route"}
            </button>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="absolute inset-0">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={isValidLatLng(mapCenter) ? mapCenter : { lat: 28.6139, lng: 77.209 }}
          onLoad={onLoadMap}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: true,
          }}
        >
          {isValidLatLng(currentLocation) && (
            <Marker
              position={currentLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#1976D2",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#fff",
              }}
              title="Your location"
            />
          )}

          {/* User Search Markers */}
          {isValidLatLng(originPlace?.coords) && (
            <Marker position={originPlace!.coords!} title={originPlace!.address} />
          )}
          {isValidLatLng(destPlace?.coords) && (
            <Marker position={destPlace!.coords!} title={destPlace!.address} />
          )}

          {/* ----------------------------------------------------------- */}
          {/* NEW: RENDER METRO STATIONS AS RED MARKERS */}
          {/* ----------------------------------------------------------- */}
          {stations.map((station) => (
            <Marker
              key={station.station_id || station.name}
              position={{ lat: station.latitude, lng: station.longitude }}
              title={station.name}
              onClick={() => setSelectedStation(station)}
              // Custom Red Icon configuration
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6, // Size of the dot
                fillColor: "#FF0000", // RED Color
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#FFFFFF", // White border
              }}
            />
          ))}

          {/* Optional: Show InfoWindow when a station is clicked */}
          {selectedStation && (
            <InfoWindow
              position={{ lat: selectedStation.latitude, lng: selectedStation.longitude }}
              onCloseClick={() => setSelectedStation(null)}
            >
              <div className="text-black p-1">
                <h3 className="font-bold">{selectedStation.name}</h3>
                <p className="text-sm">Metro Station</p>
                {selectedStation.line && <p className="text-xs text-gray-600">{selectedStation.line}</p>}
              </div>
            </InfoWindow>
          )}

          {/* Route Line */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                preserveViewport: true,
                polylineOptions: {
                  strokeColor: "#1976D2",
                  strokeWeight: 6,
                },
                markerOptions: {
                  visible: false, // We hide default A/B markers if we are using our own
                },
              }}
            />
          )}
        </GoogleMap>
      </div>
    </Card>
  );
}

export default MapView;