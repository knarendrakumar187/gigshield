import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge, Button } from '../components/ui';
import { useState } from 'react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-lg shadow-sm flex-shrink-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight group">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-lg font-bold shadow-lg group-hover:shadow-xl transition-shadow">
              G
            </span>
            <span className="text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              GigShield
            </span>
            {user?.role && (
              <Badge 
                tone={user.role === 'admin' ? 'rose' : 'indigo'} 
                className="ml-2 text-xs font-semibold"
              >
                {user.role}
              </Badge>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex flex-wrap items-center justify-end gap-2 text-sm">
            {user?.role === 'worker' && (
              <>
                <Link 
                  to="/worker/dashboard" 
                  className="rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/policy/quote" 
                  className="rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  Weekly Cover
                </Link>
                <Link 
                  to="/policy/history" 
                  className="rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  Policy History
                </Link>
                <Link 
                  to="/payouts" 
                  className="rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  Payouts
                </Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link 
                  to="/admin" 
                  className="rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  Admin
                </Link>
                <Link 
                  to="/admin/triggers" 
                  className="rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  Trigger Simulator
                </Link>
              </>
            )}

            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  nav('/login');
                }}
                className="ml-2 hover:bg-rose-50 hover:text-rose-600"
              >
                Logout
              </Button>
            ) : (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => nav('/login')}
                className="ml-2"
              >
                Login
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-2">
              {user?.role === 'worker' && (
                <>
                  <Link 
                    to="/worker/dashboard" 
                    className="block rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/policy/quote" 
                    className="block rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Weekly Cover
                  </Link>
                  <Link 
                    to="/policy/history" 
                    className="block rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Policy History
                  </Link>
                  <Link 
                    to="/payouts" 
                    className="block rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Payouts
                  </Link>
                </>
              )}
              {user?.role === 'admin' && (
                <>
                  <Link 
                    to="/admin" 
                    className="block rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                  <Link 
                    to="/admin/triggers" 
                    className="block rounded-lg px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Trigger Simulator
                  </Link>
                </>
              )}

              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    nav('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start hover:bg-rose-50 hover:text-rose-600"
                >
                  Logout
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => {
                    nav('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        )}
      </header>
      
      <main className="flex-grow mx-auto max-w-7xl px-4 py-6 animate-fadeIn">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="flex-shrink-0 border-t bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-600">
              © 2026 GigShield. AI-powered weekly income protection for delivery workers.
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>Built with ❤️ for India's delivery workers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

