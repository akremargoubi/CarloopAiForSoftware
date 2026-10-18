import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { FUEL_TYPES, SERVICE_CATEGORIES } from '../../core/constants.js';
import { BOOKING_STATUSES } from './schema.js';

const bookingSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId },
    category: { type: String, enum: SERVICE_CATEGORIES, required: true },
    serviceName: { type: String, required: true },
    catalogPriceTnd: { type: Number, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    durationMin: { type: Number, default: 60 },
    vehicle: {
      vehicleId: { type: Schema.Types.ObjectId },
      marque: String,
      modele: String,
      annee: Number,
      kilometrage: Number,
      carburant: { type: String, enum: FUEL_TYPES },
    },
    description: { type: String, default: '' },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending', index: true },
    // AI estimation shown to the client before confirmation and attached to the request.
    aiEstimate: { type: Schema.Types.Mixed },
    proNote: { type: String },
  },
  { timestamps: true },
);

export type Booking = InferSchemaType<typeof bookingSchema>;
export type BookingDoc = HydratedDocument<Booking>;
export const BookingModel = model('Booking', bookingSchema);

/** Real quote sent by the pro for a booking. */
const quoteSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    items: [{ label: { type: String, required: true }, amountTnd: { type: Number, required: true, min: 0 }, _id: false }],
    totalTnd: { type: Number, required: true, min: 0 },
    message: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'accepted', 'declined'], default: 'sent' },
  },
  { timestamps: true },
);

export type Quote = InferSchemaType<typeof quoteSchema>;
export const QuoteModel = model('Quote', quoteSchema);
