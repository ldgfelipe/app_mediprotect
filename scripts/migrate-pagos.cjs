const pg = require('pg')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

const queries = [
  // Agregar nuevas columnas a tabla pagos existente
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS id_plan UUID`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS provedor VARCHAR(50) DEFAULT 'mercadopago'`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS provedor_pago_id VARCHAR(255)`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'MXN'`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS descripcion TEXT`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS detalles JSONB DEFAULT '{}'`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS sandbox BOOLEAN DEFAULT true`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS error_mensaje TEXT`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,
  `ALTER TABLE pagos ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`,

  // Renombrar estatus a estado si existe
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos' AND column_name = 'estatus') THEN
      ALTER TABLE pagos RENAME COLUMN estatus TO estado;
    END IF;
  END $$`,

  // Renombrar fecha_pago a created_at si es necesario
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos' AND column_name = 'fecha_pago') THEN
      ALTER TABLE pagos RENAME COLUMN fecha_pago TO created_at_old;
    END IF;
  END $$`,

  // Crear índices
  `CREATE INDEX IF NOT EXISTS idx_pagos_paciente ON pagos(id_paciente)`,
  `CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado)`,
  `CREATE INDEX IF NOT EXISTS idx_pagos_provedor ON pagos(provedor)`,
  `CREATE INDEX IF NOT EXISTS idx_pagos_provedor_pago_id ON pagos(provedor_pago_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pagos_sandbox ON pagos(sandbox)`,

  // Trigger para auto-actualizar updated_at
  `CREATE OR REPLACE FUNCTION update_pago_timestamp()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trigger_pago_updated ON pagos`,
  `CREATE TRIGGER trigger_pago_updated
     BEFORE UPDATE ON pagos
     FOR EACH ROW
     EXECUTE FUNCTION update_pago_timestamp()`
]

;(async () => {
  for (const q of queries) {
    try {
      await pool.query(q)
      console.log('OK:', q.substring(0, 70) + '...')
    } catch (err) {
      console.error('Error:', err.message.substring(0, 100))
    }
  }
  await pool.end()
  console.log('\nMigración de pagos completada')
})()
