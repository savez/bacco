import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Adatta un Observable di Dexie `liveQuery` a un ref reattivo di Vue.
 * @template T
 * @param {() => import('dexie').Observable<T>} queryFn
 * @param {T} [initialValue]
 */
export function useLiveQuery(queryFn, initialValue) {
  const data = ref(initialValue)
  let subscription

  onMounted(() => {
    subscription = queryFn().subscribe({
      next: (value) => {
        data.value = value
      },
      error: (err) => {
        console.error('useLiveQuery', err)
      },
    })
  })

  onUnmounted(() => {
    subscription?.unsubscribe()
  })

  return data
}
