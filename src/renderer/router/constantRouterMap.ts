import { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  { path: '/:pathMatch(.*)*', component: () => import("@renderer/views/404.vue") },
  { path: '/', name: '总览', component: () => import('@renderer/components/LandingPage.vue') },
  { path: '/pack', name: '打包', component: () => import('@renderer/views/Pack.vue') },
  { path: '/check', name: '代码检测', component: () => import('@renderer/views/Check.vue') },
]

export default routes