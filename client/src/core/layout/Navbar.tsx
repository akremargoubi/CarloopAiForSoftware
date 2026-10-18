import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { buttonClasses } from '../components/Button';
import { features } from '../features';
import type { FeatureNavLink } from '../types/feature';

const CORE_LINKS: FeatureNavLink[] = [
  { to: '/pro/garage', label: 'Mon garage', roles: ['pro'] },
  { to: '/admin', label: 'Administration', roles: ['admin'] },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [...features.flatMap((f) => f.navLinks ?? []), ...CORE_LINKS].filter(
    (l) => !l.roles || (user && l.roles.includes(user.role)),
  );

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-100'
    }`;

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3" aria-label="Navigation principale">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-xl font-bold text-slate-900">
            Car<span className="text-primary-500">Loop</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-slate-600">
                {user.name}
                <span className="ml-1 text-xs text-slate-400">({user.role})</span>
              </span>
              <button type="button" onClick={handleLogout} className={buttonClasses('ghost', 'sm')}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/connexion" className={buttonClasses('ghost', 'sm')}>
                Connexion
              </Link>
              <Link to="/inscription" className={buttonClasses('primary', 'sm')}>
                Inscription
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'} />
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 border-t border-slate-100 pt-2">
              {user ? (
                <button type="button" onClick={handleLogout} className={buttonClasses('ghost', 'sm', 'w-full')}>
                  Déconnexion ({user.name})
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link to="/connexion" onClick={() => setOpen(false)} className={buttonClasses('secondary', 'sm', 'flex-1')}>
                    Connexion
                  </Link>
                  <Link to="/inscription" onClick={() => setOpen(false)} className={buttonClasses('primary', 'sm', 'flex-1')}>
                    Inscription
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
