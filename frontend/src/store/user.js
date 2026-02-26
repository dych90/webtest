import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi, getUserInfo } from '@/api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: null
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  
  actions: {
    async login(loginForm) {
      const { data } = await loginApi(loginForm)
      this.token = data.token
      localStorage.setItem('token', data.token)
      return data
    },
    
    async logout() {
      await logoutApi()
      this.token = ''
      this.userInfo = null
      localStorage.removeItem('token')
    },
    
    async fetchUserInfo() {
      const { data } = await getUserInfo()
      this.userInfo = data
      return data
    }
  }
})
