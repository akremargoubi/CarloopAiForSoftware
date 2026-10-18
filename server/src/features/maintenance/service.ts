import { runAiTask } from '../../ai/index.js';
import { notFound } from '../../core/errors.js';
import type { AuthUser } from '../../core/types/express.js';
import { mockMaintenancePlan } from './mock.js';
import { MaintenanceRecordModel, VehicleModel, type MaintenanceRecordDoc, type VehicleDoc } from './model.js';
import { MAINTENANCE_SYSTEM_PROMPT, buildPlanMessage, type PlanContext } from './prompt.js';
import { planSchemaFor, type MaintenancePlan, type RecordBody, type VehicleBody } from './schema.js';

/** Number of history entries sent to the LLM (most recent first). */
const MAX_RECORDS_FOR_PLAN = 30;

/** Today's date in Tunisia, format YYYY-MM-DD. */
export function todayInTunis(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(now);
}

function toPublicVehicle(v: VehicleDoc) {
  return {
    id: v.id as string,
    marque: v.marque,
    modele: v.modele,
    annee: v.annee,
    kilometrage: v.kilometrage,
    carburant: v.carburant,
    usage: v.usage ?? 'mixte',
    plaque: v.plaque ?? null,
    surnom: v.surnom ?? null,
    lastPlanAt: v.lastPlanAt ?? null,
    createdAt: v.createdAt,
  };
}

function toPublicRecord(r: MaintenanceRecordDoc) {
  return {
    id: r.id as string,
    date: r.date,
    kilometrage: r.kilometrage,
    intervention: r.intervention,
    categorie: r.categorie,
    coutTnd: r.coutTnd ?? null,
    notes: r.notes ?? null,
  };
}

async function findOwnedVehicle(ownerId: string, id: string): Promise<VehicleDoc> {
  const vehicle = await VehicleModel.findOne({ _id: id, owner: ownerId });
  if (!vehicle) throw notFound('Véhicule introuvable');
  return vehicle;
}

/** Vehicles of the client (also used by the booking form of the quotes module, via the API). */
export async function listVehicles(ownerId: string) {
  const vehicles = await VehicleModel.find({ owner: ownerId }).sort({ createdAt: 1 });
  return vehicles.map(toPublicVehicle);
}

/** One vehicle with its maintenance history and its last generated plan. */
export async function getVehicle(ownerId: string, id: string) {
  const vehicle = await findOwnedVehicle(ownerId, id);
  const records = await MaintenanceRecordModel.find({ vehicle: vehicle._id }).sort({ date: -1, kilometrage: -1 });
  return {
    vehicle: toPublicVehicle(vehicle),
    records: records.map(toPublicRecord),
    plan: (vehicle.lastPlan as MaintenancePlan | undefined) ?? null,
  };
}

export async function createVehicle(ownerId: string, body: VehicleBody) {
  const vehicle = await VehicleModel.create({ ...body, owner: ownerId });
  return toPublicVehicle(vehicle);
}

export async function updateVehicle(ownerId: string, id: string, body: VehicleBody) {
  const vehicle = await findOwnedVehicle(ownerId, id);
  vehicle.set(body);
  await vehicle.save();
  return toPublicVehicle(vehicle);
}

/** Deletes the vehicle and its history. */
export async function deleteVehicle(ownerId: string, id: string): Promise<void> {
  const vehicle = await findOwnedVehicle(ownerId, id);
  await MaintenanceRecordModel.deleteMany({ vehicle: vehicle._id });
  await vehicle.deleteOne();
}

/** Adds an intervention to the history; the vehicle mileage follows the most recent record. */
export async function addRecord(ownerId: string, vehicleId: string, body: RecordBody) {
  const vehicle = await findOwnedVehicle(ownerId, vehicleId);
  const record = await MaintenanceRecordModel.create({ ...body, date: new Date(`${body.date}T12:00:00Z`), vehicle: vehicle._id, owner: ownerId });
  if (body.kilometrage > vehicle.kilometrage) {
    vehicle.kilometrage = body.kilometrage;
    await vehicle.save();
  }
  return toPublicRecord(record);
}

export async function deleteRecord(ownerId: string, vehicleId: string, recordId: string): Promise<void> {
  const vehicle = await findOwnedVehicle(ownerId, vehicleId);
  const deleted = await MaintenanceRecordModel.findOneAndDelete({ _id: recordId, vehicle: vehicle._id });
  if (!deleted) throw notFound('Entretien introuvable');
}

/**
 * Generates the personalised maintenance plan of a vehicle with the LLM.
 * Only technical data is sent (no plate, nickname or owner); the plan is checked against the
 * current mileage and date, sorted, then saved on the vehicle.
 */
export async function generatePlan(user: AuthUser, vehicleId: string): Promise<{ plan: MaintenancePlan; generatedAt: Date }> {
  const vehicle = await findOwnedVehicle(user.id, vehicleId);
  const records = await MaintenanceRecordModel.find({ vehicle: vehicle._id }).sort({ date: -1 }).limit(MAX_RECORDS_FOR_PLAN);
  const today = todayInTunis();
  const context: PlanContext = {
    vehicle: {
      marque: vehicle.marque,
      modele: vehicle.modele,
      annee: vehicle.annee,
      kilometrage: vehicle.kilometrage,
      carburant: vehicle.carburant,
      usage: vehicle.usage ?? 'mixte',
    },
    records: records.map((r) => ({ date: r.date, kilometrage: r.kilometrage, intervention: r.intervention, categorie: r.categorie, notes: r.notes })),
    today,
  };

  const plan = await runAiTask('maintenance-plan', MAINTENANCE_SYSTEM_PROMPT, buildPlanMessage(context), planSchemaFor(vehicle.kilometrage, today), {
    mock: () => mockMaintenancePlan(context),
    knownNames: [user.name],
    temperature: 0.2,
    maxTokens: 6000,
  });
  plan.prochains_entretiens.sort((a, b) => a.echeance_date.localeCompare(b.echeance_date) || a.echeance_km - b.echeance_km);

  const generatedAt = new Date();
  vehicle.set({ lastPlan: plan, lastPlanAt: generatedAt });
  await vehicle.save();
  return { plan, generatedAt };
}
