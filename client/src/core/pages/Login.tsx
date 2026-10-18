import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/AiErrorDisplay';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field, Input } from '../components/Form';

const DEMO_ACCOUNTS = [
  { label: 'Client', email: 'client1@carloop.tn', password: 'Client123!' },
  { label: 'Pro', email: 'pro1@carloop.tn', password: 'Pro12345!' },
  { label: 'Admin', email: 'admin@carloop.tn', password: 'Admin123!' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      const fallback = user.role === 'admin' ? '/admin' : user.role === 'pro' ? '/pro/garage' : '/';
      navigate(params.get('redirect') || fallback, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-600">Accédez à votre espace CarLoop.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Mot de passe" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <ErrorMessage error={error} />
          <Button type="submit" loading={loading} className="w-full">
            Se connecter
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="font-medium text-primary-600 hover:underline">
            Inscrivez-vous
          </Link>
        </p>
        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Comptes de démonstration</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.label}
                type="button"
                className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200 hover:bg-primary-50"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
