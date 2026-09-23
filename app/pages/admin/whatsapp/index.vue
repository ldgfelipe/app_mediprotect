<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; display: flex; flex-direction: column; padding: 1.5rem 1rem; position: fixed; height: 100vh; }
.sidebar-brand h2 { font-size: 1.3rem; margin-bottom: 0.25rem; }
.role-badge { font-size: 0.75rem; color: #00b894; text-transform: uppercase; letter-spacing: 0.5px; }
nav { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; margin-top: 1.5rem; }
.nav-link { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: all 0.2s; }
.nav-link:hover { background: rgba(255,255,255,0.1); }
.nav-link.active { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid rgba(255,255,255,0.2); color: #dfe6e9; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin-top: auto; }
.btn-logout:hover { background: rgba(255,255,255,0.1); }
.admin-content { flex: 1; margin-left: 240px; padding: 2rem; background: #f5f6fa; min-height: 100vh; }
.content-header { margin-bottom: 2rem; }
.content-header h1 { font-size: 1.8rem; color: #2d3436; margin-bottom: 0.25rem; }
.content-header p { color: #636e72; }

.tabs-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 0; }
.tab-btn { padding: 0.75rem 1.5rem; border: none; background: none; font-size: 0.95rem; color: #636e72; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.tab-btn:hover { color: #2d3436; }
.tab-btn.active { color: #00b894; border-bottom-color: #00b894; font-weight: 600; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
.stat-icon { font-size: 2rem; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: #2d3436; }
.stat-label { font-size: 0.8rem; color: #636e72; }

.filters-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; }
.filter-input { padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; flex: 1; max-width: 300px; }
.filter-select { padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
.btn-refresh { background: #00b894; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
.btn-refresh:hover { background: #00a884; }

.conversaciones-panel { display: grid; grid-template-columns: 380px 1fr; gap: 0; background: white; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; min-height: 500px; }

.conversaciones-list { border-right: 1px solid #e0e0e0; overflow-y: auto; max-height: 600px; }
.conv-item { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background 0.15s; }
.conv-item:hover { background: #f8f9fa; }
.conv-item.active { background: #e8f5e9; border-left: 3px solid #00b894; }
.conv-avatar { width: 42px; height: 42px; border-radius: 50%; background: #00b894; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem; flex-shrink: 0; }
.conv-info { flex: 1; min-width: 0; }
.conv-name { font-weight: 600; font-size: 0.9rem; color: #2d3436; }
.conv-phone { font-size: 0.8rem; color: #636e72; font-family: monospace; }
.conv-state { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
.state-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; }
.state-success { background: #e8f5e9; color: #2e7d32; }
.state-new { background: #e3f2fd; color: #1565c0; }
.state-progress { background: #fff3e0; color: #e65100; }
.state-waiting { background: #fce4ec; color: #c62828; }
.state-default { background: #f5f5f5; color: #636e72; }
.conv-msgs { font-size: 0.75rem; color: #b2bec3; }
.conv-time { font-size: 0.75rem; color: #b2bec3; white-space: nowrap; }

.conv-detail { display: flex; flex-direction: column; }
.detail-header { padding: 1rem 1.25rem; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 1rem; }
.detail-header h3 { margin: 0; font-size: 1rem; }
.conv-phone-detail { font-size: 0.8rem; color: #636e72; font-family: monospace; }

.mensajes-container { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; max-height: 480px; }
.msg-item { display: flex; gap: 0.5rem; max-width: 80%; }
.msg-in { align-self: flex-start; }
.msg-out { align-self: flex-end; flex-direction: row-reverse; }
.msg-direction { font-size: 0.8rem; }
.msg-content { background: #f0f0f0; padding: 0.5rem 0.75rem; border-radius: 12px; }
.msg-out .msg-content { background: #dcf8c6; }
.msg-text { font-size: 0.85rem; color: #2d3436; white-space: pre-wrap; word-break: break-word; }
.msg-meta { display: flex; justify-content: space-between; gap: 1rem; margin-top: 0.25rem; }
.msg-type { font-size: 0.65rem; color: #b2bec3; text-transform: uppercase; }
.msg-time { font-size: 0.65rem; color: #b2bec3; }

.loading { text-align: center; padding: 3rem; color: #636e72; }
.empty { text-align: center; padding: 3rem; color: #b2bec3; }
.empty-detail { display: flex; align-items: center; justify-content: center; }

.simulador-layout { display: grid; grid-template-columns: 400px 1fr; gap: 1.5rem; min-height: 600px; }
.sim-input-panel { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; }
.sim-input-panel h3 { margin: 0 0 0.5rem; font-size: 1.2rem; color: #2d3436; }
.sim-desc { font-size: 0.85rem; color: #636e72; margin-bottom: 1.25rem; }
.sim-phone-row, .sim-msg-row { margin-bottom: 1rem; }
.sim-phone-row label, .sim-msg-row label { display: block; font-size: 0.85rem; font-weight: 600; color: #2d3436; margin-bottom: 0.35rem; }
.sim-phone-input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; font-family: monospace; }
.sim-msg-input { width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; resize: vertical; font-family: inherit; }
.sim-actions { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
.btn-simular { flex: 1; background: #00b894; color: white; border: none; padding: 0.75rem; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-simular:hover { background: #00a884; }
.btn-simular:disabled { background: #b2bec3; cursor: not-allowed; }
.btn-limpiar-sim { background: #ff7675; color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; }
.btn-limpiar-sim:hover { background: #d63031; }

.sim-templates { margin-bottom: 1.25rem; }
.sim-templates h4 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #636e72; }
.btn-template { display: block; width: 100%; text-align: left; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6x; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #2d3436; cursor: pointer; margin-bottom: 0.35rem; transition: background 0.15s; }
.btn-template:hover { background: #e8f5e9; border-color: #00b894; }

.sim-estado { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
.sim-estado h4 { margin: 0 0 0.5rem; font-size: 0.85rem; color: #636e72; }
.estado-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; font-size: 0.85rem; }
.estado-label { font-weight: 600; color: #636e72; min-width: 70px; }

.sim-chat-panel { background: white; border: 1px solid #e0e0e0; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.sim-chat-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #f0f0f0; }
.sim-chat-header h3 { margin: 0; font-size: 1rem; }
.btn-clear-chat { background: none; border: 1px solid #e0e0e0; color: #636e72; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
.btn-clear-chat:hover { background: #f5f5f5; }

.sim-chat-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; max-height: 550px; background: #f0f2f5; }
.sim-chat-empty { text-align: center; padding: 3rem 1rem; color: #636e72; }
.sim-chat-empty p { margin: 0 0 0.5rem; font-size: 1rem; }
.sim-chat-hint { font-size: 0.85rem; color: #b2bec3; }

.sim-msg { display: flex; gap: 0.5rem; max-width: 85%; }
.sim-msg-in { align-self: flex-start; }
.sim-msg-out { align-self: flex-end; flex-direction: row-reverse; }
.sim-msg-avatar { width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
.sim-msg-out .sim-msg-avatar { background: #dcf8c6; }
.sim-msg-bubble { background: white; padding: 0.75rem 1rem; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.sim-msg-in .sim-msg-bubble { border-top-left-radius: 4px; }
.sim-msg-out .sim-msg-bubble { border-top-right-radius: 4px; background: #dcf8c6; }
.sim-msg-text { font-size: 0.9rem; color: #2d3436; line-height: 1.4; }
.sim-msg-time { font-size: 0.65rem; color: #b2bec3; margin-top: 0.25rem; text-align: right; }

.sim-msg-opciones { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.75rem; }
.btn-opcion-sim { display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: #2d3436; cursor: pointer; transition: all 0.15s; }
.btn-opcion-sim:hover { background: #e8f5e9; border-color: #00b894; }
.opcion-desc { font-size: 0.75rem; color: #636e72; }

.sim-msg-botones { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
.btn-boton-sim { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: background 0.15s; }
.btn-boton-sim:hover { background: #00a884; }

.sim-typing { display: flex; gap: 4px; padding: 0.75rem 1rem; align-items: center; }
.sim-typing span { width: 8px; height: 8px; border-radius: 50%; background: #b2bec3; animation: typing 1.4s infinite; }
.sim-typing span:nth-child(2) { animation-delay: 0.2s; }
.sim-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .admin-content { margin-left: 0; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .conversaciones-panel { grid-template-columns: 1fr; }
  .conv-detail { display: none; }
  .simulador-layout { grid-template-columns: 1fr; }
}

/* Configuración WhatsApp */
.config-layout { max-width: 800px; margin: 0 auto; padding: 2rem; }
.config-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 2rem; max-width: 600px; margin: 0 auto; }
.config-desc { color: #636e72; font-size: 0.9rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #f0f0f0; }
.config-row { margin-bottom: 1.5rem; }
.config-row label { display: block; font-weight: 600; color: #2d3436; margin-bottom: 0.5rem; font-size: 0.9rem; }
.config-row select, .config-row input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; font-family: inherit; box-sizing: border-box; }
.config-row input[type="password"] { background: #f8f9fa; }
.config-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
.btn-save-config { background: #00b894; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-save-config:hover { background: #00a884; }
.btn-save-config:disabled { background: #b2bec3; cursor: not-allowed; }
.btn-reset-config { background: #ff7675; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; }
.btn-reset-config:hover { background: #d63031; }
.config-info { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-top: 1.5rem; }
.config-info h4 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #636e72; }
.config-info p { margin: 0.25rem 0; font-size: 0.85rem; color: #636e72; }
.config-error { background: #ffe0e0; color: #d63031; padding: 0.75rem; border-radius: 8px; margin-top: 1rem; text-align: center; }
.config-exito { background: #e0ffe0; color: #2e7d32; padding: 0.75rem; border-radius: 8px; margin-top: 1rem; text-align: center; }

@media (max-width: 768px) {
  .config-layout { padding: 1rem; }
  .config-card { padding: 1rem; }
  .config-actions { flex-direction: column; gap: 0.5rem; align-items: stretch; }
  .btn-save-config, .btn-reset-config { width: 100%; }
}
</style>