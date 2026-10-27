import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LocateFixed, Search } from 'lucide-react';
import { Spinner } from './ui';

const icon = L.divIcon({
  className: '',
  html: '<div style="transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;background:#047857;border:3px solid #fff;box-shadow:0 2px 8px rgba(15,42,74,.4)"></div>',
  iconSize: [0, 0],
});

function ClickToSet({ onChange }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, Math.max(map.getZoom(), 14));
  }, [map, center]);
  return null;
}

/** Click the map, use GPS, or geocode the address (OpenStreetMap Nominatim, free) to set lat/lng. */
export default function LocationPicker({ lat, lng, onChange, addressQuery }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const pos = lat != null && lng != null ? [lat, lng] : null;

  const geocode = async () => {
    if (!addressQuery) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(addressQuery)}`, {
        headers: { Accept: 'application/json' },
      });
      const [hit] = await r.json();
      if (hit) onChange(Number(hit.lat), Number(hit.lon));
      else setMsg('Address not found. Click on the map to place the pin.');
    } catch {
      setMsg('Lookup failed. Click on the map to place the pin.');
    } finally {
      setBusy(false);
    }
  };

  const gps = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => onChange(p.coords.latitude, p.coords.longitude),
      () => setMsg('Location permission denied.')
    );

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className="btn-outline py-2" onClick={geocode} disabled={busy || !addressQuery}>
          {busy ? <Spinner className="size-4" /> : <Search className="size-4" />} Find address on map
        </button>
        <button type="button" className="btn-outline py-2" onClick={gps}>
          <LocateFixed className="size-4" /> Use my location
        </button>
      </div>
      <div className="h-72 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700">
        <MapContainer center={pos || [20.5937, 78.9629]} zoom={pos ? 14 : 5} className="size-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <ClickToSet onChange={onChange} />
          <Recenter center={pos} />
          {pos && <Marker position={pos} icon={icon} draggable eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onChange(ll.lat, ll.lng); } }} />}
        </MapContainer>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {msg || (pos ? `Pin: ${lat.toFixed(5)}, ${lng.toFixed(5)} — drag to adjust` : 'Click on the map to drop a pin at the exact location.')}
      </p>
    </div>
  );
}
