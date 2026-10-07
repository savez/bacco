<script setup>
import { ref, watch, nextTick } from 'vue'
import {
  useInstallInviteState,
  dismissInstallInvite,
  acceptInstallInvite,
} from '../composables/useInstallInvite.js'

const invite = useInstallInviteState()
const dialogRef = ref(null)

watch(
  () => invite.open,
  async (open) => {
    await nextTick()
    if (open) dialogRef.value?.showModal()
    else dialogRef.value?.close()
  },
)

function onCancel(event) {
  // Esc vale come "Non ora".
  event.preventDefault()
  dismissInstallInvite()
}
</script>

<template>
  <dialog
    v-if="invite.plan"
    ref="dialogRef"
    aria-labelledby="install-title"
    class="w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-rame/30 bg-doga p-0 text-gesso shadow-2xl backdrop:bg-black/60"
    @cancel="onCancel"
  >
    <div class="p-6">
      <div class="flex items-center gap-4">
        <img src="/icons/icon.svg" alt="" width="64" height="64" class="h-16 w-16 rounded-2xl shadow-lg" />
        <div>
          <h2 id="install-title" class="font-display text-2xl uppercase leading-none tracking-wide">
            Installa Bacco
          </h2>
          <p class="mt-1 text-sm text-cenere">Gratis, senza store.</p>
        </div>
      </div>

      <p class="mt-4">
        Mettila sulla schermata Home: si apre con un tocco, a schermo intero, e funziona anche senza rete.
      </p>

      <ol v-if="invite.plan.mode === 'steps'" class="mt-4 space-y-2">
        <li v-for="(step, i) in invite.plan.steps" :key="i" class="flex gap-3">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rame text-sm font-bold text-doga"
            aria-hidden="true"
          >
            {{ i + 1 }}
          </span>
          <span class="pt-0.5">{{ step }}</span>
        </li>
      </ol>
      <p v-if="invite.plan.note" class="mt-4 text-sm text-cenere">{{ invite.plan.note }}</p>

      <div class="mt-6 flex flex-col gap-2">
        <button
          v-if="invite.plan.mode === 'prompt'"
          type="button"
          class="min-h-12 rounded-full bg-feccia px-4 font-bold text-botte"
          @click="acceptInstallInvite"
        >
          Installa
        </button>
        <button
          type="button"
          class="min-h-12 rounded-full px-4 font-bold"
          :class="invite.plan.mode === 'prompt' ? 'text-cenere' : 'bg-feccia text-botte'"
          @click="dismissInstallInvite"
        >
          {{ invite.plan.mode === 'prompt' ? 'Non ora' : 'Ho capito' }}
        </button>
      </div>
    </div>
  </dialog>
</template>
