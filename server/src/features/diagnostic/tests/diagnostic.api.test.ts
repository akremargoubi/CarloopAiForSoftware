import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { config } from '../../../core/config.js';
import { closeTestDb, connectTestDb, createUser, resetAiConfig, testApp } from '../../../core/tests/helpers.js';

const app = testApp();

beforeAll(connectTestDb);
afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
  resetAiConfig();
});

describe('POST /api/ai/diagnostic (mock mode)', () => {
  it('answers a visitor without saving the conversation', async () => {
    const res = await request(app).post('/api/ai/diagnostic').send({ message: 'J’entends un bruit quand je freine' });
    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBeNull();
    expect(res.body.diagnostic).toMatchObject({ urgence: 'critique', service_recommande: 'mecanique' });
  });

  it('saves a multi-turn conversation for a logged-in user', async () => {
    const { auth } = await createUser('client');
    const first = await request(app)
      .post('/api/ai/diagnostic')
      .set(auth)
      .send({ message: 'Ma voiture ne démarre pas le matin', vehicule: { marque: 'Kia', modele: 'Picanto', annee: 2016 } });
    expect(first.status).toBe(200);
    const id = first.body.conversationId;
    expect(id).toBeTypeOf('string');

    const second = await request(app).post('/api/ai/diagnostic').set(auth).send({ message: 'Oui, surtout à froid', conversationId: id });
    expect(second.status).toBe(200);
    // Demo mode falls back on the previous messages: still a battery issue.
    expect(second.body.diagnostic.service_recommande).toBe('electricite');

    const list = await request(app).get('/api/diagnostic/conversations').set(auth);
    expect(list.body.conversations).toHaveLength(1);
    expect(list.body.conversations[0]).toMatchObject({ messagesCount: 4, vehicule: { marque: 'Kia' } });

    const detail = await request(app).get(`/api/diagnostic/conversations/${id}`).set(auth);
    expect(detail.body.conversation.messages[1].diagnostic.service_recommande).toBe('electricite');

    expect((await request(app).delete(`/api/diagnostic/conversations/${id}`).set(auth)).status).toBe(204);
  });

  it('prevents access to the conversation of another user', async () => {
    const owner = await createUser('client');
    const other = await createUser('client');
    const res = await request(app).post('/api/ai/diagnostic').set(owner.auth).send({ message: 'Fuite d’huile sous la voiture' });
    const id = res.body.conversationId;
    expect((await request(app).get(`/api/diagnostic/conversations/${id}`).set(other.auth)).status).toBe(404);
    expect((await request(app).post('/api/ai/diagnostic').set(other.auth).send({ message: 'suite', conversationId: id })).status).toBe(404);
  });

  it('requires authentication for the history', async () => {
    expect((await request(app).get('/api/diagnostic/conversations')).status).toBe(401);
  });
});

describe('POST /api/ai/diagnostic (real LLM, stubbed)', () => {
  it('anonymizes the user data and sends at most 10 messages', async () => {
    config.ai.apiKey = 'sk-test';
    const answer = {
      reponse: 'Probablement la batterie.',
      causes_probables: [{ cause: 'Batterie faible', probabilite: 'elevee' }],
      urgence: 'moyenne',
      service_recommande: 'electricite',
      conseil_securite: 'Faites tester la batterie.',
    };
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '```json\n' + JSON.stringify(answer) + '\n```' } }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { auth } = await createUser('client', { name: 'Nour Hamdi' });
    const historique = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `message ${i}` }));
    const res = await request(app)
      .post('/api/ai/diagnostic')
      .set(auth)
      .send({ message: 'Je suis Nour Hamdi (98 123 456), ma voiture 145 TU 2020 ne démarre pas', historique });
    expect(res.status).toBe(200);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(11); // system prompt + 10 messages
    const last = body.messages.at(-1).content;
    expect(last).toBe('Je suis [NOM] ([TELEPHONE]), ma voiture [PLAQUE] ne démarre pas');
  });

  it('returns 502 when the LLM keeps answering with an invalid format', async () => {
    config.ai.apiKey = 'sk-test';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"reponse":"ok"}' } }] }), { status: 200 })),
    );
    const res = await request(app).post('/api/ai/diagnostic').send({ message: 'bruit moteur' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_OUTPUT');
  });

  it('returns 504 on timeout', async () => {
    config.ai.apiKey = 'sk-test';
    config.ai.timeoutMs = 20;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
          }),
      ),
    );
    const res = await request(app).post('/api/ai/diagnostic').send({ message: 'bruit moteur' });
    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('AI_TIMEOUT');
  });
});
