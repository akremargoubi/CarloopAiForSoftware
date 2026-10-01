import { pool } from './db.js';

export interface ListParams {
  category?: string;
  q?: string;
  maxPrice?: number;
  minRating?: number;
  maxDistance?: number;
  available: boolean;
  favoritesOnly: boolean;
  sort: 'distance' | 'price' | 'rating';
  lat: number;
  lng: number;
}

// Great-circle distance in km between ($1,$2) and the provider.
const DISTANCE_SQL = `
  6371 * acos(least(1, greatest(-1,
    cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
    + sin(radians($1)) * sin(radians(p.latitude))
  )))`;

const ORDER_BY = {
  distance: 'distance_km ASC',
  price: 'prix_depart ASC, distance_km ASC',
  rating: 'note_moyenne DESC, nb_avis DESC, distance_km ASC',
} as const;

export async function listProviders(p: ListParams, userId: number) {
  const params: unknown[] = [p.lat, p.lng, userId];
  const bind = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  // Starting price is computed on the selected category only (or on all services).
  let categoryClause = '';
  if (p.category) {
    const cat = await pool.query('SELECT id FROM categories WHERE slug = $1', [p.category]);
    if (cat.rowCount === 0) return [];
    categoryClause = `AND pr.category_id = ${bind(cat.rows[0].id)}`;
  }

  const like = p.q ? bind(`%${p.q}%`) : null;
  const qClause = like
    ? `AND (p.nom_atelier ILIKE ${like} OR EXISTS (
         SELECT 1 FROM prestations s
         WHERE s.provider_id = p.id AND (s.nom ILIKE ${like} OR s.description ILIKE ${like})))`
    : '';

  const outer: string[] = ['prix_depart IS NOT NULL'];
  if (p.maxPrice !== undefined) outer.push(`prix_depart <= ${bind(p.maxPrice)}`);
  if (p.minRating !== undefined) outer.push(`note_moyenne >= ${bind(p.minRating)}`);
  if (p.maxDistance !== undefined) outer.push(`distance_km <= ${bind(p.maxDistance)}`);
  if (p.available) outer.push('est_disponible = true');
  if (p.favoritesOnly) outer.push('est_favori = true');

  const sql = `
    WITH base AS (
      SELECT
        p.id, p.nom_atelier, p.adresse, p.latitude, p.longitude,
        p.horaires, p.photo_url, p.est_disponible,
        (SELECT MIN(pr.prix) FROM prestations pr
           WHERE pr.provider_id = p.id ${categoryClause})::float8 AS prix_depart,
        COALESCE((SELECT ROUND(AVG(r.note), 1) FROM reviews r WHERE r.provider_id = p.id), 0)::float8
          AS note_moyenne,
        (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id)::int AS nb_avis,
        (${DISTANCE_SQL})::float8 AS distance_km,
        EXISTS (SELECT 1 FROM favorites f WHERE f.provider_id = p.id AND f.user_id = $3) AS est_favori
      FROM providers p
      WHERE p.est_valide = true ${qClause}
    )
    SELECT * FROM base
    WHERE ${outer.join(' AND ')}
    ORDER BY ${ORDER_BY[p.sort]}`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getProvider(id: number, userId: number, lat: number, lng: number) {
  const { rows } = await pool.query(
    `SELECT p.id, p.nom_atelier, p.adresse, p.latitude, p.longitude, p.horaires,
            p.description, p.photo_url, p.est_disponible,
            COALESCE((SELECT ROUND(AVG(r.note), 1) FROM reviews r WHERE r.provider_id = p.id), 0)::float8
              AS note_moyenne,
            (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id)::int AS nb_avis,
            (${DISTANCE_SQL})::float8 AS distance_km,
            EXISTS (SELECT 1 FROM favorites f WHERE f.provider_id = p.id AND f.user_id = $3) AS est_favori
     FROM providers p WHERE p.id = $4 AND p.est_valide = true`,
    [lat, lng, userId, id],
  );
  if (rows.length === 0) return null;

  const prestations = await pool.query(
    `SELECT s.id, s.nom, s.description, s.prix::float8 AS prix, s.duree_estimee,
            c.slug AS category_slug, c.nom AS category_nom
     FROM prestations s JOIN categories c ON c.id = s.category_id
     WHERE s.provider_id = $1 ORDER BY c.id, s.prix`,
    [id],
  );
  return { ...rows[0], prestations: prestations.rows };
}
