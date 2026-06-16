<template>
  <div class="home-container">
    <div class="card comfort-card">
      <div class="card-header">
        <span class="icon">📻</span>
        <h2>每日安慰电台</h2>
        <p class="date-text">{{ formatDate(comfortDate) }}</p>
      </div>

      <div v-if="comfortLoading" class="loading">
        <div class="spinner"></div>
        <p>正在准备今日的温暖...</p>
      </div>

      <div v-else-if="!hasComfort" class="empty-state">
        <span class="empty-icon">🌸</span>
        <p>{{ comfortMessage }}</p>
      </div>

      <transition name="fade" v-else>
        <div class="comfort-content">
          <p class="comfort-text">"{{ todayComfort.content }}"</p>
          <p class="comfort-author">—— {{ todayComfort.author }}</p>
          <p v-if="!isOriginalActive" class="expired-hint">📌 此文案为历史展示内容，已不再使用</p>
        </div>
      </transition>
    </div>

    <div class="card secret-card">
      <div class="card-header">
        <span class="icon">💫</span>
        <h2>今日被宽恕的秘密</h2>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在寻找一段温暖的秘密...</p>
      </div>

      <div v-else-if="!hasSecret" class="empty-state">
        <span class="empty-icon">🌸</span>
        <p>{{ message }}</p>
        <button class="btn btn-primary" @click="goToConfess">
          分享第一个秘密
        </button>
      </div>

      <transition name="fade" v-else>
        <div class="secret-content" :key="secret?.id">
          <p class="secret-text">"{{ secret.content }}"</p>
          <div class="secret-footer">
            <span class="status-badge">{{ secret.status }}</span>
            <button class="btn btn-secondary refresh-btn" @click="fetchRandomSecret">
              🔄 换一个
            </button>
          </div>
        </div>
      </transition>

      <div class="card-actions">
        <button class="btn btn-primary" @click="goToConfess">
          我也想倾诉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const hasSecret = ref(false)
const secret = ref(null)
const message = ref('')

const comfortLoading = ref(true)
const hasComfort = ref(false)
const todayComfort = ref(null)
const comfortMessage = ref('')
const comfortDate = ref('')
const isOriginalActive = ref(true)

async function fetchTodayComfort() {
  comfortLoading.value = true
  try {
    const response = await fetch('/api/comfort/today')
    const data = await response.json()
    hasComfort.value = data.hasMessage
    todayComfort.value = data.message
    comfortMessage.value = data.message
    comfortDate.value = data.date
    isOriginalActive.value = data.isOriginalActive !== false
  } catch (error) {
    console.error('获取今日安慰失败:', error)
    hasComfort.value = false
    comfortMessage.value = '暂时无法连接到温暖电台'
  } finally {
    comfortLoading.value = false
  }
}

async function fetchRandomSecret() {
  loading.value = true
  try {
    const response = await fetch('/api/secrets/random')
    const data = await response.json()
    hasSecret.value = data.hasSecret
    secret.value = data.secret
    message.value = data.message
  } catch (error) {
    console.error('获取秘密失败:', error)
    hasSecret.value = false
    message.value = '暂时无法连接到服务器'
  } finally {
    loading.value = false
  }
}

function goToConfess() {
  router.push('/confess')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

onMounted(() => {
  fetchTodayComfort()
  fetchRandomSecret()
})
</script>

<style scoped>
.home-container {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.comfort-card {
  animation: slideUp 0.6s ease 0.1s both;
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.comfort-card .card-header h2 {
  color: #8b4513;
}

.date-text {
  color: #a0522d;
  font-size: 14px;
  margin-top: 8px;
  font-weight: 400;
}

.comfort-content {
  padding: 20px 0;
  text-align: center;
}

.comfort-text {
  font-size: 20px;
  line-height: 1.8;
  color: #5d4037;
  font-style: italic;
  margin-bottom: 15px;
  padding: 0 10px;
}

.comfort-author {
  color: #8b6914;
  font-size: 14px;
  font-weight: 500;
}

.expired-hint {
  color: #a0522d;
  font-size: 12px;
  margin-top: 12px;
  opacity: 0.8;
  font-style: normal;
}

.secret-card {
  animation: slideUp 0.6s ease 0.2s both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.card-header h2 {
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
  margin-bottom: 30px;
}

.secret-content {
  padding: 20px 0;
}

.secret-text {
  font-size: 20px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  text-align: center;
  margin-bottom: 30px;
  padding: 0 10px;
}

.secret-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.status-badge {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.refresh-btn {
  padding: 8px 20px;
  font-size: 14px;
  color: #666;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: #e0e0e0;
  transform: translateY(-1px);
}

.card-actions {
  margin-top: 40px;
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #eee;
}
</style>
