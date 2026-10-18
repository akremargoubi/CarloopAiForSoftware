import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { CITIES, SERVICE_CATEGORIES } from '../constants.js';

const serviceSchema = new Schema({
  category: { type: String, enum: SERVICE_CATEGORIES, required: true },
  name: { type: String, required: true, trim: true },
  priceTnd: { type: Number, required: true, min: 0 },
  durationMin: { type: Number, required: true, min: 5 },
});

const openingHoursSchema = new Schema(
  {
    // 0 = Sunday ... 6 = Saturday
    day: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, required: true },
    close: { type: String, required: true },
  },
  { _id: false },
);

const providerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    description: { type: String, default: '' },
    city: { type: String, enum: CITIES, required: true, index: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    categories: { type: [{ type: String, enum: SERVICE_CATEGORIES }], default: [] },
    services: { type: [serviceSchema], default: [] },
    openingHours: { type: [openingHoursSchema], default: [] },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

providerSchema.index({ categories: 1, city: 1 });

export type Provider = InferSchemaType<typeof providerSchema>;
export type ProviderDoc = HydratedDocument<Provider>;
export const ProviderModel = model('Provider', providerSchema);

/** Public representation of a provider (safe to send to the browser). */
export function toPublicProvider(p: ProviderDoc | (Provider & { _id: unknown })) {
  return {
    id: String(p._id),
    name: p.name,
    description: p.description,
    city: p.city,
    address: p.address,
    phone: p.phone,
    categories: p.categories,
    services: p.services.map((s) => ({
      id: String((s as { _id?: unknown })._id ?? ''),
      category: s.category,
      name: s.name,
      priceTnd: s.priceTnd,
      durationMin: s.durationMin,
    })),
    openingHours: p.openingHours.map((h) => ({ day: h.day, open: h.open, close: h.close })),
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    isActive: p.isActive,
  };
}

export type PublicProvider = ReturnType<typeof toPublicProvider>;
