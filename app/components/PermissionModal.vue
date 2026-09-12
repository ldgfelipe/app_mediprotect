<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="perm-overlay" @click.self="dismiss">
        <div class="perm-modal">
          <div class="perm-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0984e3" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <h3>Notificaciones en tiempo real</h3>
          <p>Recibe alertas instantáneas cuando:</p>
          <ul>
            <li>Tu cita sea confirmada o cancelada</li>
            <li>Haya cambios en el estado de tu cita</li>
            <li>El médico confirme asistencia</li>
          </ul>
          <div class="perm-actions">
            <button class="perm-btn-secondary" @click="dismiss">Ahora no</button>
            <button class="perm-btn-primary" @click="accept">Activar notificaciones</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePush } from '~/composables/usePush'

const show = ref(false)
const { isSupported, permission, requestPermission, subscribeUser } = usePush()

onMounted(() => {
  if (!import.meta.client) return
  if (!isSupported.value) return
  if (permission.value === 'granted') return

  const hasAuth = useCookie('token').value || useCookie('admin_token').value || localStorage.getItem('usuario')
  if (!hasAuth) return

  const dismissed = localStorage.getItem('mp_push_dismissed')
  if (dismissed) return

  setTimeout(() => { show.value = true }, 3000)
})

async function accept() {
  const result = await requestPermission()
  if (result === 'granted') {
    await subscribeUser()
  }
  show.value = false
  localStorage.setItem('mp_push_dismissed', 'true')
}

function dismiss() {
  show.value = false
  localStorage.setItem('mp_push_dismissed', '1')
}
</script>

<style scoped>
.perm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.perm-modal {
  background: white; border-radius: 16px; padding: 2rem; max-width: 420px; width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2); text-align: center;
}
.perm-icon { margin-bottom: 1rem; }
.perm-modal h3 { font-size: 1.3rem; margin-bottom: 0.5rem; color: #2d3436; }
.perm-modal p { color: #636e72; font-size: 0.9rem; margin-bottom: 0.5rem; }
.perm-modal ul {
  text-align: left; margin: 0.5rem 0 1.5rem 1.5rem;
  color: #636e72; font-size: 0.9rem; line-height: 1.8;
}
.perm-actions { display: flex; gap: 0.75rem; }
.perm-btn-secondary {
  flex: 1; padding: 0.75rem; background: #f5f5f5; border: none; border-radius: 8px;
  font-weight: 600; cursor: pointer; color: #636e72; transition: background 0.2s;
}
.perm-btn-secondary:hover { background: #e0e0e0; }
.perm-btn-primary {
  flex: 1; padding: 0.75rem; background: #0984e3; color: white; border: none;
  border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;
}
.perm-btn-primary:hover { background: #0773c5; }
.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .perm-modal, .modal-leave-to .perm-modal { transform: scale(0.9); }
</style>
