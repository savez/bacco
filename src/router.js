import { createRouter, createWebHistory } from 'vue-router'
import RegistryView from './views/RegistryView.vue'
import BottleFormView from './views/BottleFormView.vue'
import BottleDetailView from './views/BottleDetailView.vue'
import SettingsView from './views/SettingsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    // Aprire o chiudere il pannello modale non deve far saltare la pagina che sta sotto.
    if (to.meta.modal || from.meta.modal) return false
    return savedPosition ?? { top: 0 }
  },
  routes: [
    { path: '/', name: 'registry', component: RegistryView },
    { path: '/nuova', name: 'bottle-new', component: BottleFormView },
    // Dettaglio e modifica si aprono in un pannello modale sopra la pagina corrente (App.vue).
    {
      path: '/bottiglia/:id',
      name: 'bottle-detail',
      component: BottleDetailView,
      props: true,
      meta: { modal: true },
    },
    {
      path: '/bottiglia/:id/modifica',
      name: 'bottle-edit',
      component: BottleFormView,
      props: true,
      meta: { modal: true },
    },
    {
      path: '/mappa',
      name: 'map',
      // Import dinamico: Leaflet si carica solo quando si apre questa pagina (research.md R9).
      component: () => import('./views/MapView.vue'),
    },
    { path: '/impostazioni', name: 'settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
