import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, Input } from '../components/ui';
import { useAuth } from '../lib/auth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="text-3xl">🌾</div>
          <h1 className="mt-2 text-lg font-semibold text-slate-800">Harvester Admin</h1>
          <p className="text-xs text-slate-500">Platform operator console</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email or mobile">
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !identifier || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
