import { useState } from 'react';
import { ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Button } from '@/core/components/Button';
import { Input, Textarea } from '@/core/components/Form';
import { formatTnd } from '@/core/constants';
import { useSendQuote, type Booking } from '../api';

/** Form used by the pro to send a real quote. Pre-filled with the AI estimation parts when available. */
export function QuoteForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const initial = booking.aiEstimate?.pieces_probables.length
    ? booking.aiEstimate.pieces_probables.map((p) => ({ label: p.piece, amountTnd: p.prix_estime_tnd }))
    : [{ label: booking.serviceName, amountTnd: booking.catalogPriceTnd }];
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState('');
  const send = useSendQuote();
  const total = items.reduce((s, i) => s + (Number(i.amountTnd) || 0), 0);
  const valid = items.length > 0 && items.every((i) => i.label.trim().length >= 2 && i.amountTnd > 0);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-800">Devis</p>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            aria-label="Libellé"
            value={item.label}
            onChange={(e) => setItems(items.map((it, j) => (j === i ? { ...it, label: e.target.value } : it)))}
          />
          <Input
            aria-label="Montant TND"
            type="number"
            min={0}
            step="0.5"
            className="w-28"
            value={item.amountTnd || ''}
            onChange={(e) => setItems(items.map((it, j) => (j === i ? { ...it, amountTnd: Number(e.target.value) } : it)))}
          />
          <button type="button" className="px-2 text-red-600" aria-label="Retirer la ligne" onClick={() => setItems(items.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="text-sm font-medium text-primary-600 hover:underline" onClick={() => setItems([...items, { label: '', amountTnd: 0 }])}>
        + Ajouter une ligne
      </button>
      <Textarea rows={2} placeholder="Message au client (optionnel)" value={message} onChange={(e) => setMessage(e.target.value)} />
      <div className="flex items-center justify-between">
        <span className="font-semibold tabular-nums">Total : {formatTnd(total)}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            loading={send.isPending}
            onClick={() => send.mutate({ id: booking.id, items, message }, { onSuccess: onDone })}
          >
            Envoyer le devis
          </Button>
        </div>
      </div>
      <ErrorMessage error={send.error} />
    </div>
  );
}
