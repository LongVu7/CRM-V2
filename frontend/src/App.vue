<template>
  <Toast position="top-right" />

  <div class="app-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'no-sidebar': isLoginPage }">
    <!-- Sidebar -->
    <aside class="sidebar" v-if="!isLoginPage">
      <div class="sidebar-header">
        <div class="brand" v-show="!sidebarCollapsed">
          <i class="pi pi-building"></i>
          <span class="brand-text">Admissions CRM</span>
        </div>
        <Button :icon="sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'" text rounded size="small"
          class="toggle-btn" @click="toggleSidebar" />
      </div>

      <nav class="sidebar-nav">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-item"
          :class="{ active: route.path === item.to }" v-tooltip.right="sidebarCollapsed ? item.label : undefined">
          <i :class="item.icon"></i>
          <span v-show="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer" v-show="!sidebarCollapsed">
        <div class="user-info" v-if="authStore.user">
          <div class="avatar">
            <i class="pi pi-user"></i>
          </div>
          <div class="user-details">
            <span class="user-name">{{ authStore.user.fullName || 'User' }}</span>
            <span class="user-role">{{ authStore.user.roleName || 'Staff' }}</span>
          </div>
          <Button icon="pi pi-sign-out" text rounded severity="danger" size="small" v-tooltip.top="'Logout'" @click="handleLogout" style="margin-left: auto;" />
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
import { useAbility } from '@casl/vue'
import { parsePermission } from '@/services/ability'

const { can } = useAbility()
const sidebarCollapsed = ref(false)

const navigationItems = [
  { label: 'Home',       icon: 'pi pi-home',           to: '/',           permission: null },
  { label: 'Students',   icon: 'pi pi-graduation-cap', to: '/students',   permission: 'student.read' },
  { label: 'Inquiries',  icon: 'pi pi-ticket',         to: '/inquiries',  permission: 'inquiry.read' },
  { label: 'Schools',    icon: 'pi pi-building',        to: '/schools',    permission: 'school.read' },
  { label: 'Campaigns',  icon: 'pi pi-send',            to: '/campaigns',  permission: 'campaign.read' },
  { label: 'Templates',  icon: 'pi pi-file-edit',       to: '/campaign-templates', permission: 'campaign_template.read' },
  { label: 'Groups',     icon: 'pi pi-folder',          to: '/groups',     permission: 'group.read' },
  { label: 'Roles',      icon: 'pi pi-shield',          to: '/roles',      permission: 'role.read' },
  { label: 'Accounts',   icon: 'pi pi-users',           to: '/accounts',   permission: 'account.read' },
  { label: 'Dashboard',  icon: 'pi pi-chart-bar',       to: '/dashboard',  permission: 'report.read' },
  { label: 'Error Reports', icon: 'pi pi-flag',         to: '/reports',    permission: null },
]

const navItems = computed(() =>
  navigationItems.filter(item => {
    if (!item.permission) return true
    const { action, subject } = parsePermission(item.permission)
    return can(action, subject)
  })
)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

const isLoginPage = computed(() => route.path === '/login')

onMounted(() => {
  authStore.checkAuth()
})
</script>


<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.no-sidebar .main-content {
  margin-left: 0 !important;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
}

.sidebar-collapsed .sidebar {
  width: 64px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.brand i {
  font-size: 1.4rem;
  color: #7ec8e3;
}

.brand-text {
  font-size: 1rem;
  font-weight: 700;
  color: #e8e8e8;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.toggle-btn {
  color: rgba(255, 255, 255, 0.6) !important;
}

.toggle-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: 1rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-item i {
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-item.active {
  background: rgba(126, 200, 227, 0.15);
  color: #7ec8e3;
  font-weight: 600;
}

.nav-item.active i {
  color: #7ec8e3;
}

/* Sidebar Footer */
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(126, 200, 227, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7ec8e3;
  font-size: 0.95rem;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #e8e8e8;
}

.user-role {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: 260px;
  background: var(--p-surface-50, #f8f9fa);
  min-height: 100vh;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:root.p-dark .main-content {
  background: var(--p-surface-900, #121212);
}

.sidebar-collapsed .main-content {
  margin-left: 64px;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 64px;
  }

  .main-content {
    margin-left: 64px;
  }

  .brand,
  .nav-label,
  .sidebar-footer {
    display: none !important;
  }
}
</style>
