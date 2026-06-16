<template>
  <div class="app-container">
    <header class="header">
      <div class="logo">🍃 匿名忏悔室</div>
      <nav class="nav">
        <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
          首页
        </router-link>
        <router-link to="/confess" class="nav-link" :class="{ active: $route.path === '/confess' }">
          倾诉秘密
        </router-link>
        <router-link 
          v-if="isAdmin" 
          to="/admin/comfort" 
          class="nav-link" 
          :class="{ active: $route.path === '/admin/comfort' }"
        >
          电台管理
        </router-link>
      </nav>
    </header>
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <footer class="footer">
      <p>每一个秘密都值得被宽恕 💜</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const TOKEN_KEY = 'admin_token'
const isAdmin = ref(false)
const route = useRoute()

async function verifyAdmin() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    isAdmin.value = false
    return
  }

  try {
    const response = await fetch('/api/admin/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await response.json()
    isAdmin.value = data.isAdmin
  } catch (error) {
    console.error('验证管理员状态失败:', error)
    isAdmin.value = false
  }
}

watch(() => route.path, () => {
  verifyAdmin()
})

onMounted(() => {
  verifyAdmin()
})

window.addEventListener('admin-login', () => {
  isAdmin.value = true
})

window.addEventListener('admin-logout', () => {
  isAdmin.value = false
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.logo {
  font-size: 24px;
  font-weight: 600;
  color: white;
}

.nav {
  display: flex;
  gap: 30px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 16px;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 20px;
}

.nav-link:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}

.main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.footer {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}
</style>
