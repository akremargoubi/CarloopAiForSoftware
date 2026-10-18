import { runAiTask, type ChatMessage } from '../../ai/index.js';
import { notFound } from '../../core/errors.js';
import type { AuthUser } from '../../core/types/express.js';
import { mockDiagnostic } from './mock.js';
import { ConversationModel, type ConversationDoc } from './model.js';
import { DIAGNOSTIC_SYSTEM_PROMPT, formatVehicleContext } from './prompt.js';
import { diagnosticSchema, type DiagnosticRequest, type DiagnosticResult } from './schema.js';

/** Number of messages (history + new one) sent to the LLM. */
export const MAX_CONTEXT_MESSAGES = 10;

type HistoryMessage = { role: 'user' | 'assistant'; content: string };

/** Keeps the last messages so that the new one is the 10th. */
export function buildContext(history: HistoryMessage[], newMessage: string, vehicleLine: string): ChatMessage[] {
  const recent = history.slice(-(MAX_CONTEXT_MESSAGES - 1));
  const messages: ChatMessage[] = recent.map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: newMessage });
  // The vehicle (brand / model / year) is not personal data: it is added to the first user message.
  const firstUser = messages.find((m) => m.role === 'user');
  if (firstUser && vehicleLine) firstUser.content = vehicleLine + firstUser.content;
  return messages;
}

export interface DiagnosticResponse {
  conversationId: string | null;
  diagnostic: DiagnosticResult;
}

/** Runs one turn of the diagnostic chat. Conversations are saved for logged-in users only. */
export async function diagnose(input: DiagnosticRequest, user: AuthUser | undefined): Promise<DiagnosticResponse> {
  let conversation: ConversationDoc | null = null;
  let history: HistoryMessage[] = input.historique ?? [];

  if (user && input.conversationId) {
    conversation = await ConversationModel.findOne({ _id: input.conversationId, user: user.id });
    if (!conversation) throw notFound('Conversation introuvable');
    history = conversation.messages.map((m) => ({ role: m.role, content: m.content }));
  }

  const storedVehicle = conversation?.vehicule;
  const vehicule =
    input.vehicule ??
    (storedVehicle?.marque
      ? { marque: storedVehicle.marque, modele: storedVehicle.modele ?? undefined, annee: storedVehicle.annee ?? undefined }
      : undefined);
  const messages = buildContext(history, input.message, formatVehicleContext(vehicule));

  const previousUserText = history
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');
  const diagnostic = await runAiTask('diagnostic', DIAGNOSTIC_SYSTEM_PROMPT, messages, diagnosticSchema, {
    mock: () => mockDiagnostic(input.message, previousUserText),
    knownNames: user ? [user.name] : [],
    temperature: 0.3,
  });

  if (!user) return { conversationId: null, diagnostic };

  if (!conversation) {
    conversation = new ConversationModel({ user: user.id, title: input.message.slice(0, 80), vehicule: input.vehicule });
  } else if (input.vehicule) {
    conversation.set('vehicule', input.vehicule);
  }
  // The assistant turn is stored as JSON so that the LLM keeps the same format in the next turns.
  conversation.messages.push(
    { role: 'user', content: input.message, createdAt: new Date() },
    { role: 'assistant', content: JSON.stringify(diagnostic), diagnostic, createdAt: new Date() },
  );
  await conversation.save();
  return { conversationId: conversation.id as string, diagnostic };
}

/** Lists the conversations of a user (most recent first). */
export async function listConversations(userId: string) {
  const conversations = await ConversationModel.find({ user: userId }).sort({ updatedAt: -1 }).limit(30);
  return conversations.map((c) => ({
    id: c.id as string,
    title: c.title,
    vehicule: c.vehicule ?? null,
    messagesCount: c.messages.length,
    updatedAt: c.updatedAt,
  }));
}

/** Returns one conversation of the user with its messages. */
export async function getConversation(userId: string, id: string) {
  const c = await ConversationModel.findOne({ _id: id, user: userId });
  if (!c) throw notFound('Conversation introuvable');
  return {
    id: c.id as string,
    title: c.title,
    vehicule: c.vehicule ?? null,
    updatedAt: c.updatedAt,
    messages: c.messages.map((m) => {
      const diagnostic = m.role === 'assistant' ? (m.diagnostic as DiagnosticResult) : null;
      return {
        role: m.role,
        content: diagnostic ? diagnostic.reponse : m.content,
        diagnostic,
        createdAt: m.createdAt,
      };
    }),
  };
}

/** Deletes one conversation of the user. */
export async function deleteConversation(userId: string, id: string) {
  const deleted = await ConversationModel.findOneAndDelete({ _id: id, user: userId });
  if (!deleted) throw notFound('Conversation introuvable');
}
