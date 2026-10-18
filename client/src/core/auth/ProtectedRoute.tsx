import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader } from '../components/Loader';
import type { Role } from '../types';
import { useAuth } from './AuthContext';

/** Renders children only for logged-in users having one of the given roles. */
export function ProtectedRoute({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Loader label="Chargement de la session…" />;
  if (!user) {
    return <Navigate to={`/connexion?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Accès refusé</h1>
        <p className="mt-2 text-slate-600">Cette page n’est pas accessible avec votre type de compte.</p>
      </div>
    );
  }
  return <>{children}</>;
}
