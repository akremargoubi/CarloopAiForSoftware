import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    // Structured diagnosis attached to assistant messages.
    diagnostic: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

/** Diagnostic conversation saved for logged-in users. */
const conversationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 80 },
    vehicule: {
      marque: String,
      modele: String,
      annee: Number,
    },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

export type Conversation = InferSchemaType<typeof conversationSchema>;
export type ConversationDoc = HydratedDocument<Conversation>;
export const ConversationModel = model('Conversation', conversationSchema);
