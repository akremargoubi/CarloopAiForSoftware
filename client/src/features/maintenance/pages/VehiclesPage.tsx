import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Button } from '@/core/components/Button';
import { Badge, Card, EmptyState, PageHeader } from '@/core/components/Card';
import { Loader } from '@/core/components/Loader';
import { FUEL_LABELS, formatDate } from '@/core/constants';
import { useCreateVehicle, useVehicles } from '../api';
import { VehicleForm } from '../components/VehicleForm';

/** Client space: list of vehicles and creation form. */
export function VehiclesPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useVehicles();
  const create = useCreateVehicle();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes véhicules"
        subtitle="Enregistrez vos entretiens et obtenez un plan d’entretien personnalisé par l’IA."
        actions={
          !showForm && (
            <Button onClick={() => setShowForm(true)} disabled={isLoading}>
              Ajouter un véhicule
            </Button>
          )
        }
      />
      <ErrorMessage error={error} />

      {(showForm || data?.length === 0) && (
        <Card className="space-y-3">
          <h2 className="font-semibold text-slate-900">Nouveau véhicule</h2>
          <ErrorMessage error={create.error} />
          <VehicleForm
            submitLabel="Enregistrer le véhicule"
            loading={create.isPending}
            onSubmit={(body) => create.mutate(body, { onSuccess: (vehicle) => navigate(`/vehicules/${vehicle.id}`) })}
          />
        </Card>
      )}

      {isLoading ? (
        <Loader />
      ) : !data?.length ? (
        <EmptyState title="Aucun véhicule enregistré">Ajoutez votre premier véhicule pour obtenir son plan d’entretien.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((v) => (
            <Link key={v.id} to={`/vehicules/${v.id}`} className="block rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-200">
              <Card className="h-full transition hover:border-primary-300 hover:shadow">
                <p className="font-semibold text-slate-900">{v.surnom || `${v.marque} ${v.modele}`}</p>
                <p className="text-sm text-slate-600">
                  {v.marque} {v.modele} · {v.annee} · {new Intl.NumberFormat('fr-FR').format(v.kilometrage)} km
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="gray">{FUEL_LABELS[v.carburant]}</Badge>
                  {v.lastPlanAt ? <Badge tone="green">Plan du {formatDate(v.lastPlanAt)}</Badge> : <Badge tone="yellow">Pas encore de plan</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
