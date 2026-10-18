import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { config } from '../../../core/config.js';
import { closeTestDb, connectTestDb, createProvider, resetAiConfig, testApp } from '../../../core/tests/helpers.js';

const app = testApp();

function llmReply(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeAll(async () => {
  await connectTestDb();
  await createProvider({ name: 'Vidange Ariana Eco', city: 'Ariana', categories: ['vidange'], price: 90 });
  await createProvider({ name: 'Vidange Ariana Premium', city: 'Ariana', categories: ['vidange'], price: 180 });
  await createProvider({ name: 'Lavage Sfax', city: 'Sfax', categories: ['lavage'], price: 20 });
});
afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
  resetAiConfig();
});

describe('POST /api/ai/search (mock mode)', () => {
  it('extracts the filters, queries MongoDB and ranks the results', async () => {
    const res = await request(app).post('/api/ai/search').send({ query: 'vidange pas chère près de l’Ariana samedi matin' });
    expect(res.status).toBe(200);
    expect(res.body.filtres).toMatchObject({ categorie: 'vidange', ville: 'Ariana', disponibilite: { jour: 'samedi', moment: 'matin' } });
    const names = res.body.resultats.map((r: { name: string }) => r.name);
    expect(names).toEqual(['Vidange Ariana Eco', 'Vidange Ariana Premium']);
    expect(res.body.resultats[0].justification).toContain('90 TND');
    expect(res.body.resultats[0].address).toBeDefined();
  });

  it('applies the budget and relaxes it when nothing matches', async () => {
    const strict = await request(app).post('/api/ai/search').send({ query: 'vidange ariana moins de 100 dt' });
    expect(strict.body.resultats.map((r: { name: string }) => r.name)).toEqual(['Vidange Ariana Eco']);
    const relaxed = await request(app).post('/api/ai/search').send({ query: 'vidange ariana moins de 50 dt' });
    expect(relaxed.body.filtres_assouplis).toEqual(['budget_max']);
    expect(relaxed.body.resultats).toHaveLength(2);
  });

  it('uses the manually edited filters without calling the extraction step', async () => {
    const res = await request(app)
      .post('/api/ai/search')
      .send({ query: 'vidange', filtres: { categorie: 'lavage', ville: 'Sfax' } });
    expect(res.status).toBe(200);
    expect(res.body.resultats.map((r: { name: string }) => r.name)).toEqual(['Lavage Sfax']);
  });

  it('returns 400 for an invalid body', async () => {
    const res = await request(app).post('/api/ai/search').send({ query: '' });
    expect(res.status).toBe(400);
  });

  it('returns 503 when the AI is not configured and the demo mode is off', async () => {
    config.ai.mock = false;
    const res = await request(app).post('/api/ai/search').send({ query: 'vidange ariana' });
    expect(res.status).toBe(503);
    expect(res.body.error).toEqual({ code: 'AI_NOT_CONFIGURED', message: 'Service IA non configuré' });
  });
});

describe('POST /api/ai/search (real LLM, stubbed)', () => {
  it('ignores providerIds that do not exist in the candidates', async () => {
    config.ai.apiKey = 'sk-test';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(llmReply({ categorie: 'lavage', ville: 'Sfax', budget_max: null, disponibilite: null, criteres: [] }))
      .mockImplementationOnce(async () =>
        llmReply({ resultats: [{ providerId: '65f000000000000000000000', justification: 'Inventé par le modèle' }] }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app).post('/api/ai/search').send({ query: 'lavage à Sfax' });
    expect(res.status).toBe(200);
    expect(res.body.resultats).toHaveLength(1);
    expect(res.body.resultats[0]).toMatchObject({ name: 'Lavage Sfax', justification: null });
    // The ranking prompt only contains public data.
    const rankingBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(rankingBody.messages[1].content).not.toContain('address');
    expect(rankingBody.messages[1].content).not.toContain('+216');
  });

  it('maps an upstream quota error to 429', async () => {
    config.ai.apiKey = 'sk-test';
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('{}', { status: 429, headers: { 'retry-after': '0' } })));
    const res = await request(app).post('/api/ai/search').send({ query: 'lavage à Sfax' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('AI_QUOTA_EXCEEDED');
  });
});
