import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Crosshair } from 'lucide-react';

const makeIcon = (color, label) => L.divIcon({
  html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;font-family:sans-serif;">${label}</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  className: '',
});

const storeIcon = makeIcon('#ef4444', 'L');
const clientIcon = makeIcon('#3b82f6', 'C');

const motoboyIcon = L.divIcon({
  html: `<div style="transform:rotate(0deg);"><div style="background:#f59e0b;width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  className: '',
});

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }, [bounds]);
  return null;
}

function RecenterOnMoto({ position, follow }) {
  const map = useMap();
  useEffect(() => {
    if (follow && position) {
      map.setView(position, 16, { animate: true });
    }
  }, [position, follow]);
  return null;
}

export default function LiveRouteMap({ storeCoords, clientCoords, routeGeometry, height = '350px' }) {
  const [motoPos, setMotoPos] = useState(null);
  const [heading, setHeading] = useState(0);
  const [following, setFollowing] = useState(true);
  const [gpsError, setGpsError] = useState(null);
  const watchIdRef = useRef(null);
  const lastPosRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS não disponível neste dispositivo');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        if (lastPosRef.current) {
          const [lat1, lng1] = lastPosRef.current;
          const [lat2, lng2] = newPos;
          const dLat = lat2 - lat1;
          const dLng = lng2 - lng1;
          if (dLat !== 0 || dLng !== 0) {
            setHeading(Math.atan2(dLng, dLat) * 180 / Math.PI);
          }
        }
        lastPosRef.current = newPos;
        setMotoPos(newPos);
        setGpsError(null);
      },
      (err) => {
        setGpsError(err.message === 'User denied Geolocation' ? 'Permissão de localização negada' : 'Erro ao obter localização');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const bounds = [];
  if (storeCoords) bounds.push(storeCoords);
  if (clientCoords) bounds.push(clientCoords);
  if (routeGeometry) bounds.push(...routeGeometry);
  if (motoPos) bounds.push(motoPos);

  const center = storeCoords || [-23.5505, -46.6333];

  const motoboyIconRotated = L.divIcon({
    html: `<div style="transform:rotate(${heading}deg);transition:transform 0.5s;"><div style="background:#f59e0b;width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    className: '',
  });

  return (
    <div className="relative" style={{ height, width: '100%' }}>
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: '100%', width: '100%' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <FitBounds bounds={bounds} />
          <RecenterOnMoto position={motoPos} follow={following} />
          {storeCoords && (
            <Marker position={storeCoords} icon={storeIcon}>
              <Popup><b>Smoke Bebidas (Loja)</b></Popup>
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
          {motoPos && (
            <Marker position={motoPos} icon={motoboyIconRotated}>
              <Popup><b>Sua localização</b></Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Botão seguir localização */}
      <button
        onClick={() => setFollowing(f => !f)}
        className={`absolute bottom-3 right-3 z-[1000] p-2.5 rounded-lg shadow-lg border transition-all ${following ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-foreground'}`}
        title={following ? 'Parar de seguir' : 'Seguir minha localização'}
      >
        <Crosshair className="w-5 h-5" />
      </button>

      {/* Status GPS */}
      {gpsError && (
        <div className="absolute top-2 left-2 right-2 z-[1000] bg-amber-500/90 text-black text-xs font-medium px-3 py-1.5 rounded-md text-center">
          {gpsError}
        </div>
      )}
      {!motoPos && !gpsError && (
        <div className="absolute top-2 left-2 right-2 z-[1000] bg-card/90 text-foreground text-xs font-medium px-3 py-1.5 rounded-md text-center border border-border">
          Obtendo sua localização...
        </div>
      )}
    </div>
  );
}