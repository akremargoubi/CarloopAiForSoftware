import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ROLES } from '../constants.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ROLES, required: true, default: 'client' },
    // Only meaningful for "pro" accounts: an admin must approve them.
    proStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<User>;
export const UserModel = model('User', userSchema);

/** Public representation of a user (never exposes the password hash). */
export function toPublicUser(user: UserDoc) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    proStatus: user.proStatus ?? null,
    createdAt: user.createdAt,
  };
}
