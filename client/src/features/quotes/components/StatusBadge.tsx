import { Badge, type BadgeTone } from '@/core/components/Card';
import type { BookingStatus } from '../api';

const STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'En attente', tone: 'yellow' },
  accepted: { label: 'Acceptée', tone: 'blue' },
  rejected: { label: 'Refusée', tone: 'red' },
  completed: { label: 'Terminée', tone: 'green' },
  cancelled: { label: 'Annulée', tone: 'gray' },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}
