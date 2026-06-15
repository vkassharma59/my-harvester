import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './lib/auth';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { OwnerDetail } from './pages/OwnerDetail';
import { Owners } from './pages/Owners';

function Protected({ children }: { children: ReactNode }) {
  const { admin } = useAuth();
  return admin ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { admin } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Overview />} />
        <Route path="owners" element={<Owners />} />
        <Route path="owners/:id" element={<OwnerDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
