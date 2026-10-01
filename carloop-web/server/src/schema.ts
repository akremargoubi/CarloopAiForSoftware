// Subset of the CarLoop class diagram needed by module M2 (catalogue, search, reviews).
// Utilisateur is reduced to a minimal `users` table: accounts/auth belong to M1.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id     SERIAL PRIMARY KEY,
  slug   TEXT UNIQUE NOT NULL,
  nom    TEXT NOT NULL,
  icone  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id     SERIAL PRIMARY KEY,
  nom    TEXT NOT NULL,
  email  TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS providers (
  id             SERIAL PRIMARY KEY,
  nom_atelier    TEXT NOT NULL,
  adresse        TEXT NOT NULL,
  latitude       DOUBLE PRECISION NOT NULL,
  longitude      DOUBLE PRECISION NOT NULL,
  horaires       JSONB NOT NULL DEFAULT '{}',
  description    TEXT NOT NULL DEFAULT '',
  photo_url      TEXT,
  est_valide     BOOLEAN NOT NULL DEFAULT false,
  est_disponible BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS prestations (
  id             SERIAL PRIMARY KEY,
  provider_id    INT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id    INT NOT NULL REFERENCES categories(id),
  nom            TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  prix           NUMERIC(10,2) NOT NULL CHECK (prix >= 0),
  duree_estimee  INT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id           SERIAL PRIMARY KEY,
  provider_id  INT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note         SMALLINT NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, user_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id  INT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_prestations_provider ON prestations(provider_id);
CREATE INDEX IF NOT EXISTS idx_prestations_category ON prestations(category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
`;
