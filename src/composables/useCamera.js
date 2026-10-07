import { ref, onBeforeUnmount } from 'vue'
import { explainCameraError } from '../lib/permissions.js'

/**
 * Avvia la fotocamera posteriore in un <video> e la spegne allo smontaggio.
 * In caso di errore espone `help` ({ title, steps }) con il motivo e come risolvere.
 * @param {import('vue').Ref<HTMLVideoElement|null>} videoRef
 */
export function useCamera(videoRef) {
  const help = ref(null)
  const ready = ref(false)
  let stream

  async function start() {
    help.value = null
    ready.value = false
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('insecure'), { name: 'InsecureContextError' })
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      videoRef.value.srcObject = stream
      await videoRef.value.play()
      ready.value = true
    } catch (err) {
      stop()
      help.value = explainCameraError(err)
    }
  }

  function stop() {
    ready.value = false
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      stream = null
    }
    if (videoRef.value) videoRef.value.srcObject = null
  }

  onBeforeUnmount(stop)

  return { start, stop, help, ready }
}
