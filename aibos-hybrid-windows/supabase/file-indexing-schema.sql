-- File Indexing Schema for Supabase

-- File metadata table
CREATE TABLE file_metadata (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  type TEXT CHECK (type IN ('file', 'directory')) NOT NULL,
  size BIGINT NOT NULL,
  modified TIMESTAMPTZ NOT NULL,
  created TIMESTAMPTZ NOT NULL,
  extension TEXT,
  mime_type TEXT,
  tags TEXT[] DEFAULT '{}',
  content TEXT,
  preview TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_read_only BOOLEAN DEFAULT FALSE,
  permissions TEXT[] DEFAULT '{}',
  content_hash TEXT,
  extracted_text TEXT,
  language TEXT,
  entities TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  reading_time INTEGER,
  owner_id TEXT,
  group_id TEXT,
  storage_location TEXT,
  index_version INTEGER DEFAULT 1,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

-- Vector embeddings table
CREATE TABLE file_embeddings (
  file_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  embeddings VECTOR(384), -- Adjust dimension as needed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (file_id, tenant_id),
  FOREIGN KEY (file_id, tenant_id) REFERENCES file_metadata(id, tenant_id) ON DELETE CASCADE
);

-- Vector search table for Supabase vector extension
CREATE TABLE file_vectors (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  embedding VECTOR(384),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

-- Index statistics table
CREATE TABLE index_statistics (
  tenant_id TEXT PRIMARY KEY,
  total_files INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  last_indexed TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  extensions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_file_metadata_tenant_path ON file_metadata(tenant_id, path);
CREATE INDEX idx_file_metadata_tenant_type ON file_metadata(tenant_id, type);
CREATE INDEX idx_file_metadata_tenant_extension ON file_metadata(tenant_id, extension);
CREATE INDEX idx_file_metadata_tenant_modified ON file_metadata(tenant_id, modified);
CREATE INDEX idx_file_metadata_content_hash ON file_metadata(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_file_metadata_tags ON file_metadata USING GIN(tags);
CREATE INDEX idx_file_metadata_keywords ON file_metadata USING GIN(keywords);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_similar_vectors(
  query_embedding VECTOR(384),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 50,
  tenant_filter TEXT DEFAULT NULL,
  metadata_filter JSONB DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  score FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fv.id,
    1 - (fv.embedding <=> query_embedding) AS score,
    fv.metadata
  FROM file_vectors fv
  WHERE 
    (tenant_filter IS NULL OR fv.tenant_id = tenant_filter)
    AND (metadata_filter IS NULL OR fv.metadata @> metadata_filter)
    AND 1 - (fv.embedding <=> query_embedding) > match_threshold
  ORDER BY fv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Row Level Security (RLS) for multi-tenancy
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example - adjust based on your auth system)
CREATE POLICY "Users can only access their tenant data" ON file_metadata
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));

CREATE POLICY "Users can only access their tenant embeddings" ON file_embeddings
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));

CREATE POLICY "Users can only access their tenant vectors" ON file_vectors
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));

CREATE POLICY "Users can only access their tenant stats" ON index_statistics
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));