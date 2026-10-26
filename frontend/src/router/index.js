import { createRouter, createWebHistory } from 'vue-router'
import { ability, parsePermission } from '@/services/ability'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/inquiries',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/dashboard/DashboardView.vue'),
      meta: { permission: 'report.read' }
    },
    {
      path: '/students',
      name: 'students',
      component: () => import('../views/student/Student.vue'),
      meta: { permission: 'student.read' }
    },
    {
      path: '/students/new',
      name: 'student-new',
      component: () => import('../views/student/StudentNew.vue'),
      meta: { permission: 'student.create' }
    },
    {
      path: '/students/:id',
      name: 'student-detail',
      component: () => import('../views/student/StudentDetail.vue'),
      meta: { permission: 'student.read' }
    },
    {
      path: '/inquiries',
      name: 'inquiries',
      component: () => import('../views/inquiry/Inquiry.vue'),
      meta: { permission: 'inquiry.read' }
    },
    {
      path: '/inquiries/new',
      name: 'inquiry-new',
      component: () => import('../views/inquiry/InquiryNew.vue'),
      meta: { permission: 'inquiry.create' }
    },
    {
      path: '/inquiries/:id',
      name: 'inquiry-detail',
      component: () => import('../views/inquiry/InquiryDetail.vue'),
      meta: { permission: 'inquiry.read' }
    },
    // ─── Admin Namespace ───
    {
      path: '/admin/accounts',
      name: 'admin-accounts',
      component: () => import('../views/account/Account.vue'),
      meta: { requiresAdmin: true, permission: 'account.read' }
    },
    {
      path: '/admin/accounts/new',
      name: 'admin-account-new',
      component: () => import('../views/account/AccountNew.vue'),
      meta: { requiresAdmin: true, permission: 'account.create' }
    },
    {
      path: '/admin/accounts/:id',
      name: 'admin-account-detail',
      component: () => import('../views/account/AccountDetail.vue'),
      meta: { requiresAdmin: true, permission: 'account.read' }
    },
    {
      path: '/admin/roles',
      name: 'admin-roles',
      component: () => import('../views/role/RoleList.vue'),
      meta: { requiresAdmin: true, permission: 'role.read' }
    },
    {
      path: '/admin/roles/new',
      name: 'admin-role-new',
      component: () => import('../views/role/RoleNew.vue'),
      meta: { requiresAdmin: true, permission: 'role.create' }
    },
    {
      path: '/admin/roles/:id',
      name: 'admin-role-detail',
      component: () => import('../views/role/RoleDetail.vue'),
      meta: { requiresAdmin: true, permission: 'role.read' }
    },
    {
      path: '/admin/teams/new',
      name: 'admin-team-new',
      component: () => import('../views/team/TeamNew.vue'),
      meta: { requiresAdmin: true, permission: 'team.create' }
    },

    // ─── Aliases & Redirects for Admin Routes ───
    { path: '/accounts', redirect: '/admin/accounts' },
    { path: '/accounts/new', redirect: '/admin/accounts/new' },
    { path: '/accounts/:id', redirect: to => `/admin/accounts/${to.params.id}` },
    { path: '/roles', redirect: '/admin/roles' },
    { path: '/roles/new', redirect: '/admin/roles/new' },
    { path: '/roles/:id', redirect: to => `/admin/roles/${to.params.id}` },
    { path: '/teams/new', redirect: '/admin/teams/new' },

    // ─── Teams (Accessible to Members & Leaders) ───
    {
      path: '/teams',
      name: 'teams',
      component: () => import('../views/team/Team.vue'),
      meta: { permission: 'team.read' }
    },
    {
      path: '/teams/:id',
      name: 'team-detail',
      component: () => import('../views/team/TeamDetail.vue'),
      meta: { permission: 'team.read' }
    },
    {
      path: '/schools',
      name: 'schools',
      component: () => import('../views/school/School.vue'),
      meta: { permission: 'school.read' }
    },
    {
      path: '/schools/new',
      name: 'school-new',
      component: () => import('../views/school/SchoolNew.vue'),
      meta: { permission: 'school.create' }
    },
    {
      path: '/schools/:id',
      name: 'school-detail',
      component: () => import('../views/school/SchoolDetail.vue'),
      meta: { permission: 'school.read' }
    },
    {
      path: '/campaigns',
      name: 'CampaignList',
      component: () => import('@/views/campaign/CampaignList.vue'),
      meta: { permission: 'campaign.read' }
    },
    {
      path: '/campaigns/new',
      name: 'CampaignNew',
      component: () => import('@/views/campaign/CampaignNew.vue'),
      meta: { permission: 'campaign.create' }
    },
    {
      path: '/campaigns/:id',
      name: 'CampaignDetail',
      component: () => import('@/views/campaign/CampaignDetail.vue'),
      meta: { permission: 'campaign.read' }
    },
    {
      path: '/campaign-templates',
      name: 'CampaignTemplateList',
      component: () => import('@/views/campaign/TemplateList.vue'),
      meta: { permission: 'campaign_template.read' }
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('../views/report/ReportList.vue'),
    },
    {
      path: '/reports/new',
      name: 'report-new',
      component: () => import('../views/report/ReportNew.vue'),
    },
    {
      path: '/reports/:id',
      name: 'report-detail',
      component: () => import('../views/report/ReportDetail.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('../views/ForbiddenView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

import { useAuthStore } from '@/stores/auth'

router.beforeEach((to) => {
  const authStore = useAuthStore()

  // Redirect unauthenticated users to /login immediately
  if (to.path !== '/login' && !authStore.isLoggedIn) {
    return '/login'
  }

  if (to.path === '/login' && authStore.isLoggedIn) {
    return '/'
  }

  // Admin guard — strictly for administrator roles
  if (to.meta.requiresAdmin) {
    const roleName = (authStore.user?.roleName || '').toLowerCase()
    const isAdmin = roleName === 'admin' || roleName === 'administrator' || ability.can('manage', 'all')
    if (!isAdmin) {
      return '/forbidden'
    }
  }

  // Permission guard — local CASL check, no API call
  if (to.meta.permission) {
    const perms = Array.isArray(to.meta.permission) ? to.meta.permission : [to.meta.permission]
    const hasPermission = perms.some(p => {
      const { action, subject } = parsePermission(p)
      return ability.can(action, subject)
    })
    if (!hasPermission) {
      return '/forbidden'
    }
  }
})

export default router
