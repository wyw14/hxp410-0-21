<template>
  <div class="admin-container">
    <div v-if="!isLoggedIn" class="card login-card">
      <div class="card-header">
        <span class="icon">🔐</span>
        <h2>管理后台登录</h2>
        <p class="login-hint">请输入管理员密码</p>
      </div>

      <div class="login-form">
        <div class="form-group">
          <label>管理员密码</label>
          <input 
            v-model="password" 
            type="password" 
            class="form-control"
            placeholder="请输入密码"
            @keyup.enter="login"
            :disabled="loggingIn"
          />
        </div>
        <button class="btn btn-primary btn-block" @click="login" :disabled="loggingIn">
          {{ loggingIn ? '登录中...' : '登录' }}
        </button>
        <p v-if="loginError" class="error-text">{{ loginError }}</p>
      </div>
    </div>

    <div v-else class="card">
      <div class="card-header">
        <div class="header-top">
          <span class="icon">📻</span>
          <button class="btn btn-secondary btn-sm logout-btn" @click="logout">
            🚪 退出登录
          </button>
        </div>
        <h2>每日安慰电台 - 管理后台</h2>
      </div>

      <div class="admin-actions">
        <button class="btn btn-primary" @click="showAddModal = true">
          ➕ 新增安慰文案
        </button>
        <div class="filter-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: filter === 'all' }"
            @click="filter = 'all'"
          >
            全部 ({{ totalCount }})
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: filter === 'active' }"
            @click="filter = 'active'"
          >
            启用 ({{ activeCount }})
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: filter === 'inactive' }"
            @click="filter = 'inactive'"
          >
            停用 ({{ inactiveCount }})
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else class="message-list">
        <div 
          v-for="msg in filteredMessages" 
          :key="msg.id" 
          class="message-item"
          :class="{ inactive: msg.status === 'inactive' }"
        >
          <div class="message-header">
            <span class="status-badge" :class="msg.status">
              {{ msg.status === 'active' ? '✓ 启用' : '✕ 停用' }}
            </span>
            <span class="message-date">
              {{ formatDate(msg.createdAt) }}
            </span>
          </div>
          <p class="message-content">"{{ msg.content }}"</p>
          <div class="message-footer">
            <span class="message-author">—— {{ msg.author }}</span>
            <div class="message-actions">
              <button class="btn btn-secondary btn-sm" @click="editMessage(msg)">
                ✏️ 编辑
              </button>
              <button 
                class="btn btn-sm" 
                :class="msg.status === 'active' ? 'btn-warning' : 'btn-success'"
                @click="toggleStatus(msg)"
              >
                {{ msg.status === 'active' ? '⏸ 停用' : '▶ 启用' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredMessages.length === 0" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>暂无{{ filter === 'all' ? '' : filter === 'active' ? '启用的' : '停用的' }}安慰文案</p>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ showAddModal ? '新增安慰文案' : '编辑安慰文案' }}</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>文案内容</label>
            <textarea 
              v-model="form.content" 
              class="form-control" 
              rows="4"
              placeholder="请输入温暖的安慰文案..."
            ></textarea>
          </div>
          <div class="form-group">
            <label>作者/来源</label>
            <input 
              v-model="form.author" 
              type="text" 
              class="form-control"
              placeholder="温暖电台"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveMessage" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const TOKEN_KEY = 'admin_token'

const isLoggedIn = ref(false)
const password = ref('')
const loggingIn = ref(false)
const loginError = ref('')

const loading = ref(true)
const saving = ref(false)
const messages = ref([])
const filter = ref('all')
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingId = ref(null)

const form = ref({
  content: '',
  author: ''
})

const totalCount = computed(() => messages.value.length)
const activeCount = computed(() => messages.value.filter(m => m.status === 'active').length)
const inactiveCount = computed(() => messages.value.filter(m => m.status === 'inactive').length)

const filteredMessages = computed(() => {
  if (filter.value === 'all') return messages.value
  return messages.value.filter(m => m.status === filter.value)
})

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY)
  isLoggedIn.value = false
  loginError.value = '登录已过期，请重新登录'
}

