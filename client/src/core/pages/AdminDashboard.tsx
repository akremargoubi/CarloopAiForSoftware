import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../api/client';
import { ErrorMessage } from '../components/AiErrorDisplay';
import { Button } from '../components/Button';
import { Badge, Card, EmptyState, PageHeader } from '../components/Card';
import { Loader } from '../components/Loader';
import type { User } from '../types';

interface AdminStats {
  users: Partial<Record<'client' | 'pro' | 'admin', number>>;
  pendingPros: number;
  activeProviders: number;
  bookings: { total: number; byStatus: Record<string, number> };
  ai: {
    module: string;
    calls: number;
    errors: number;
    errorRate: number;
    avgDurationMs: number;
    totalTokens: number;
    mockCalls: number;
  }[];
}

interface ProRow extends User {
  provider: { id: string; name: string; city: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptées',
  rejected: 'Refusées',
  completed: 'Terminées',
  cancelled: 'Annulées',
};

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => apiGet<AdminStats>('/admin/stats') });
  const pros = useQuery({
    queryKey: ['admin', 'pros', 'pending'],
    queryFn: () => apiGet<{ pros: ProRow[] }>('/admin/pros', { status: 'pending' }),
  });
  const decide = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => apiPatch(`/admin/pros/${id}`, { approved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  if (stats.isLoading) return <Loader />;
  if (stats.error || !stats.data) return <ErrorMessage error={stats.error} />;
  const s = stats.data;
  const totalUsers = (s.users.client ?? 0) + (s.users.pro ?? 0) + (s.users.admin ?? 0);
  const totalAiCalls = s.ai.reduce((a, m) => a + m.calls, 0);
  const totalAiErrors = s.ai.reduce((a, m) => a + m.errors, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Tableau de bord administrateur" subtitle="Activité de la plateforme et des modules IA" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={totalUsers} hint={`${s.users.client ?? 0} clients · ${s.users.pro ?? 0} pros`} />
        <StatCard label="Prestataires actifs" value={s.activeProviders} hint={`${s.pendingPros} compte(s) pro en attente`} />
        <StatCard label="Réservations" value={s.bookings.total} />
        <StatCard
          label="Appels IA"
          value={totalAiCalls}
          hint={totalAiCalls ? `${Math.round((totalAiErrors / totalAiCalls) * 1000) / 10} % d’erreurs` : 'Aucun appel'}
        />
      </div>

      {s.bookings.total > 0 && (
        <Card>
          <h2 className="font-semibold text-slate-900">Réservations par statut</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(s.bookings.byStatus).map(([status, count]) => (
              <Badge key={status} tone="gray">
                {STATUS_LABELS[status] ?? status} : {count}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-slate-900">Appels IA par module</h2>
        <p className="text-sm text-slate-500">Source : collection AiLog (aucune donnée personnelle n’y est stockée).</p>
        {s.ai.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Aucun appel IA enregistré pour le moment" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4 font-medium">Module</th>
                  <th className="py-2 pr-4 text-right font-medium">Appels</th>
                  <th className="py-2 pr-4 text-right font-medium">Erreurs</th>
                  <th className="py-2 pr-4 font-medium">Taux d’erreur</th>
                  <th className="py-2 pr-4 text-right font-medium">Durée moy.</th>
                  <th className="py-2 pr-4 text-right font-medium">Tokens</th>
                  <th className="py-2 text-right font-medium">Démo</th>
                </tr>
              </thead>
              <tbody>
                {s.ai.map((m) => (
                  <tr key={m.module} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-900">{m.module}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{m.calls}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{m.errors}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${m.errorRate > 20 ? 'bg-red-500' : m.errorRate > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(m.errorRate, 100)}%` }}
                          />
                        </div>
                        <span className="tabular-nums">{m.errorRate} %</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{m.avgDurationMs} ms</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{m.totalTokens}</td>
                    <td className="py-2 text-right tabular-nums">{m.mockCalls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">Comptes professionnels à valider</h2>
        <ErrorMessage error={pros.error || decide.error} />
        {pros.isLoading ? (
          <Loader />
        ) : pros.data?.pros.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {pros.data.pros.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-sm text-slate-500">
                    {p.email}
                    {p.provider && ` · ${p.provider.name} (${p.provider.city})`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" loading={decide.isPending} onClick={() => decide.mutate({ id: p.id, approved: true })}>
                    Valider
                  </Button>
                  <Button size="sm" variant="secondary" disabled={decide.isPending} onClick={() => decide.mutate({ id: p.id, approved: false })}>
                    Refuser
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState title="Aucun compte en attente" />
          </div>
        )}
      </Card>
    </div>
  );
}
