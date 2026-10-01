// @ts-check
// Page de démonstration CarLoop : appelle l'API réelle (même origine). Aucune dépendance.
'use strict';

const API = '/api';
const EXAMPLES = [
  'bruit quand je freine',
  "voiture en panne sur l'autoroute",
  'lavage intérieur avant de vendre ma voiture',
  'la clim sent le moisi',
  'ma voiture est couverte de poussière après le sirocco',
  'pneu crevé',
  'recette de couscous',
];
/** @type {Record<string, string>} */
const CATEGORY_LABELS = {
  LAVAGE: 'Lavage', VIDANGE: 'Vidange', PNEUS: 'Pneus', CLIM: 'Clim', ELECTRICITE: 'Électricité',
  CARROSSERIE: 'Carrosserie', MECANIQUE: 'Mécanique', DEPANNAGE: 'Dépannage',
};
/** @type {Record<string, string>} */
const FALLBACK_LABELS = {
  requested: 'forcé pour comparaison',
  model_unavailable: 'modèle indisponible',
  model_error: 'erreur / timeout du modèle',
};
/** @type {Record<string, string>} */
const STATUS_LABELS = { PENDING: 'En attente', CONFIRMED: 'Confirmée', DONE: 'Terminée', CANCELLED: 'Annulée' };

/**
 * @typedef {{ code: string, message: string, details?: { path: string, message: string }[] }} ApiError
 * @typedef {{ id: string, name: string, city: string }} GarageRef
 * @typedef {{ id: string, title: string, description: string, category: string, price: number, durationMinutes: number, garage: GarageRef }} Service
 * @typedef {{ score: number, service: Service }} SearchHit
 * @typedef {{ mode: 'semantic' | 'keyword', minScore?: number, fallbackReason?: string, results: SearchHit[] }} SearchResponse
 * @typedef {{ email: string, firstName: string, role: string }} User
 * @typedef {{ id: string, status: string, scheduledAt: string, note: string | null,
 *   client: { firstName: string, lastName: string }, service: { title: string, garage: GarageRef } }} Reservation
 * @typedef {{ status: number, data: unknown, error: ApiError | null }} ApiResult
 */

/** @type {{ token: string | null, user: User | null }} */
const session = { token: null, user: null };

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément #${id} introuvable`);
  return element;
}

/**
 * Crée un élément avec classe et texte (jamais d'innerHTML : pas d'injection possible).
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** @param {string} line */
function log(line) {
  const box = byId('log');
  box.textContent = `${new Date().toLocaleTimeString('fr-FR')}  ${line}\n${box.textContent}`.slice(0, 4000);
}

/**
 * Appelle l'API et journalise la requête (visible pendant la démo).
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 * @returns {Promise<ApiResult>} `data` est à typer par l'appelant ; `error` est renseigné si la réponse est une erreur.
 */
async function api(method, path, body) {
  /** @type {Record<string, string>} */
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  /** @type {unknown} */
  const data = response.status === 204 ? null : await response.json();
  const error = response.ok ? null : /** @type {{ error: ApiError }} */ (data).error;
  const message = error ? ` — ${error.code}: ${error.message}` : '';
  log(`${method} ${API}${decodeURIComponent(path)} → ${response.status}${message}`);
  return { status: response.status, data, error };
}

// ---------- Statut du modèle ----------

async function refreshHealth() {
  const badge = byId('model-status');
  try {
    const response = await fetch(`${API}/health`);
    const data = await response.json();
    const state = data.embeddingModel;
    badge.textContent = `Modèle : ${state === 'ready' ? 'prêt (local)' : state}`;
    badge.className = `status ${state === 'ready' ? 'ready' : state === 'loading' || state === 'idle' ? '' : 'down'}`;
    if (state === 'loading' || state === 'idle') setTimeout(refreshHealth, 2000);
  } catch {
    badge.textContent = 'API injoignable';
    badge.className = 'status down';
  }
}

// ---------- Recherche ----------

/**
 * @param {SearchHit} hit
 * @param {'semantic' | 'keyword'} mode
 */
