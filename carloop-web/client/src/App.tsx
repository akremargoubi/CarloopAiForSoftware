import { NavLink, Route, Routes } from 'react-router-dom';
import { Icon } from './components/ui';
import { Home } from './pages/Home';
import { ProviderDetail } from './pages/ProviderDetail';
import { Providers } from './pages/Providers';

export function App() {
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="logo">
            Car<span>Loop</span>
          </NavLink>
          <nav>
            <NavLink to="/" end>
              <Icon name="home" /> Accueil
            </NavLink>
            <NavLink to="/providers">
              <Icon name="storefront" /> Prestataires
            </NavLink>
            <NavLink to="/favorites">
              <Icon name="favorite" /> Favoris
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/providers/:id" element={<ProviderDetail />} />
          <Route path="/favorites" element={<Providers favoritesOnly />} />
          <Route path="*" element={<p className="card empty">Page introuvable.</p>} />
        </Routes>
      </main>
    </>
  );
}
