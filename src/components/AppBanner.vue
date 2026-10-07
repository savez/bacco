<script setup>
import { useBanner, dismissBanner } from '../composables/useBanner.js'

const { current } = useBanner()
</script>

<template>
  <div
    v-if="current"
    class="fixed inset-x-0 bottom-36 z-30 mx-auto max-w-md px-4"
  >
    <div
      :role="current.tone === 'error' ? 'alert' : 'status'"
      class="flex items-start gap-3 rounded-lg border border-rame/40 bg-doga p-3 shadow-lg"
    >
      <p class="flex-1 text-sm text-gesso">
        {{ current.message }}
      </p>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <button
          v-for="action in current.actions"
          :key="action.label"
          type="button"
          class="min-h-11 rounded-md bg-feccia px-3 text-sm font-bold text-botte"
          @click="action.onClick()"
        >
          {{ action.label }}
        </button>
        <button
          type="button"
          aria-label="Chiudi"
          class="flex min-h-11 min-w-11 items-center justify-center rounded-md text-cenere"
          @click="dismissBanner(current.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>