function renderCard(hit, mode) {
  const service = hit.service;
  const card = el('article', `card ${mode}`);

  const top = el('div', 'card-top');
  top.append(el('h4', '', service.title), el('span', 'badge', CATEGORY_LABELS[service.category] ?? service.category));
  card.append(top, el('p', '', service.description));

  const score = el('div', 'score');
  const bar = el('div', 'bar');
  const fill = el('span');
  fill.style.width = `${Math.max(0, Math.min(1, hit.score)) * 100}%`;
  bar.append(fill);
  score.append(el('span', '', mode === 'semantic' ? 'cosinus' : 'mots trouvés'), bar, el('strong', '', hit.score.toFixed(3)));
  card.append(score);

  const foot = el('div', 'card-foot');
  foot.append(
    el('span', '', `${service.garage.name} · ${service.garage.city} · ${service.price} TND · ${service.durationMinutes} min`),
  );
  if (session.user?.role === 'CLIENT') {
    const book = el('button', 'secondary', 'Réserver demain 10h');
    book.addEventListener('click', () => void reserve(service.id, /** @type {HTMLButtonElement} */ (book)));
    foot.append(book);
  }
  card.append(foot);
  return card;
}

/**
 * @param {HTMLElement} column
 * @param {SearchResponse} data
 */
function renderColumn(column, data) {
  column.replaceChildren();
  const head = el('div', 'column-head');
  const title = el('h3', '', data.mode === 'semantic' ? 'Recherche sémantique (IA)' : 'Recherche par mots-clés');
  const badge = el('span', `mode ${data.mode}`, data.mode);
  title.append(' ', badge);
  const meta =
    data.mode === 'semantic'
      ? `seuil de pertinence : ${data.minScore}`
      : `raison : ${FALLBACK_LABELS[data.fallbackReason ?? ''] ?? data.fallbackReason}`;
  head.append(title, el('span', 'meta', meta));
  column.append(head);

  if (data.results.length === 0) {
    column.append(
      el('p', 'empty', data.mode === 'semantic' ? 'Aucun service au-dessus du seuil de pertinence.' : 'Aucun mot-clé trouvé.'),
    );
    return;
  }
  for (const hit of data.results) column.append(renderCard(hit, data.mode));
}

/** @type {{ q: string, ville: string, limit: string } | null} */
let lastSearch = null;

async function search() {
  const q = /** @type {HTMLInputElement} */ (byId('q')).value;
  const ville = /** @type {HTMLInputElement} */ (byId('ville')).value.trim();
  const limit = /** @type {HTMLSelectElement} */ (byId('limit')).value;
  const compare = /** @type {HTMLInputElement} */ (byId('compare')).checked;
  lastSearch = { q, ville, limit };

  const params = new URLSearchParams({ q, limit });
  if (ville) params.set('ville', ville);
  const errorBox = byId('search-error');
  errorBox.hidden = true;

  const [semantic, keyword] = await Promise.all([
    api('GET', `/services/search?${params}`),
    compare ? api('GET', `/services/search?${params}&mode=keyword`) : Promise.resolve(null),
  ]);
  if (semantic.error) {
    errorBox.textContent = semantic.error.details?.[0]?.message ?? semantic.error.message;
    errorBox.hidden = false;
    return;
  }
  byId('results').className = compare ? 'columns' : 'columns single';
  renderColumn(byId('col-semantic'), /** @type {SearchResponse} */ (semantic.data));
  if (keyword && !keyword.error) renderColumn(byId('col-keyword'), /** @type {SearchResponse} */ (keyword.data));
}

// ---------- Authentification ----------

async function login() {
  const email = /** @type {HTMLSelectElement} */ (byId('email')).value;
  const password = /** @type {HTMLInputElement} */ (byId('password')).value;
  const errorBox = byId('auth-error');
  errorBox.hidden = true;
  const { data, error } = await api('POST', '/auth/login', { email, password });
  if (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    return;
  }
  const auth = /** @type {{ token: string, user: User }} */ (data);
  session.token = auth.token;
  session.user = auth.user;
  renderSession();
  await loadReservations();
  if (lastSearch) await search();
}

function logout() {
  session.token = null;
  session.user = null;
  renderSession();
  byId('reservations').replaceChildren();
  if (lastSearch) void search();
}

function renderSession() {
  const loggedIn = session.user !== null;
  byId('login-form').hidden = loggedIn;
  byId('session').hidden = !loggedIn;
  if (session.user) {
    byId('session-user').textContent = `${session.user.firstName} (${session.user.email})`;
    byId('session-role').textContent = session.user.role;
  }
}

// ---------- Réservations ----------

