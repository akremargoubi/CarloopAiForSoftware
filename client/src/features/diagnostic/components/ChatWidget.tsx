import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { AiErrorDisplay } from '@/core/components/AiErrorDisplay';
import { AiLoader, Spinner } from '@/core/components/Loader';
import { formatDateTime } from '@/core/constants';
import {
  fetchConversation,
  useConversations,
  useDeleteConversation,
  useSendDiagnostic,
  type ChatMessage,
  type VehicleContext,
} from '../api';
import { DiagnosticCard } from './DiagnosticCard';

const WELCOME =
  'Bonjour ! Décrivez le symptôme de votre véhicule (bruit, voyant, fuite, odeur…). Je vous indique les causes probables et le bon professionnel.';

/** Floating diagnostic chat, rendered on every page (global widget). */
export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [showVehicle, setShowVehicle] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleContext>({});
  const [loadingConversation, setLoadingConversation] = useState(false);
  const send = useSendDiagnostic();
  const conversations = useConversations(Boolean(user) && open && view === 'history');
  const remove = useDeleteConversation();
  const endRef = useRef<HTMLDivElement>(null);

  // A new session (login / logout) starts a fresh conversation.
  useEffect(() => {
    setMessages([]);
    setConversationId(undefined);
  }, [user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, send.isPending]);

  const vehiclePayload = (): VehicleContext | undefined => {
    const v: VehicleContext = {};
    if (vehicle.marque?.trim()) v.marque = vehicle.marque.trim();
    if (vehicle.modele?.trim()) v.modele = vehicle.modele.trim();
    if (vehicle.annee) v.annee = vehicle.annee;
    return Object.keys(v).length ? v : undefined;
  };

  const sendMessage = (text: string, history: ChatMessage[]) => {
    send.mutate(
      {
        message: text,
        conversationId: user ? conversationId : undefined,
        vehicule: vehiclePayload(),
        // Visitors: the browser keeps the history (last 10 messages are used by the server).
        historique: user
          ? undefined
          : history.slice(-10).map((m) => ({ role: m.role, content: m.diagnostic ? JSON.stringify(m.diagnostic) : m.content })),
      },
      {
        onSuccess: (res) => {
          if (res.conversationId) setConversationId(res.conversationId);
          setMessages((list) => [...list, { role: 'assistant', content: res.diagnostic.reponse, diagnostic: res.diagnostic }]);
        },
      },
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (text.length < 3 || send.isPending) return;
    const history = messages;
    setMessages([...history, { role: 'user', content: text, diagnostic: null }]);
    setInput('');
    sendMessage(text, history);
  };

  const retry = () => {
    const last = messages.at(-1);
    if (last?.role === 'user') sendMessage(last.content, messages.slice(0, -1));
  };

  const newConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    send.reset();
    setView('chat');
  };

  const openConversation = async (id: string) => {
    setLoadingConversation(true);
    try {
      const { conversation } = await fetchConversation(id);
      setMessages(conversation.messages);
      setConversationId(conversation.id);
      setVehicle(conversation.vehicule ?? {});
      send.reset();
      setView('chat');
    } finally {
      setLoadingConversation(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Fermer l’assistant diagnostic' : 'Ouvrir l’assistant diagnostic'}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary-500 px-4 py-3 font-semibold text-white shadow-lg ring-4 ring-primary-100 hover:bg-primary-600 sm:bottom-6 sm:right-6"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          {open ? (
            <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12c0 4.4-4 8-9 8a9.9 9.9 0 0 1-4-.8L3 20l1.3-3.9A7.6 7.6 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
          )}
        </svg>
        <span className="hidden sm:inline">{open ? 'Fermer' : 'Diagnostic IA'}</span>
      </button>

      {open && (
        <section
          className="fixed inset-x-2 bottom-20 z-40 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[400px]"
          aria-label="Assistant diagnostic"
        >
          <header className="flex items-center justify-between bg-primary-600 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">Assistant diagnostic</p>
              <p className="text-xs text-primary-100">Indicatif, ne remplace pas un mécanicien</p>
            </div>
            <div className="flex gap-1 text-xs">
              {user && (
                <button type="button" onClick={() => setView(view === 'chat' ? 'history' : 'chat')} className="rounded-md px-2 py-1 hover:bg-white/15">
                  {view === 'chat' ? 'Historique' : 'Retour'}
                </button>
              )}
              <button type="button" onClick={newConversation} className="rounded-md px-2 py-1 hover:bg-white/15">
                Nouveau
              </button>
            </div>
          </header>

          {view === 'history' ? (
            <div className="flex-1 overflow-y-auto p-3">
              {conversations.isLoading || loadingConversation ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : conversations.data?.conversations.length ? (
                <ul className="space-y-2">
                  {conversations.data.conversations.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 hover:border-primary-300">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openConversation(c.id)}>
                        <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(c.updatedAt)} · {c.messagesCount} messages
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          remove.mutate(c.id);
                          if (c.id === conversationId) newConversation();
                        }}
                        className="rounded p-1 text-xs text-red-600 hover:bg-red-50"
                        aria-label="Supprimer la conversation"
                      >
                        Suppr.
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">Aucune conversation enregistrée.</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-slate-700 shadow-sm">{WELCOME}</div>
                {messages.map((m, i) =>
                  m.role === 'user' ? (
                    <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary-500 px-3 py-2 text-sm text-white">
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="max-w-[95%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm">
                      {m.diagnostic ? <DiagnosticCard diagnostic={m.diagnostic} onNavigate={() => setOpen(false)} /> : <p className="text-sm">{m.content}</p>}
                    </div>
                  ),
                )}
                {send.isPending && <AiLoader label="Analyse du symptôme…" />}
                {send.error && <AiErrorDisplay error={send.error} onRetry={retry} />}
                <div ref={endRef} />
              </div>

              <div className="border-t border-slate-200 p-3">
                <button type="button" onClick={() => setShowVehicle((s) => !s)} className="mb-2 text-xs font-medium text-primary-600 hover:underline">
                  {showVehicle ? 'Masquer le véhicule' : 'Préciser le véhicule (optionnel)'}
                </button>
                {showVehicle && (
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    <input
                      aria-label="Marque"
                      placeholder="Marque"
                      value={vehicle.marque ?? ''}
                      onChange={(e) => setVehicle({ ...vehicle, marque: e.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      aria-label="Modèle"
                      placeholder="Modèle"
                      value={vehicle.modele ?? ''}
                      onChange={(e) => setVehicle({ ...vehicle, modele: e.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      aria-label="Année"
                      placeholder="Année"
                      type="number"
                      min={1950}
                      max={new Date().getFullYear() + 1}
                      value={vehicle.annee ?? ''}
                      onChange={(e) => setVehicle({ ...vehicle, annee: e.target.value ? Number(e.target.value) : undefined })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                )}
                <form onSubmit={onSubmit} className="flex gap-2">
                  <label htmlFor="diag-input" className="sr-only">
                    Votre message
                  </label>
                  <input
                    id="diag-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={1000}
                    placeholder="Ex. : bruit métallique en freinant"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <button
                    type="submit"
                    disabled={send.isPending || input.trim().length < 3}
                    className="rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
                  >
                    Envoyer
                  </button>
                </form>
                {!user && <p className="mt-2 text-[11px] text-slate-500">Connectez-vous pour sauvegarder vos conversations.</p>}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
