import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { AiErrorDisplay, ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Button } from '@/core/components/Button';
import { Card, EmptyState, PageHeader } from '@/core/components/Card';
import { Field, Input, Select, Textarea } from '@/core/components/Form';
import { AiLoader, Loader } from '@/core/components/Loader';
import {
  CATEGORY_LABELS,
  CITIES,
  FUEL_LABELS,
  FUEL_TYPES,
  SERVICE_CATEGORIES,
  formatTnd,
  isServiceCategory,
  type ServiceCategory,
} from '@/core/constants';
import {
  useCreateBooking,
  useEstimate,
  useProviderById,
  useProviders,
  useSavedVehicles,
  useSlots,
  type QuoteEstimate,
  type VehicleInput,
} from '../api';
import { EstimateCard } from '../components/EstimateCard';

const EMPTY_VEHICLE: VehicleInput = { marque: '', modele: '', annee: 2018, kilometrage: 80000, carburant: 'essence' };

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const formatSlot = (iso: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">{n}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

/** Booking flow: service → slot → vehicle → AI estimation → confirmation. */
export function BookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const paramCategory = params.get('categorie');
  const [categorie, setCategorie] = useState<ServiceCategory | null>(isServiceCategory(paramCategory) ? paramCategory : null);
  const [ville, setVille] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(params.get('prestataire'));
  const [serviceId, setServiceId] = useState<string>('');
  const [date, setDate] = useState(tomorrow());
  const [slot, setSlot] = useState<string>('');
  const [vehicle, setVehicle] = useState<VehicleInput>(EMPTY_VEHICLE);
  const [description, setDescription] = useState(params.get('description') ?? '');
  const [estimate, setEstimate] = useState<QuoteEstimate | null>(null);

  const providers = useProviders(categorie, ville);
  const provider = useProviderById(providerId);
  const slots = useSlots(providerId, date);
  const savedVehicles = useSavedVehicles(Boolean(user));
  const estimateMutation = useEstimate();
  const createBooking = useCreateBooking();

  const services = useMemo(
    () => (provider.data?.provider.services ?? []).filter((s) => !categorie || s.category === categorie),
    [provider.data, categorie],
  );
  const service = services.find((s) => s.id === serviceId);

  // Pre-select the first service of the chosen provider, and a saved vehicle passed in the URL.
  useEffect(() => {
    if (services.length && !services.some((s) => s.id === serviceId)) setServiceId(services[0].id);
  }, [services, serviceId]);
  useEffect(() => {
    const wanted = params.get('vehicule');
    const found = savedVehicles.data?.find((v) => v.id === wanted);
    if (found) setVehicle({ ...found, vehicleId: found.id });
  }, [savedVehicles.data, params]);
  // Any change of the inputs invalidates the previous estimation.
  useEffect(() => setEstimate(null), [serviceId, vehicle, description]);
  useEffect(() => setSlot(''), [providerId, date]);

  const vehicleValid = vehicle.marque.trim().length >= 2 && vehicle.modele.trim().length >= 1 && vehicle.annee >= 1970 && vehicle.kilometrage >= 0;

  const runEstimate = () => {
    if (!service) return;
    estimateMutation.mutate(
      { vehicule: vehicle, categorie: service.category, service: service.name, description, providerId: providerId ?? undefined },
      { onSuccess: (res) => setEstimate(res.estimation) },
    );
  };

  const confirm = () => {
    if (!providerId || !service || !slot) return;
    createBooking.mutate(
      { providerId, serviceId: service.id, scheduledAt: slot, vehicule: vehicle, description, estimation: estimate ?? undefined },
      { onSuccess: () => navigate('/mes-reservations?nouvelle=1') },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Réserver un service" subtitle="L’IA vous donne une estimation du prix avant de confirmer." />

      <Step n={1} title="Prestataire et service">
        {!providerId || !provider.data ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Catégorie" htmlFor="b-cat">
                <Select id="b-cat" value={categorie ?? ''} onChange={(e) => setCategorie(isServiceCategory(e.target.value) ? e.target.value : null)}>
                  <option value="">Toutes</option>
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ville" htmlFor="b-city">
                <Select id="b-city" value={ville ?? ''} onChange={(e) => setVille(e.target.value || null)}>
                  <option value="">Toutes</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
            {providers.isLoading || (providerId && provider.isLoading) ? (
              <Loader />
            ) : providers.data?.providers.length ? (
              <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {providers.data.providers.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setProviderId(p.id)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-primary-50">
                      <span>
                        <span className="font-medium text-slate-900">{p.name}</span>
                        <span className="ml-2 text-sm text-slate-500">{p.city}</span>
                      </span>
                      <span className="text-sm text-amber-600">★ {p.ratingAvg.toFixed(1)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Aucun prestataire pour ces critères" />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span>
                <span className="font-medium">{provider.data.provider.name}</span>
                <span className="ml-2 text-sm text-slate-500">{provider.data.provider.city}</span>
              </span>
              <button type="button" className="text-sm text-primary-600 hover:underline" onClick={() => setProviderId(null)}>
                Changer
              </button>
            </div>
            {services.length === 0 ? (
              <p className="text-sm text-amber-700">
                Ce prestataire ne propose pas de service « {categorie ? CATEGORY_LABELS[categorie] : ''} ».{' '}
                <button type="button" className="underline" onClick={() => setCategorie(null)}>
                  Voir tous ses services
                </button>
              </p>
            ) : (
              <Field label="Service" htmlFor="b-service">
                <Select id="b-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {CATEGORY_LABELS[s.category]} – {s.name} ({formatTnd(s.priceTnd)})
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Step>

      {providerId && service && (
        <Step n={2} title="Date et créneau">
          <Field label="Date" htmlFor="b-date">
            <Input id="b-date" type="date" min={tomorrow()} value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-56" />
          </Field>
          <div className="mt-3">
            {slots.isLoading ? (
              <Loader label="Recherche des créneaux…" />
            ) : slots.data?.slots.length ? (
              <div className="flex flex-wrap gap-2">
                {slots.data.slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${
                      slot === s ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white text-slate-700 ring-slate-200 hover:ring-primary-300'
                    }`}
                  >
                    {formatSlot(s)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucun créneau disponible ce jour-là (fermé ou complet).</p>
            )}
          </div>
        </Step>
      )}

      {providerId && service && (
        <Step n={3} title="Votre véhicule">
          {savedVehicles.data && savedVehicles.data.length > 0 && (
            <Field label="Mes véhicules" htmlFor="b-saved">
              <Select
                id="b-saved"
                value={vehicle.vehicleId ?? ''}
                onChange={(e) => {
                  const v = savedVehicles.data?.find((x) => x.id === e.target.value);
                  setVehicle(v ? { marque: v.marque, modele: v.modele, annee: v.annee, kilometrage: v.kilometrage, carburant: v.carburant, vehicleId: v.id } : EMPTY_VEHICLE);
                }}
              >
                <option value="">Saisir un autre véhicule</option>
                {savedVehicles.data.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marque} {v.modele} ({v.annee})
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Marque" htmlFor="b-marque">
              <Input id="b-marque" value={vehicle.marque} onChange={(e) => setVehicle({ ...vehicle, marque: e.target.value, vehicleId: undefined })} />
            </Field>
            <Field label="Modèle" htmlFor="b-modele">
              <Input id="b-modele" value={vehicle.modele} onChange={(e) => setVehicle({ ...vehicle, modele: e.target.value, vehicleId: undefined })} />
            </Field>
            <Field label="Année" htmlFor="b-annee">
              <Input id="b-annee" type="number" min={1970} max={new Date().getFullYear() + 1} value={vehicle.annee} onChange={(e) => setVehicle({ ...vehicle, annee: Number(e.target.value) })} />
            </Field>
            <Field label="Kilométrage" htmlFor="b-km">
              <Input id="b-km" type="number" min={0} step={1000} value={vehicle.kilometrage} onChange={(e) => setVehicle({ ...vehicle, kilometrage: Number(e.target.value) })} />
            </Field>
            <Field label="Carburant" htmlFor="b-fuel">
              <Select id="b-fuel" value={vehicle.carburant} onChange={(e) => setVehicle({ ...vehicle, carburant: e.target.value as VehicleInput['carburant'] })}>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {FUEL_LABELS[f]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Description du besoin (optionnel)" htmlFor="b-desc" hint="N’indiquez ni nom, ni téléphone, ni plaque d’immatriculation.">
              <Textarea id="b-desc" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
        </Step>
      )}

      {providerId && service && (
        <Step n={4} title="Estimation et confirmation">
          {!estimate && !estimateMutation.isPending && (
            <Button variant="secondary" disabled={!vehicleValid} onClick={runEstimate}>
              Estimer le prix avec l’IA
            </Button>
          )}
          {estimateMutation.isPending && <AiLoader label="Estimation du devis en cours…" />}
          {estimateMutation.error && !estimate && <AiErrorDisplay error={estimateMutation.error} onRetry={runEstimate} />}
          {estimate && <EstimateCard estimate={estimate} />}

          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              {service.name} chez {provider.data?.provider.name} · prix catalogue {formatTnd(service.priceTnd)}
              {slot && ` · ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(slot))}`}
            </p>
            {!user ? (
              <p className="text-sm">
                <Link to={`/connexion?redirect=${encodeURIComponent(`/reserver?${params.toString()}`)}`} className="font-medium text-primary-600 hover:underline">
                  Connectez-vous
                </Link>{' '}
                pour confirmer la réservation.
              </p>
            ) : user.role !== 'client' ? (
              <p className="text-sm text-amber-700">Seuls les comptes clients peuvent réserver.</p>
            ) : (
              <Button onClick={confirm} disabled={!slot || !vehicleValid} loading={createBooking.isPending}>
                Confirmer la réservation{estimate ? ' (estimation jointe)' : ''}
              </Button>
            )}
            {!slot && <p className="text-xs text-slate-500">Choisissez un créneau pour confirmer.</p>}
            <ErrorMessage error={createBooking.error} />
          </div>
        </Step>
      )}
    </div>
  );
}
