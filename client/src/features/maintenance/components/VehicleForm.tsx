import { useState, type FormEvent } from 'react';
import { Button } from '@/core/components/Button';
import { Field, Input, Select } from '@/core/components/Form';
import { FUEL_LABELS, FUEL_TYPES, type FuelType } from '@/core/constants';
import { USAGES, USAGE_LABELS, type Usage, type VehicleInput } from '../api';

const EMPTY: VehicleInput = { marque: '', modele: '', annee: new Date().getFullYear() - 5, kilometrage: 0, carburant: 'essence', usage: 'mixte' };

/** Create / edit form of a vehicle. The plate and nickname are never sent to the AI. */
export function VehicleForm({
  initial,
  submitLabel,
  loading,
  onSubmit,
}: {
  initial?: VehicleInput;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (body: VehicleInput) => void;
}) {
  const [v, setV] = useState<VehicleInput>(initial ?? EMPTY);
  const maxYear = new Date().getFullYear() + 1;
  const valid = v.marque.trim().length >= 2 && v.modele.trim().length >= 1 && v.annee >= 1970 && v.annee <= maxYear && v.kilometrage >= 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      ...v,
      marque: v.marque.trim(),
      modele: v.modele.trim(),
      plaque: v.plaque?.trim() || undefined,
      surnom: v.surnom?.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Marque" htmlFor="v-marque">
          <Input id="v-marque" required value={v.marque} onChange={(e) => setV({ ...v, marque: e.target.value })} placeholder="Peugeot" />
        </Field>
        <Field label="Modèle" htmlFor="v-modele">
          <Input id="v-modele" required value={v.modele} onChange={(e) => setV({ ...v, modele: e.target.value })} placeholder="208" />
        </Field>
        <Field label="Année" htmlFor="v-annee">
          <Input id="v-annee" type="number" min={1970} max={maxYear} value={v.annee} onChange={(e) => setV({ ...v, annee: Number(e.target.value) })} />
        </Field>
        <Field label="Kilométrage" htmlFor="v-km">
          <Input id="v-km" type="number" min={0} value={v.kilometrage} onChange={(e) => setV({ ...v, kilometrage: Number(e.target.value) })} />
        </Field>
        <Field label="Carburant" htmlFor="v-carburant">
          <Select id="v-carburant" value={v.carburant} onChange={(e) => setV({ ...v, carburant: e.target.value as FuelType })}>
            {FUEL_TYPES.map((f) => (
              <option key={f} value={f}>
                {FUEL_LABELS[f]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Usage principal" htmlFor="v-usage">
          <Select id="v-usage" value={v.usage} onChange={(e) => setV({ ...v, usage: e.target.value as Usage })}>
            {USAGES.map((u) => (
              <option key={u} value={u}>
                {USAGE_LABELS[u]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Surnom (optionnel)" htmlFor="v-surnom">
          <Input id="v-surnom" maxLength={40} value={v.surnom ?? ''} onChange={(e) => setV({ ...v, surnom: e.target.value })} />
        </Field>
        <Field label="Immatriculation (optionnel)" htmlFor="v-plaque" hint="Visible par vous seul, jamais transmise à l’IA.">
          <Input id="v-plaque" maxLength={20} value={v.plaque ?? ''} onChange={(e) => setV({ ...v, plaque: e.target.value })} placeholder="215 TU 4821" />
        </Field>
      </div>
      <Button type="submit" loading={loading} disabled={!valid}>
        {submitLabel}
      </Button>
    </form>
  );
}
