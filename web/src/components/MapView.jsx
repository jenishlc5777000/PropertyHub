import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { formatPriceShort } from '@propertyhub/shared';

// Price-label pins (no image assets needed, so no bundler icon issues).
const pin = (label, active) =>
  L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-100%);display:inline-block;white-space:nowrap;background:${active ? '#059669' : '#0f2a4a'};color:#fff;font:600 12px Inter,sans-serif;padding:4px 8px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>`,
    iconSize: [0, 0],
  });

/** Leaflet measures its container once; re-measure when it resizes (e.g. inside a modal or after a layout change). */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [map]);
  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

const TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export default function MapView({ properties = [], center, radiusKm, className = 'h-[600px]', single }) {
  const pts = properties.filter((p) => p.lat != null && p.lng != null);
  const bounds = pts.map((p) => [p.lat, p.lng]);
  const start = center || bounds[0] || [20.5937, 78.9629];
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
      <MapContainer center={start} zoom={single ? 14 : 5} scrollWheelZoom={!single} className="size-full">
        <TileLayer {...TILE} />
        <AutoResize />
        <FitBounds points={bounds.length ? bounds : center ? [center] : []} />
        {center && radiusKm && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#059669', fillOpacity: 0.05 }} />}
        {pts.map((p) => (
          <Marker key={p._id} position={[p.lat, p.lng]} icon={pin(single ? '📍' : formatPriceShort(p.price), single)}>
            {!single && (
              <Popup>
                <Link to={`/property/${p.slug}`} className="block w-48">
                  {p.images?.[0] && <img src={p.images[0].url} alt="" className="mb-2 h-24 w-full rounded object-cover" />}
                  <strong className="block text-slate-900">{formatPriceShort(p.price)}</strong>
                  <span className="text-xs text-slate-600">{p.title}</span>
                </Link>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
