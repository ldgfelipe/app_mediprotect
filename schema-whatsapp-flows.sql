-- ============================================
-- TABLA: whatsapp_flows (editor de flujos)
-- Almacena los flujos de WhatsApp tipo n8n
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  definicion JSONB NOT NULL DEFAULT '{}',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_activo ON whatsapp_flows(activo);