<script setup>
import { computed, useId } from 'vue'

// Sagoma di bottiglia per il punteggio (ui-design.md, "Firma"): bordolese per il vino,
// bottiglia da birra con tappo a corona per la birra. "filled" la riempie del suo liquido.
const props = defineProps({
  type: { type: String, default: null }, // 'wine' | 'beer' | null
  filled: { type: Boolean, default: false },
})

const clipId = useId()

const SHAPES = {
  wine: {
    body: 'M10.5 5H13.5V14C13.5 16 19 16.5 19 21V44A2 2 0 0 1 17 46H7A2 2 0 0 1 5 44V21C5 16.5 10.5 16 10.5 14Z',
    cap: { x: 10, y: 1.5, width: 4, height: 3.5 },
    liquidTop: 19,
    label: { x: 7.5, y: 27, width: 9, height: 8 },
  },
  beer: {
    body: 'M10 5.5H14V16C14 19 18 20 18 25V44A2 2 0 0 1 16 46H8A2 2 0 0 1 6 44V25C6 20 10 19 10 16Z',
    cap: { x: 9.25, y: 2.5, width: 5.5, height: 3 },
    liquidTop: 21,
    label: { x: 8, y: 30, width: 8, height: 7 },
  },
}

const shape = computed(() => SHAPES[props.type === 'beer' ? 'beer' : 'wine'])
const tone = computed(() => {
  if (props.type === 'wine') return { stroke: 'stroke-feccia', fill: 'fill-feccia' }
  if (props.type === 'beer') return { stroke: 'stroke-luppolo', fill: 'fill-luppolo' }
  return { stroke: 'stroke-rame', fill: 'fill-rame' }
})
</script>

<template>
  <svg viewBox="0 0 24 48" aria-hidden="true" class="bottle-icon">
    <defs>
      <clipPath :id="clipId">
        <path :d="shape.body" />
      </clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <rect
        class="liquid"
        :class="[tone.fill, filled ? 'is-full' : '']"
        x="0"
        :y="shape.liquidTop"
        width="24"
        :height="48 - shape.liquidTop"
      />
      <rect
        v-if="type === 'beer'"
        class="liquid fill-gesso"
        :class="filled ? 'is-full' : ''"
        x="0"
        :y="shape.liquidTop - 1"
        width="24"
        height="2.5"
      />
      <rect
        v-if="filled"
        :x="shape.label.x"
        :y="shape.label.y"
        :width="shape.label.width"
        :height="shape.label.height"
        rx="1"
        class="fill-gesso"
        opacity="0.85"
      />
    </g>
    <path
      :d="shape.body"
      fill="none"
      stroke-width="1.6"
      stroke-linejoin="round"
      :class="filled ? tone.stroke : 'stroke-cenere'"
    />
    <rect v-bind="shape.cap" rx="0.8" :class="filled ? tone.fill : 'fill-cenere'" />
  </svg>
</template>

<style scoped>
/* Il liquido "sale" dal fondo; disattivato con prefers-reduced-motion da main.css. */
.liquid {
  transform-box: fill-box;
  transform-origin: bottom;
  transform: scaleY(0);
  transition: transform 180ms ease-out;
}
.liquid.is-full {
  transform: scaleY(1);
}
</style>
