CREATE TABLE fragrances (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity TEXT,
  size_ml REAL,
  concentration TEXT,
  image_url TEXT,
  source_url TEXT NOT NULL,
  image_license TEXT,
  image_credit TEXT,
  review_status TEXT NOT NULL,
  updated_at TEXT,
  search_text TEXT NOT NULL
);
CREATE INDEX fragrances_brand ON fragrances(brand);
CREATE INDEX fragrances_name ON fragrances(name);
CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
