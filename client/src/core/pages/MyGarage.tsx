import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/AiErrorDisplay';
import { Button } from '../components/Button';
import { Badge, Card, PageHeader } from '../components/Card';
import { Field, Input, Select, Textarea } from '../components/Form';
import { Loader } from '../components/Loader';
import { CATEGORY_LABELS, DAY_LABELS, SERVICE_CATEGORIES, formatTnd, type ServiceCategory } from '../constants';
import type { Provider } from '../types';

interface ServiceDraft {
  category: ServiceCategory;
  name: string;
  priceTnd: number;
  durationMin: number;
}

/** Pro space: edit the public information of the garage. */
export function MyGaragePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['providers', 'mine'],
    queryFn: () => apiGet<{ provider: Provider }>('/providers/mine'),
  });
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [draft, setDraft] = useState<ServiceDraft>({ category: 'vidange', name: '', priceTnd: 0, durationMin: 60 });

  useEffect(() => {
    if (!data) return;
    setDescription(data.provider.description);
    setAddress(data.provider.address);
    setServices(data.provider.services.map(({ category, name, priceTnd, durationMin }) => ({ category, name, priceTnd, durationMin })));
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiPut<{ provider: Provider }>('/providers/mine', { description, address, services }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  if (isLoading) return <Loader />;
  if (error || !data) return <ErrorMessage error={error} />;
  const provider = data.provider;

  return (
    <div className="space-y-6">
      <PageHeader
        title={provider.name}
        subtitle={`${provider.city} · ★ ${provider.ratingAvg.toFixed(1)} (${provider.ratingCount} avis)`}
        actions={
          provider.isActive ? (
            <Link to={`/prestataires/${provider.id}`} className="text-sm font-medium text-primary-600 hover:underline">
              Voir ma fiche publique →
            </Link>
          ) : null
        }
      />
      {user?.proStatus !== 'approved' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Votre compte est en attente de validation : votre garage n’est pas encore visible des clients.
        </div>
      )}

      <Card className="space-y-4">
        <h2 className="font-semibold text-slate-900">Informations publiques</h2>
        <Field label="Description" htmlFor="description">
          <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Adresse" htmlFor="address">
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div>
          <p className="text-sm font-medium text-slate-700">Horaires</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {provider.openingHours.map((h) => (
              <Badge key={h.day} tone="gray">
                {DAY_LABELS[h.day]} {h.open}–{h.close}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-slate-900">Services et tarifs</h2>
        <ul className="divide-y divide-slate-100">
          {services.map((s, i) => (
            <li key={`${s.name}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <Badge>{CATEGORY_LABELS[s.category]}</Badge> <span className="ml-1 text-slate-800">{s.name}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-medium tabular-nums">{formatTnd(s.priceTnd)}</span>
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => setServices((list) => list.filter((_, j) => j !== i))}
                >
                  Retirer
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-5">
          <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ServiceCategory })}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
          <Input className="sm:col-span-2" placeholder="Nom du service" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input type="number" min={0} placeholder="Prix TND" value={draft.priceTnd || ''} onChange={(e) => setDraft({ ...draft, priceTnd: Number(e.target.value) })} />
          <Button
            variant="secondary"
            disabled={draft.name.trim().length < 2}
            onClick={() => {
              setServices((list) => [...list, { ...draft, name: draft.name.trim() }]);
              setDraft({ ...draft, name: '', priceTnd: 0 });
            }}
          >
            Ajouter
          </Button>
        </div>
      </Card>

      <ErrorMessage error={save.error} />
      {save.isSuccess && <p className="text-sm text-emerald-700">Modifications enregistrées.</p>}
      <Button loading={save.isPending} onClick={() => save.mutate()}>
        Enregistrer
      </Button>
    </div>
  );
}
