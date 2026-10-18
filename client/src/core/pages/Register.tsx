import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type RegisterInput } from '../auth/AuthContext';
import { ErrorMessage } from '../components/AiErrorDisplay';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field, Input, Select } from '../components/Form';
import { CITIES } from '../constants';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterInput>({ name: '', email: '', password: '', role: 'client', city: 'Tunis' });
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const update = <K extends keyof RegisterInput>(key: K, value: RegisterInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: RegisterInput =
        form.role === 'pro' ? form : { name: form.name, email: form.email, password: form.password, phone: form.phone, role: 'client' };
      if (!payload.phone) delete payload.phone;
      const user = await register(payload);
      navigate(user.role === 'pro' ? '/pro/garage' : '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Créer un compte</h1>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-sm">
          {(['client', 'pro'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => update('role', role)}
              className={`rounded-md py-2 font-medium ${form.role === role ? 'bg-white text-primary-700 shadow' : 'text-slate-600'}`}
            >
              {role === 'client' ? 'Je suis client' : 'Je suis professionnel'}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Nom complet" htmlFor="name">
            <Input id="name" required minLength={2} value={form.name} onChange={(e) => update('name', e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
          </Field>
          <Field label="Téléphone (optionnel)" htmlFor="phone">
            <Input id="phone" type="tel" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
          </Field>
          <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </Field>
          {form.role === 'pro' && (
            <>
              <Field label="Nom du garage" htmlFor="businessName">
                <Input id="businessName" required value={form.businessName ?? ''} onChange={(e) => update('businessName', e.target.value)} />
              </Field>
              <Field label="Ville" htmlFor="city">
                <Select id="city" value={form.city} onChange={(e) => update('city', e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Les comptes professionnels sont activés après validation par un administrateur.
              </p>
            </>
          )}
          <ErrorMessage error={error} />
          <Button type="submit" loading={loading} className="w-full">
            Créer mon compte
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Déjà inscrit ?{' '}
          <Link to="/connexion" className="font-medium text-primary-600 hover:underline">
            Connectez-vous
          </Link>
        </p>
      </Card>
    </div>
  );
}
