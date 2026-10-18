import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './core/auth/ProtectedRoute';
import { features } from './core/features';
import { Layout } from './core/layout/Layout';
import { AdminDashboardPage } from './core/pages/AdminDashboard';
import { HomePage } from './core/pages/Home';
import { LoginPage } from './core/pages/Login';
import { MyGaragePage } from './core/pages/MyGarage';
import { NotFoundPage } from './core/pages/NotFound';
import { RegisterPage } from './core/pages/Register';

const featureRoutes = features.flatMap((f) => f.routes ?? []);

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pro/garage"
          element={
            <ProtectedRoute roles={['pro']}>
              <MyGaragePage />
            </ProtectedRoute>
          }
        />
        {featureRoutes.map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={r.roles ? <ProtectedRoute roles={r.roles}>{r.element}</ProtectedRoute> : r.element}
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