async function verifyLogin() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    isLoggedIn.value = false
    return
  }

  try {
    const response = await fetch('/api/admin/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await response.json()
    isLoggedIn.value = data.isAdmin
    if (data.isAdmin) {
      fetchMessages()
    }
  } catch (error) {
    console.error('验证登录状态失败:', error)
    isLoggedIn.value = false
  }
}

async function login() {
  if (!password.value.trim()) {
    loginError.value = '请输入密码'
    return
  }

  loggingIn.value = true
  loginError.value = ''

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      localStorage.setItem(TOKEN_KEY, data.token)
      isLoggedIn.value = true
      password.value = ''
      window.dispatchEvent(new Event('admin-login'))
      fetchMessages()
    } else {
      loginError.value = data.error || '登录失败'
    }
  } catch (error) {
    console.error('登录失败:', error)
    loginError.value = '登录失败，请稍后重试'
  } finally {
    loggingIn.value = false
  }
}

async function logout() {
  const token = localStorage.getItem(TOKEN_KEY)
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
  } catch (error) {
    console.error('退出登录失败:', error)
  }
  localStorage.removeItem(TOKEN_KEY)
  isLoggedIn.value = false
  messages.value = []
  window.dispatchEvent(new Event('admin-logout'))
}

async function fetchMessages() {
  loading.value = true
  try {
    const response = await fetch('/api/comfort', {
      headers: getAuthHeaders()
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    const data = await response.json()
    messages.value = data.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch (error) {
    console.error('获取安慰文案失败:', error)
    alert('加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
}

function editMessage(msg) {
  editingId.value = msg.id
  form.value = {
    content: msg.content,
    author: msg.author
  }
  showEditModal.value = true
}

async function toggleStatus(msg) {
  const newStatus = msg.status === 'active' ? 'inactive' : 'active'
  const confirmText = newStatus === 'active' 
    ? '确定要启用这条文案吗？启用后可能被展示在首页。'
    : '确定要停用这条文案吗？停用后将不会被展示在首页。'
  
  if (!confirm(confirmText)) return

  try {
    const response = await fetch(`/api/comfort/${msg.id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    const data = await response.json()
    if (data.success) {
      await fetchMessages()
      alert(data.message)
    }
  } catch (error) {
    console.error('更新状态失败:', error)
    alert('操作失败，请重试')
  }
}

async function saveMessage() {
  if (!form.value.content.trim()) {
    alert('请输入文案内容')
    return
  }

  saving.value = true
  try {
    let response
    if (showAddModal.value) {
      response = await fetch('/api/comfort', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(form.value)
      })
    } else {
      response = await fetch(`/api/comfort/${editingId.value}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(form.value)
      })
    }

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    const data = await response.json()
    if (data.success) {
      await fetchMessages()
      closeModal()
      alert(data.message)
    }
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

function closeModal() {
  showAddModal.value = false
  showEditModal.value = false
  editingId.value = null
  form.value = { content: '', author: '' }
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  verifyLogin()
})
</script>

<style scoped>
.admin-container {
  width: 100%;
  max-width: 800px;
}

.login-card {
  max-width: 400px;
  margin: 0 auto;
}

.login-hint {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
}

.login-form {
  margin-top: 20px;
}

.btn-block {
  width: 100%;
}

.error-text {
  color: #f5576c;
  font-size: 14px;
  margin-top: 12px;
  text-align: center;
}

.header-top {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.logout-btn {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.logout-btn:hover {
  background: rgba(102, 126, 234, 0.2);
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

.admin-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-tabs {
  display: flex;
  gap: 10px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
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

.message-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-item {
  background: #fafafa;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #eee;
  transition: all 0.3s ease;
}

.message-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
}

.message-item.inactive {
  opacity: 0.6;
  background: #f5f5f5;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
}

.status-badge.inactive {
  background: #e0e0e0;
  color: #666;
}

.message-date {
  font-size: 12px;
  color: #999;
}

.message-content {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  margin-bottom: 15px;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.message-author {
  color: #666;
  font-size: 14px;
}

.message-actions {
  display: flex;
  gap: 10px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
}

.btn-success {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.form-control {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #eee;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
