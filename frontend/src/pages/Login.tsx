import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge } from '../components/ui';

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('rider@example.com');
  const [password, setPassword] = useState('rider123');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') nav('/admin');
    else if (user?.role === 'worker') nav('/worker/dashboard');
  }, [nav, user?.role]);

  return (
    <Card className="mx-auto max-w-md p-0 overflow-hidden">
      <div className="bg-gradient-to-br from-indigo-600 to-sky-500 p-6 text-white text-center">
        <div className="text-xl font-bold">Worker Login</div>
        <div className="mt-1 text-sm text-white/90">Welcome back to GigShield.</div>
      </div>

      <div className="grid gap-3 p-6">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Identifier (email/username)
          <input
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none transition-all hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="rider@example.com"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700 mt-2">
          Password
          <input 
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none transition-all hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            type="password" 
          />
        </label>

        {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        <Button
          className="mt-2 w-full py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-300 font-semibold"
          variant="primary"
          onClick={async () => {
            try {
              setError('');
              await login(identifier, password);
              // Role-based redirect relies on the context's 'user' effect, so we don't hardcode nav('/worker/dashboard') here.
            } catch (e: any) {
              setError(e?.message ?? 'Login failed');
            }
          }}
        >
          Sign in
        </Button>

        <div className="text-center text-sm text-slate-500 mt-4">
          New to GigShield? <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">Create an account</Link>
        </div>
        <div className="text-center text-xs mt-4 border-t pt-4 text-slate-400">
          <Link to="/admin-login" className="hover:text-slate-600 transition-colors">Admin Access Portal</Link>
        </div>
      </div>
    </Card>
  );
}

