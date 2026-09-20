import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSocket } from '~/composables/useSocket'

const activePollers = new Map<string, { timer: any; interval: number; fetchFn: Function }>()

export function useSmartPolling(key: string, fetchFn: () => Promise<void>, options?: { fastInterval?: number; slowInterval?: number }) {
  const fastMs = options?.fastInterval || 8000
  const slowMs = options?.slowInterval || 15000

  const { connected } = useSocket()
  const isPolling = ref(false)
  let pollTimer: any = null
  let isVisible = true

  function startPolling() {
    if (activePollers.has(key)) return
    isPolling.value = true
    const interval = fastMs

    function tick() {
      if (!isVisible || connected.value) {
        stopPolling()
        return
      }
      fetchFn().finally(() => {
        pollTimer = setTimeout(tick, interval)
      })
    }

    pollTimer = setTimeout(tick, interval)
    activePollers.set(key, { timer: pollTimer, interval, fetchFn })
    console.log(`[Polling] "${key}" iniciado (${interval}ms)`)
  }

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
    activePollers.delete(key)
    isPolling.value = false
    console.log(`[Polling] "${key}" detenido`)
  }

  function onVisibilityChange() {
    isVisible = document.visibilityState === 'visible'
    if (!isVisible) {
      stopPolling()
    } else if (!connected.value) {
      startPolling()
    }
  }

  watch(connected, (isConnected) => {
    if (isConnected) {
      stopPolling()
    } else if (isVisible) {
      startPolling()
    }
  })

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    if (!connected.value && isVisible) {
      startPolling()
    }
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stopPolling()
  })

  return { isPolling }
}
