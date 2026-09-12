<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <NotificationBell />
  <PermissionModal />
</template>

<script setup>
if (import.meta.client) {
  useSocket()
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  color: #2d3436;
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
}
a { color: #2d3436; text-decoration: none; font-weight: 500; }
a:hover { color: #00b894; }

.auth-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #ffffff; padding: 2rem 1rem;
}
.auth-container {
  background: #ffffff; border-radius: 12px; padding: 2.5rem;
  width: 100%; max-width: 480px; border: 1px solid #eaeaea;
}
.auth-header { text-align: center; margin-bottom: 2rem; }
.auth-header .logo { height: 50px; margin-bottom: 1rem; }
.auth-header h1 { font-size: 1.5rem; color: #2d3436; margin-bottom: 0.5rem; }
.auth-header p { color: #636e72; font-size: 0.95rem; }
.auth-form { display: flex; flex-direction: column; gap: 1.2rem; }

.tipo-selector {
  display: flex; background: #f5f5f5; border-radius: 8px; padding: 3px;
}
.tipo-btn {
  flex: 1; padding: 0.7rem; border: none; background: transparent;
  border-radius: 6px; font-size: 0.9rem; font-weight: 500;
  cursor: pointer; color: #636e72; transition: all 0.2s;
}
.tipo-btn.active { background: #ffffff; color: #2d3436; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-weight: 600; }

.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-size: 0.85rem; font-weight: 600; color: #2d3436; }
.form-group input, .form-group select, .form-group textarea {
  padding: 0.7rem 1rem; border: 1.5px solid #e0e0e0; border-radius: 8px;
  font-size: 0.95rem; transition: border-color 0.2s; font-family: inherit; background: #ffffff;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none; border-color: #2d3436;
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.btn-primary {
  background: #2d3436; color: white; border: none; padding: 0.8rem;
  border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;
  transition: background 0.2s; text-align: center;
}
.btn-primary:hover { background: #1a1e1f; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline {
  background: transparent; color: #2d3436; border: 1.5px solid #2d3436;
  padding: 0.7rem 1.5rem; border-radius: 8px; font-weight: 600;
  text-decoration: none; transition: all 0.2s; display: inline-block;
}
.btn-outline:hover { background: #f5f5f5; }

.error-msg {
  color: #d63031; font-size: 0.85rem; text-align: center;
  background: #fff5f5; padding: 0.5rem; border-radius: 6px; border: 1px solid #ffd7d7;
}
.auth-footer { text-align: center; font-size: 0.9rem; color: #636e72; }

.dashboard-header {
  background: #ffffff; border-bottom: 1px solid #eaeaea; position: sticky; top: 0; z-index: 100;
}
.dashboard-header-inner {
  max-width: 1200px; margin: 0 auto; padding: 0.8rem 1rem;
  display: flex; align-items: center; justify-content: space-between;
}
.dashboard-header nav { display: flex; gap: 1.5rem; }
.dashboard-header nav a { color: #636e72; font-size: 0.9rem; font-weight: 500; padding-bottom: 0.25rem; border-bottom: 2px solid transparent; }
.dashboard-header nav a:hover, .dashboard-header nav a.router-link-active { color: #2d3436; border-bottom-color: #2d3436; }
.dashboard-content { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
.dashboard-content h1 { font-size: 1.8rem; margin-bottom: 0.3rem; }
.subtitle { color: #636e72; margin-bottom: 2rem; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.card {
  background: #ffffff; border-radius: 12px; padding: 1.5rem;
  border: 1px solid #eaeaea; transition: box-shadow 0.2s;
}
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.card h3 { margin-bottom: 0.5rem; font-size: 1.1rem; }
.card p { color: #636e72; font-size: 0.9rem; margin-bottom: 1rem; }
.btn-card {
  display: inline-block; background: #2d3436; color: white;
  padding: 0.5rem 1.2rem; border-radius: 6px; font-size: 0.85rem;
  font-weight: 500; text-decoration: none; transition: background 0.2s;
}
.btn-card:hover { background: #1a1e1f; }

@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
  .auth-container { padding: 1.5rem; border: none; }
  .dashboard-header nav { display: none; }
}
</style>
