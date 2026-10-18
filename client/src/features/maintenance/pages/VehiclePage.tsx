import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AiErrorDisplay, ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Button } from '@/core/components/Button';
import { Badge, Card, EmptyState, PageHeader } from '@/core/components/Card';
import { Field, Input, Select } from '@/core/components/Form';
import { Loader } from '@/core/components/Loader';
import { CATEGORY_LABELS, FUEL_LABELS, SERVICE_CATEGORIES, formatDate, formatTnd, type ServiceCategory } from '@/core/constants';
import { USAGE_LABELS, useAddRecord, useDeleteRecord, useDeleteVehicle, useGeneratePlan, useUpdateVehicle, useVehicle, type Vehicle } from '../api';
import { PlanCard } from '../components/PlanCard';
import { VehicleForm } from '../components/VehicleForm';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Client space: one vehicle with its maintenance history and the AI maintenance plan. */
export function VehiclePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useVehicle(id);
  const generate = useGeneratePlan(id);
  const remove = useDeleteVehicle();
  const update = useUpdateVehicle(id);
  const deleteRecord = useDeleteRecord(id);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <Loader />;
  if (error || !data) return <ErrorMessage error={error ?? new Error('Véhicule introuvable')} />;
  const { vehicle, records, plan } = data;
  const generatedAt = generate.data?.generatedAt ?? vehicle.lastPlanAt;

  return (
    <div className="space-y-6">
      <Link to="/vehicules" className="text-sm font-medium text-primary-600 hover:underline">
        ← Mes véhicules
      </Link>
      <PageHeader
        title={vehicle.surnom || `${vehicle.marque} ${vehicle.modele}`}
        subtitle={`${vehicle.marque} ${vehicle.modele} · ${vehicle.annee} · ${new Intl.NumberFormat('fr-FR').format(vehicle.kilometrage)} km`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing((e) => !e)}>
              {editing ? 'Annuler' : 'Modifier'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={remove.isPending}
              onClick={() => {
                if (window.confirm('Supprimer ce véhicule et tout son historique ?')) remove.mutate(vehicle.id, { onSuccess: () => navigate('/vehicules') });
              }}
            >
              Supprimer
            </Button>
          </>
        }
      />
      <ErrorMessage error={remove.error || deleteRecord.error} />

      {editing ? (
        <Card className="space-y-3">
          <ErrorMessage error={update.error} />
          <VehicleForm
            initial={toInput(vehicle)}
            submitLabel="Enregistrer les modifications"
            loading={update.isPending}
            onSubmit={(body) => update.mutate(body, { onSuccess: () => setEditing(false) })}
          />
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Badge tone="gray">{FUEL_LABELS[vehicle.carburant]}</Badge>
          <Badge tone="gray">{USAGE_LABELS[vehicle.usage]}</Badge>
          {vehicle.plaque && <Badge tone="gray">{vehicle.plaque}</Badge>}
        </div>
      )}

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Plan d’entretien personnalisé</h2>
            <p className="text-sm text-slate-600">
              Calculé par l’IA à partir du modèle, du kilométrage, de l’usage et de l’historique (sans immatriculation ni données personnelles).
            </p>
          </div>
          <Button loading={generate.isPending} onClick={() => generate.mutate()}>
            {plan ? 'Recalculer le plan' : 'Générer mon plan'}
          </Button>
        </div>
        {generate.error && <AiErrorDisplay error={generate.error} onRetry={() => generate.mutate()} />}
        {plan ? (
          <PlanCard plan={plan} vehicleId={vehicle.id} generatedAt={generatedAt} />
        ) : (
          !generate.isPending && <EmptyState title="Aucun plan pour l’instant">Ajoutez vos derniers entretiens pour un plan plus précis.</EmptyState>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-slate-900">Historique d’entretien</h2>
        {records.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun entretien enregistré.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {records.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{r.intervention}</p>
                  <p className="text-slate-600">
                    {formatDate(r.date)} · {new Intl.NumberFormat('fr-FR').format(r.kilometrage)} km · {CATEGORY_LABELS[r.categorie]}
                    {r.coutTnd != null && ` · ${formatTnd(r.coutTnd)}`}
                  </p>
                  {r.notes && <p className="text-slate-500">{r.notes}</p>}
                </div>
                <button type="button" className="self-start text-red-600 hover:underline sm:self-auto" onClick={() => deleteRecord.mutate(r.id)}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        <RecordForm vehicle={vehicle} />
      </Card>
    </div>
  );
}

function toInput(v: Vehicle) {
  return {
    marque: v.marque,
    modele: v.modele,
    annee: v.annee,
    kilometrage: v.kilometrage,
    carburant: v.carburant,
    usage: v.usage,
    plaque: v.plaque ?? undefined,
    surnom: v.surnom ?? undefined,
  };
}

/** Adds an intervention to the history (the vehicle mileage follows the latest record). */
function RecordForm({ vehicle }: { vehicle: Vehicle }) {
  const add = useAddRecord(vehicle.id);
  const [date, setDate] = useState(todayIso());
  const [kilometrage, setKilometrage] = useState(vehicle.kilometrage);
  const [intervention, setIntervention] = useState('');
  const [categorie, setCategorie] = useState<ServiceCategory>('vidange');
  const [cout, setCout] = useState('');
  const valid = intervention.trim().length >= 3 && date <= todayIso() && kilometrage >= 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    add.mutate(
      { date, kilometrage, intervention: intervention.trim(), categorie, coutTnd: cout ? Number(cout) : undefined },
      {
        onSuccess: () => {
          setIntervention('');
          setCout('');
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-slate-100 pt-4">
      <p className="text-sm font-medium text-slate-700">Ajouter un entretien</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Intervention" htmlFor="r-intervention">
          <Input id="r-intervention" value={intervention} onChange={(e) => setIntervention(e.target.value)} placeholder="Vidange + filtre à huile" />
        </Field>
        <Field label="Catégorie" htmlFor="r-categorie">
          <Select id="r-categorie" value={categorie} onChange={(e) => setCategorie(e.target.value as ServiceCategory)}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="r-date">
          <Input id="r-date" type="date" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Kilométrage" htmlFor="r-km">
          <Input id="r-km" type="number" min={0} value={kilometrage} onChange={(e) => setKilometrage(Number(e.target.value))} />
        </Field>
        <Field label="Coût en TND (optionnel)" htmlFor="r-cout">
          <Input id="r-cout" type="number" min={0} value={cout} onChange={(e) => setCout(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" loading={add.isPending} disabled={!valid} className="w-full">
            Ajouter
          </Button>
        </div>
      </div>
      <ErrorMessage error={add.error} />
    </form>
  );
}
