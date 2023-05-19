import { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  { path: '/:pathMatch(.*)*', component: () => import("@renderer/views/404.vue") },
  { path: '/', name: '总览', component: () => import('@renderer/components/LandingPage.vue') },
  { path: '/pack', name: '打包', component: () => import('@renderer/views/Pack.vue') },
]

export default routes