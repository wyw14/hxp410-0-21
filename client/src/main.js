import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Confess from './views/Confess.vue'
import ComfortAdmin from './views/ComfortAdmin.vue'
import './style.css'

const routes = [
  { path: '/', component: Home },
  { path: '/confess', component: Confess },
  { path: '/admin/comfort', component: ComfortAdmin }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
