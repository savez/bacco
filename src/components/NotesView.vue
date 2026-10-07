<script setup>
import { computed } from 'vue'
import { parseNotes } from '../lib/notes.js'

const props = defineProps({
  notes: { type: String, default: '' },
})

const blocks = computed(() => parseNotes(props.notes))
</script>

<template>
  <div class="space-y-2">
    <template v-for="(block, i) in blocks" :key="i">
      <p v-if="block.type === 'p'">{{ block.text }}</p>
      <ul v-else class="list-disc pl-5">
        <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
      </ul>
    </template>
  </div>
</template>
