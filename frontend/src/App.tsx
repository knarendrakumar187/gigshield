import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PurchasePage from './pages/PurchasePage'
import ClaimsPage from './pages/ClaimsPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminWorkersPage from './pages/AdminWorkersPage'
import AdminClaimsReviewPage from './pages/AdminClaimsReviewPage'
import AdminActuarialPage from './pages/AdminActuarialPage'
import AdminTriggersPage from './pages/AdminTriggersPage'
import PolicyDocumentsPage from './pages/PolicyDocumentsPage'
import SupportPage from './pages/SupportPage'

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="worker-layout py-20 text-center text-[var(--color-text-muted)]">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-[var(--color-text-muted)]">Loading…</div>
  if (!user) return <Navigate to="/admin-login" replace />
  if (user.role !== 'ADMIN') return <p className="p-8 text-amber-400">Admin only. Use admin / admin123</p>
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <Guard>
                <DashboardPage />
              </Guard>
            }
          />
          <Route
            path="/purchase"
            element={
              <Guard>
                <PurchasePage />
              </Guard>
            }
          />
          <Route
            path="/claims"
            element={
              <Guard>
                <ClaimsPage />
              </Guard>
            }
          />
          <Route
            path="/profile"
            element={
              <Guard>
                <ProfilePage />
              </Guard>
            }
          />
          <Route
            path="/policy-documents"
            element={
              <Guard>
                <PolicyDocumentsPage />
              </Guard>
            }
          />
          <Route
            path="/support"
            element={
              <Guard>
                <SupportPage />
              </Guard>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboardPage />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/workers"
            element={
              <AdminGuard>
                <AdminWorkersPage />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/claims-review"
            element={
              <AdminGuard>
                <AdminClaimsReviewPage />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/actuarial"
            element={
              <AdminGuard>
                <AdminActuarialPage />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/triggers"
            element={
              <AdminGuard>
                <AdminTriggersPage />
              </AdminGuard>
            }
          />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin-app" element={<Navigate to="/admin" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
