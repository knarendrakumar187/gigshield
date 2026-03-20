import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import PayoutHistory from './pages/PayoutHistory';
import PolicyHistory from './pages/PolicyHistory';
import PolicyQuote from './pages/PolicyQuote';
import TriggerSimulator from './pages/TriggerSimulator';
import WorkerDashboard from './pages/WorkerDashboard';

function RequireAuth(props: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{props.children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />
          <Route
            path="/policy/quote"
            element={
              <RequireAuth>
                <PolicyQuote />
              </RequireAuth>
            }
          />
          <Route
            path="/policy/history"
            element={
              <RequireAuth>
                <PolicyHistory />
              </RequireAuth>
            }
          />
          <Route
            path="/worker/dashboard"
            element={
              <RequireAuth>
                <WorkerDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/payouts"
            element={
              <RequireAuth>
                <PayoutHistory />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/triggers"
            element={
              <RequireAuth>
                <TriggerSimulator />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

