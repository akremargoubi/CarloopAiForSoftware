import request from 'supertest';
import { prisma } from '../src/config/prisma';
import { embeddingService } from '../src/services/embedding.service';
import { cosineSimilarity } from '../src/services/search.service';
import { app, bearer, createUser, resetDatabase } from './helpers';

// Le vrai modèle n'est JAMAIS chargé en test : le service d'embeddings est entièrement mocké.
jest.mock('../src/services/embedding.service', () => ({
  EmbeddingUnavailableError: class EmbeddingUnavailableError extends Error {},
  embeddingService: {
    init: jest.fn(),
    isReady: jest.fn(),
    embed: jest.fn(),
    embedBatch: jest.fn(),
    getStatus: jest.fn(() => 'ready'),
    getModelName: jest.fn(() => 'mock-model'),
  },
}));

const mockedEmbedding = jest.mocked(embeddingService);

/** Axes « sémantiques » factices : chaque axe regroupe des mots d'un même concept. */
const CONCEPTS: readonly RegExp[] = [/frein|plaquette/g, /lavage|nettoy|propre/g, /clim|froid/g, /pneu|crevaison/g];

/** Embedding factice déterministe : histogramme de concepts, normalisé L2. */
async function fakeEmbed(text: string): Promise<number[]> {
  const counts = CONCEPTS.map((concept) => (text.toLowerCase().match(concept) ?? []).length);
  const norm = Math.sqrt(counts.reduce((sum, value) => sum + value * value, 0)) || 1;
  return counts.map((value) => value / norm);
}

interface SearchBody {
  mode: 'semantic' | 'keyword';
  fallbackReason?: string;
  results: { score: number; service: { title: string; category: string; garage: { city: string } } }[];
}

beforeAll(async () => {
  mockedEmbedding.isReady.mockReturnValue(true);
  mockedEmbedding.embed.mockImplementation(fakeEmbed);

  await resetDatabase();
  const pro = await createUser('PRO');
  const createGarage = async (city: string): Promise<string> => {
    const res = await request(app)
      .post('/api/garages')
      .set(...bearer(pro))
      .send({ name: `Garage ${city}`, address: '1 rue de test', city, description: 'Garage de test multiservices.' });
    return (res.body as { id: string }).id;
  };
  const tunis = await createGarage('Tunis');
  const sfax = await createGarage('Sfax');
  const services = [
    { garageId: tunis, category: 'MECANIQUE', title: 'Remplacement plaquettes de frein', description: 'Plaquettes et disques de frein, purge.' },
    { garageId: tunis, category: 'LAVAGE', title: 'Lavage complet', description: 'Nettoyage intérieur et extérieur.' },
    { garageId: sfax, category: 'CLIM', title: 'Recharge climatisation', description: 'Recharge de gaz, la clim souffle froid.' },
  ];
  for (const service of services) {
    await request(app)
      .post('/api/services')
      .set(...bearer(pro))
      .send({ ...service, price: 100, durationMinutes: 60 });
  }
});

beforeEach(() => {
  mockedEmbedding.isReady.mockReturnValue(true);
  mockedEmbedding.embed.mockImplementation(fakeEmbed);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/services/search', () => {
  it('stocke un embedding à la création des services', async () => {
    const indexed = await prisma.service.count({ where: { NOT: { embedding: { isEmpty: true } } } });
    expect(indexed).toBe(3);
  });

  it('renvoie le service pertinent en mode sémantique, avec son score et sans embedding', async () => {
    const res = await request(app).get('/api/services/search').query({ q: 'bruit quand je freine' });
    const body = res.body as SearchBody;

    expect(res.status).toBe(200);
    expect(body.mode).toBe('semantic');
    expect(body.results[0]?.service.title).toBe('Remplacement plaquettes de frein');
    expect(body.results[0]?.score).toBeGreaterThan(0.9);
    // Les services non pertinents (score sous le seuil) ne sont pas renvoyés.
    expect(body.results).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('embedding');
  });

  it('applique le filtre ville', async () => {
    const inSfax = await request(app).get('/api/services/search').query({ q: 'la clim ne fait plus de froid', ville: 'sfax' });
    const inTunis = await request(app).get('/api/services/search').query({ q: 'la clim ne fait plus de froid', ville: 'Tunis' });

    expect((inSfax.body as SearchBody).results[0]?.service.category).toBe('CLIM');
    expect((inTunis.body as SearchBody).results).toHaveLength(0);
  });

  it.each([
    ['vide', { q: '' }],
    ['composée d’espaces', { q: '   ' }],
    ['absente', {}],
    ['trop longue (> 300 caractères)', { q: 'a'.repeat(301) }],
  ])('refuse une requête %s (400)', async (_label, query) => {
    const res = await request(app).get('/api/services/search').query(query);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockedEmbedding.embed).not.toHaveBeenCalled();
  });

  it('bascule en recherche par mots-clés quand le modèle est indisponible', async () => {
    mockedEmbedding.isReady.mockReturnValue(false);

    const res = await request(app).get('/api/services/search').query({ q: 'plaquettes de frein' });
    const body = res.body as SearchBody;

    expect(res.status).toBe(200);
    expect(body.mode).toBe('keyword');
    expect(body.fallbackReason).toBe('model_unavailable');
    expect(body.results[0]?.service.title).toBe('Remplacement plaquettes de frein');
    expect(mockedEmbedding.embed).not.toHaveBeenCalled();
  });

  it('force la recherche par mots-clés avec mode=keyword (comparaison)', async () => {
    const res = await request(app).get('/api/services/search').query({ q: 'plaquettes de frein', mode: 'keyword' });
    const body = res.body as SearchBody;

    expect(body.mode).toBe('keyword');
    expect(body.fallbackReason).toBe('requested');
    expect(mockedEmbedding.embed).not.toHaveBeenCalled();
  });

  it('bascule en mots-clés si le calcul de l’embedding échoue (ex. timeout)', async () => {
    mockedEmbedding.embed.mockRejectedValue(new Error('Délai dépassé (3000 ms)'));

    const res = await request(app).get('/api/services/search').query({ q: 'lavage complet' });
    const body = res.body as SearchBody;

    expect(res.status).toBe(200);
    expect(body.mode).toBe('keyword');
    expect(body.fallbackReason).toBe('model_error');
    expect(body.results[0]?.service.category).toBe('LAVAGE');
  });
});

describe('cosineSimilarity', () => {
  it('vaut 1 pour des vecteurs colinéaires, 0 pour des vecteurs orthogonaux ou incompatibles', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });
});
