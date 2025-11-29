import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon missing in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LiveMapProps {
    driverLocation?: { latitude: number; longitude: number };
    riderLocation?: { latitude: number; longitude: number };
    destination?: { latitude: number; longitude: number };
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

export function LiveMap({ driverLocation, riderLocation, destination }: LiveMapProps) {
    const [center, setCenter] = useState<[number, number]>([28.6139, 77.2090]); // Default to New Delhi

    useEffect(() => {
        if (driverLocation) {
            setCenter([driverLocation.latitude, driverLocation.longitude]);
        } else if (riderLocation) {
            setCenter([riderLocation.latitude, riderLocation.longitude]);
        }
    }, [driverLocation, riderLocation]);

    return (
        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-200">
            <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {driverLocation && (
                    <Marker position={[driverLocation.latitude, driverLocation.longitude]}>
                        <Popup>Driver is here</Popup>
                    </Marker>
                )}

                {riderLocation && (
                    <Marker position={[riderLocation.latitude, riderLocation.longitude]}>
                        <Popup>You are here</Popup>
                    </Marker>
                )}

                {destination && (
                    <Marker position={[destination.latitude, destination.longitude]}>
                        <Popup>Destination</Popup>
                    </Marker>
                )}

                <MapUpdater center={center} />
            </MapContainer>
        </div>
    );
}
