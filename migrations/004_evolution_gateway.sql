-- Migración: Camada WhatsApp a pasarela Evolution API (Baileys)
-- Sustituye las credenciales de Meta Cloud API por los datos del gateway autohospedado.

-- 1. Eliminar variables exclusivas de Meta Cloud API
DELETE FROM configuracion_sistema
WHERE categoria = 'whatsapp'
  AND clave IN (
    'whatsapp_token',
    'whatsapp_phone_number_id',
    'whatsapp_token_sandbox',
    'whatsapp_phone_number_id_sandbox'
  );

-- 2. Registrar las nuevas variables de la pasarela Evolution API
INSERT INTO configuracion_sistema (clave, valor, descripcion, categoria, tipo) VALUES
  ('whatsapp_gateway_url', 'http://127.0.0.1:8080', 'URL base de la pasarela Evolution API autohospedada (ej. http://127.0.0.1:8080)', 'whatsapp', 'text'),
  ('whatsapp_instance_name', '', 'Nombre de la instancia creada en Evolution API', 'whatsapp', 'text'),
  ('whatsapp_gateway_apikey', '', 'API Key (apikey) de la instancia Evolution API', 'whatsapp', 'password')
ON CONFLICT (clave) DO NOTHING;