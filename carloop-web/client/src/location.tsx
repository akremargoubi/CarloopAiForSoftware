import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface Position {
  lat: number;
  lng: number;
  precise: boolean;
}

// Fallback: Tunis centre, used until (or unless) the browser gives us a position.
const TUNIS: Position = { lat: 36.8065, lng: 10.1815, precise: false };

const LocationContext = createContext<Position>(TUNIS);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [pos, setPos] = useState<Position>(TUNIS);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, precise: true }),
      () => undefined,
      { timeout: 8000 },
    );
  }, []);

  return <LocationContext.Provider value={pos}>{children}</LocationContext.Provider>;
}

export const useLocation = () => useContext(LocationContext);
