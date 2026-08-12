import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const makeIcon = (color, label) => L.divIcon({
  html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;font-family:sans-serif;">${label}</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  className: '',
});

const storeIcon = makeIcon('#ef4444', 'L');
const clientIcon = makeIcon('#3b82f6', 'C');

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }, [bounds]);
  return null;
}

export default function RouteMap({ storeCoords, clientCoords, routeGeometry, height = '400px' }) {
  const bounds = [];
  if (storeCoords) bounds.push(storeCoords);
  if (clientCoords) bounds.push(clientCoords);
  if (routeGeometry) bounds.push(...routeGeometry);

  const center = storeCoords || [-23.5505, -46.6333];

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-border">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <FitBounds bounds={bounds} />
        {storeCoords && (
          <Marker position={storeCoords} icon={storeIcon}>
            <Popup><b>Smoke Bebidas</b></Popup>
          </Marker>
        )}
        {clientCoords && (
          <Marker position={clientCoords} icon={clientIcon}>
            <Popup><b>Cliente</b></Popup>
          </Marker>
        )}
        {routeGeometry && routeGeometry.length > 0 && (
          <Polyline positions={routeGeometry} pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.8 }} />
        )}
      </MapContainer>
    </div>
  );
}