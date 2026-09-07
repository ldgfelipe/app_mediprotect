-- Tabla de conexiones SMS multiples
CREATE TABLE IF NOT EXISTS sms_conexiones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  proveedor VARCHAR(50) NOT NULL DEFAULT 'twilio',
  account_sid VARCHAR(200) DEFAULT '',
  auth_token VARCHAR(200) DEFAULT '',
  from_number VARCHAR(30) DEFAULT '',
  modo VARCHAR(20) DEFAULT 'sandbox' CHECK (modo IN ('sandbox', 'produccion')),
  activa BOOLEAN DEFAULT true,
  preferida BOOLEAN DEFAULT false,
  prioridad INT DEFAULT 0,
  descripcion TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrar config actual si existe en configuracion_sistema
DO $$
DECLARE
  sid_val TEXT;
  token_val TEXT;
  num_val TEXT;
  modo_val TEXT;
BEGIN
  SELECT valor INTO sid_val FROM configuracion_sistema WHERE clave = 'sms_twilio_account_sid' AND categoria = 'sms';
  SELECT valor INTO token_val FROM configuracion_sistema WHERE clave = 'sms_twilio_auth_token' AND categoria = 'sms';
  SELECT valor INTO num_val FROM configuracion_sistema WHERE clave = 'sms_twilio_from_number' AND categoria = 'sms';
  SELECT valor INTO modo_val FROM configuracion_sistema WHERE clave = 'sms_modo' AND categoria = 'sms';

  IF sid_val IS NOT NULL AND sid_val != '' THEN
    INSERT INTO sms_conexiones (nombre, proveedor, account_sid, auth_token, from_number, modo, activa, preferida, prioridad, descripcion)
    VALUES ('Principal', 'twilio', COALESCE(sid_val, ''), COALESCE(token_val, ''), COALESCE(num_val, ''), COALESCE(modo_val, 'sandbox'), true, true, 1, 'Migrada desde configuracion anterior');
  END IF;
END $$;