/** Demain à 10h, au format ISO 8601 avec le fuseau local. */
function tomorrowAtTen() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const pad = (/** @type {number} */ n) => String(Math.abs(n)).padStart(2, '0');
  const local = new Date(date.getTime() + offset * 60000).toISOString().slice(0, 19);
  return `${local}${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
}

/**
 * @param {string} serviceId
 * @param {HTMLButtonElement} button
 */
async function reserve(serviceId, button) {
  button.disabled = true;
  const { status } = await api('POST', '/reservations', { serviceId, scheduledAt: tomorrowAtTen(), note: 'Réservation depuis la démo' });
  button.textContent = status === 201 ? 'Réservé ✓' : 'Erreur';
  await loadReservations();
}

/**
 * @param {string} id
 * @param {string} status
 */
async function changeStatus(id, status) {
  await api('PATCH', `/reservations/${id}/status`, { status });
  await loadReservations();
}

/**
 * Actions proposées selon le rôle. Le bouton « (interdit) » montre volontairement le 403.
 * @param {Reservation} reservation
 * @returns {{ label: string, status: string, style: string }[]}
 */
function actionsFor(reservation) {
  const role = session.user?.role;
  if (role === 'CLIENT') {
    return reservation.status === 'PENDING'
      ? [
          { label: 'Annuler', status: 'CANCELLED', style: 'danger' },
          { label: 'Confirmer (interdit → 403)', status: 'CONFIRMED', style: 'secondary' },
        ]
      : [];
  }
  if (reservation.status === 'PENDING') {
    return [
      { label: 'Confirmer', status: 'CONFIRMED', style: '' },
      { label: 'Refuser', status: 'CANCELLED', style: 'danger' },
    ];
  }
  if (reservation.status === 'CONFIRMED') {
    return [
      { label: 'Terminer', status: 'DONE', style: '' },
      { label: 'Annuler', status: 'CANCELLED', style: 'danger' },
      { label: 'Revenir en attente (→ 409)', status: 'PENDING', style: 'secondary' },
    ];
  }
  return [];
}

async function loadReservations() {
  const container = byId('reservations');
  if (!session.token) {
    container.replaceChildren();
    return;
  }
  const { data: raw, error } = await api('GET', '/reservations/mine');
  container.replaceChildren();
  if (error) return;
  const data = /** @type {{ items: Reservation[] }} */ (raw);

  const isClient = session.user?.role === 'CLIENT';
  container.append(
    el('h3', '', isClient ? 'Mes réservations (uniquement les miennes)' : 'Réservations sur mes garages (uniquement les miens)'),
  );
  if (data.items.length === 0) {
    container.append(el('p', 'empty', 'Aucune réservation.'));
    return;
  }
  const table = el('table');
  const header = el('tr');
  for (const label of ['Service', 'Garage', 'Date', isClient ? 'Note' : 'Client', 'Statut', 'Actions']) {
    header.append(el('th', '', label));
  }
  table.append(header);

  for (const reservation of data.items) {
    const row = el('tr');
    const date = new Date(reservation.scheduledAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    row.append(
      el('td', '', reservation.service.title),
      el('td', '', `${reservation.service.garage.name} (${reservation.service.garage.city})`),
      el('td', '', date),
      el('td', '', isClient ? (reservation.note ?? '') : `${reservation.client.firstName} ${reservation.client.lastName}`),
      el('td', `status-${reservation.status}`, STATUS_LABELS[reservation.status] ?? reservation.status),
    );
    const actions = el('div', 'actions');
    for (const action of actionsFor(reservation)) {
      const button = el('button', action.style, action.label);
      button.addEventListener('click', () => void changeStatus(reservation.id, action.status));
      actions.append(button);
    }
    const cell = el('td');
    cell.append(actions);
    row.append(cell);
    table.append(row);
  }
  container.append(table);
}

// ---------- Initialisation ----------

function init() {
  const examples = byId('examples');
  for (const example of EXAMPLES) {
    const chip = el('button', 'chip', example);
    chip.setAttribute('type', 'button');
    chip.addEventListener('click', () => {
      /** @type {HTMLInputElement} */ (byId('q')).value = example;
      void search();
    });
    examples.append(chip);
  }
  byId('search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void search();
  });
  byId('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void login();
  });
  byId('logout').addEventListener('click', logout);
  byId('compare').addEventListener('change', () => {
    if (lastSearch) void search();
  });
  void refreshHealth();

  // Lien direct vers une recherche : /demo/?q=bruit%20quand%20je%20freine&ville=Sousse
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q');
  if (initialQuery) {
    /** @type {HTMLInputElement} */ (byId('q')).value = initialQuery;
    /** @type {HTMLInputElement} */ (byId('ville')).value = params.get('ville') ?? '';
    void search();
  }
}

init();
