import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
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
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('../views/account/Account.vue'),
      meta: { permission: 'account.read' }
    },
    {
      path: '/accounts/new',
      name: 'account-new',
      component: () => import('../views/account/AccountNew.vue'),
      meta: { permission: 'account.create' }
    },
    {
      path: '/accounts/:id',
      name: 'account-detail',
      component: () => import('../views/account/AccountDetail.vue'),
      meta: { permission: 'account.read' }
    },
    {
      path: '/groups',
      name: 'groups',
      component: () => import('../views/group/Group.vue'),
      meta: { permission: 'group.read' }
    },
    {
      path: '/groups/new',
      name: 'group-new',
      component: () => import('../views/group/GroupNew.vue'),
      meta: { permission: 'group.create' }
    },
    {
      path: '/groups/:id',
      name: 'group-detail',
      component: () => import('../views/group/GroupDetail.vue'),
      meta: { permission: 'group.read' }
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('../views/role/RoleList.vue'),
      meta: { permission: 'role.read' }
    },
    {
      path: '/roles/new',
      name: 'role-new',
      component: () => import('../views/role/RoleNew.vue'),
      meta: { permission: 'role.create' }
    },
    {
      path: '/roles/:id',
      name: 'role-detail',
      component: () => import('../views/role/RoleDetail.vue'),
      meta: { permission: 'role.read' }
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

  // Permission guard — local CASL check, no API call
  if (to.meta.permission) {
    const { action, subject } = parsePermission(to.meta.permission)
    if (!ability.can(action, subject)) {
      return '/forbidden'
    }
  }
})

export default router
