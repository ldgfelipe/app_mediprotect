import { ref, onMounted } from 'vue'

const permission = ref<NotificationPermission>('default')
const isSupported = ref(false)
const subscription = ref<PushSubscription | null>(null)

export function usePush() {
  function checkSupport() {
    if (!import.meta.client) return
    isSupported.value = 'serviceWorker' in navigator && 'PushManager' in window
    if (isSupported.value) {
      permission.value = Notification.permission
    }
  }

  async function registerServiceWorker() {
    if (!import.meta.client || !isSupported.value) return null
    try {
      return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    } catch {
      return null
    }
  }

  async function requestPermission() {
    if (!import.meta.client || !isSupported.value) return 'denied'
    permission.value = await Notification.requestPermission()
    return permission.value
  }

  async function subscribeUser() {
    if (!import.meta.client || !isSupported.value || permission.value !== 'granted') return null

    const reg = await registerServiceWorker()
    if (!reg) return null

    try {
      const vapidKey = 'BE8PbPyCNWpbe0iBTusqGluzp0BNN03PSwHBs3HCyCQqsxLHFltHrfxGghsNdiVTzdZpsPAEJMdTjj5o7DWIffM'
      const convertedKey = urlBase64ToUint8Array(vapidKey)

      subscription.value = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })

      const sub = subscription.value.toJSON()
      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: {
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
        },
      })

      return subscription.value
    } catch {
      return null
    }
  }

  async function unsubscribeUser() {
    if (!import.meta.client || !subscription.value) return

    try {
      const endpoint = subscription.value.endpoint
      await subscription.value.unsubscribe()
      await $fetch('/api/push/unsubscribe', {
        method: 'POST',
        body: { endpoint },
      })
      subscription.value = null
    } catch {}
  }

  onMounted(() => {
    checkSupport()
  })

  return {
    permission,
    isSupported,
    subscription,
    requestPermission,
    subscribeUser,
    unsubscribeUser,
    registerServiceWorker,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
