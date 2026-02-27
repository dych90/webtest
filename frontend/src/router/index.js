import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页' }
      },
      {
        path: '/users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: { title: '教师管理', requiresAdmin: true }
      },
      {
        path: '/students',
        name: 'Students',
        component: () => import('@/views/Students.vue'),
        meta: { title: '学生管理' }
      },
      {
        path: '/course-types',
        name: 'CourseTypes',
        component: () => import('@/views/CourseTypes.vue'),
        meta: { title: '课程类型' }
      },
      {
        path: '/fee-standards',
        name: 'FeeStandards',
        component: () => import('@/views/FeeStandards.vue'),
        meta: { title: '收费标准' }
      },
      {
        path: '/payments',
        name: 'Payments',
        component: () => import('@/views/Payments.vue'),
        meta: { title: '缴费管理' }
      },
      {
        path: '/schedule',
        name: 'Schedule',
        component: () => import('@/views/Schedule.vue'),
        meta: { title: '排课管理' }
      },
      {
        path: '/lessons',
        name: 'Lessons',
        component: () => import('@/views/Lessons.vue'),
        meta: { title: '消课管理' }
      },
      {
        path: '/repertoire',
        name: 'Repertoire',
        component: () => import('@/views/Repertoire.vue'),
        meta: { title: '曲目管理' }
      },
      {
        path: '/balance',
        name: 'Balance',
        component: () => import('@/views/Balance.vue'),
        meta: { title: '剩余课费' }
      },
      {
        path: '/statistics',
        name: 'Statistics',
        component: () => import('@/views/Statistics.vue'),
        meta: { title: '数据统计' }
      },
      {
        path: '/reminders',
        name: 'Reminders',
        component: () => import('@/views/Reminders.vue'),
        meta: { title: '提醒管理' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else if (to.path === '/login' && userStore.token) {
    next('/')
  } else if (to.meta.requiresAdmin && !userStore.isAdmin()) {
    next('/')
  } else {
    next()
  }
})

export default router
