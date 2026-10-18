import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * One document per AI call. Contains only technical metadata:
 * never the prompt, the answer, nor any user identifier.
 */
const aiLogSchema = new Schema(
  {
    module: { type: String, required: true, index: true },
    success: { type: Boolean, required: true },
    errorCode: { type: String },
    durationMs: { type: Number, required: true },
    mock: { type: Boolean, default: false },
    model: { type: String },
    attempts: { type: Number, default: 1 },
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    totalTokens: { type: Number },
    piiMasked: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type AiLog = InferSchemaType<typeof aiLogSchema>;
export const AiLogModel = model('AiLog', aiLogSchema);
