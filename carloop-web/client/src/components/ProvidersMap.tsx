import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { useLocation } from '../location';
import type { ProviderSummary } from '../types';

// divIcon avoids Leaflet's default marker images, which bundlers cannot resolve.
const pin = (kind: 'provider' | 'me') =>
  L.divIcon({
    className: '',
    html: `<span class="map-pin ${kind}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
const providerIcon = pin('provider');
const meIcon = pin('me');

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

export function ProvidersMap({ providers }: { providers: ProviderSummary[] }) {
  const me = useLocation();
  const points = useMemo<[number, number][]>(
    () => [[me.lat, me.lng], ...providers.map((p): [number, number] => [p.latitude, p.longitude])],
    [me, providers],
  );

  return (
    <MapContainer center={[me.lat, me.lng]} zoom={11} className="map" scrollWheelZoom>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      <FitBounds points={points} />
      <Marker position={[me.lat, me.lng]} icon={meIcon}>
        <Popup>{me.precise ? 'Votre position' : 'Position par défaut (Tunis)'}</Popup>
      </Marker>
      {providers.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={providerIcon}>
          <Popup>
            <strong>{p.nom_atelier}</strong>
            <br />
            Dès {p.prix_depart.toFixed(0)} TND · {p.note_moyenne > 0 ? `${p.note_moyenne} ★` : 'pas d’avis'}
            <br />
            <Link to={`/providers/${p.id}`}>Voir la fiche</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
