const pg = require('pg')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

const queries = [
  // Tabla de configuración del sistema
  `CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    valor_encriptado TEXT,
    descripcion TEXT,
    categoria VARCHAR(50) DEFAULT 'general',
    tipo VARCHAR(20) DEFAULT 'texto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Índice por categoría
  `CREATE INDEX IF NOT EXISTS idx_config_categoria ON configuracion_sistema(categoria)`,

  // Insertar configuraciones iniciales de IA
  `INSERT INTO configuracion_sistema (clave, valor, descripcion, categoria, tipo) VALUES
    ('ai_openai_key', '', 'API Key de OpenAI (GPT-4o)', 'ia', 'password'),
    ('ai_openai_model', 'gpt-4o', 'Modelo de OpenAI a usar', 'ia', 'texto'),
    ('ai_openai_enabled', 'false', 'Habilitar OpenAI como proveedor', 'ia', 'booleano'),

    ('ai_claude_key', '', 'API Key de Anthropic (Claude)', 'ia', 'password'),
    ('ai_claude_model', 'claude-sonnet-4-20250514', 'Modelo de Claude a usar', 'ia', 'texto'),
    ('ai_claude_enabled', 'false', 'Habilitar Claude como proveedor', 'ia', 'booleano'),

    ('ai_gemini_key', '', 'API Key de Google Gemini', 'ia', 'password'),
    ('ai_gemini_model', 'gemini-2.0-flash', 'Modelo de Gemini a usar', 'ia', 'texto'),
    ('ai_gemini_enabled', 'false', 'Habilitar Gemini como proveedor', 'ia', 'booleano'),

    ('ai_cloudflare_key', '', 'API Key de Cloudflare Workers AI', 'ia', 'password'),
    ('ai_cloudflare_account_id', '', 'Account ID de Cloudflare', 'ia', 'texto'),
    ('ai_cloudflare_model', '@cf/meta/llama-3.1-8b-instruct', 'Modelo de Cloudflare a usar', 'ia', 'texto'),
    ('ai_cloudflare_enabled', 'false', 'Habilitar Cloudflare como proveedor', 'ia', 'booleano'),

    ('ai_provider_preferido', 'openai', 'Proveedor preferido para búsqueda de médicos', 'ia', 'texto'),
    ('ai_buscar_fotos', 'true', 'Buscar fotos de médicos en la red', 'ia', 'booleano'),
    ('ai_idioma_busqueda', 'es', 'Idioma para búsquedas de IA', 'ia', 'texto')
  ON CONFLICT (clave) DO NOTHING`,

  // Función para actualizar updated_at
  `CREATE OR REPLACE FUNCTION update_config_timestamp()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  // Trigger para auto-actualizar updated_at
  `DROP TRIGGER IF EXISTS trigger_config_updated ON configuracion_sistema;
   CREATE TRIGGER trigger_config_updated
     BEFORE UPDATE ON configuracion_sistema
     FOR EACH ROW
     EXECUTE FUNCTION update_config_timestamp()`
]

;(async () => {
  for (const q of queries) {
    try {
      await pool.query(q)
      console.log('OK:', q.substring(0, 60) + '...')
    } catch (err) {
      console.error('Error:', err.message)
    }
  }
  await pool.end()
  console.log('\nMigración completada')
})()
