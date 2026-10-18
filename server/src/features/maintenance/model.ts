import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { FUEL_TYPES, SERVICE_CATEGORIES } from '../../core/constants.js';
import { USAGES } from './schema.js';

/** Vehicle of a client. The last generated maintenance plan is kept on the document. */
const vehicleSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    marque: { type: String, required: true, trim: true },
    modele: { type: String, required: true, trim: true },
    annee: { type: Number, required: true },
    kilometrage: { type: Number, required: true, min: 0 },
    carburant: { type: String, enum: FUEL_TYPES, required: true },
    usage: { type: String, enum: USAGES, default: 'mixte' },
    plaque: { type: String, trim: true },
    surnom: { type: String, trim: true },
    lastPlan: { type: Schema.Types.Mixed },
    lastPlanAt: { type: Date },
  },
  { timestamps: true },
);

export type Vehicle = InferSchemaType<typeof vehicleSchema>;
export type VehicleDoc = HydratedDocument<Vehicle>;
export const VehicleModel = model('Vehicle', vehicleSchema);

/** One past intervention in the maintenance history of a vehicle. */
const maintenanceRecordSchema = new Schema(
  {
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    kilometrage: { type: Number, required: true, min: 0 },
    intervention: { type: String, required: true, trim: true },
    categorie: { type: String, enum: SERVICE_CATEGORIES, required: true },
    coutTnd: { type: Number, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

export type MaintenanceRecord = InferSchemaType<typeof maintenanceRecordSchema>;
export type MaintenanceRecordDoc = HydratedDocument<MaintenanceRecord>;
export const MaintenanceRecordModel = model('MaintenanceRecord', maintenanceRecordSchema);
