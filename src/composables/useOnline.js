import { ref, onMounted, onUnmounted } from 'vue'

/** Ref reattivo con lo stato online/offline del dispositivo. */
export function useOnline() {
  const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  const setOnline = () => {
    online.value = true
  }
  const setOffline = () => {
    online.value = false
  }

  onMounted(() => {
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', setOnline)
    window.removeEventListener('offline', setOffline)
  })

  return { online }
}
