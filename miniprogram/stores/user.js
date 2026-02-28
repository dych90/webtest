import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref(null)
  
  const isLoggedIn = computed(() => !!token.value)
  
  const isAdmin = () => {
    return userInfo.value?.role === 'admin'
  }
  
  const isTeacher = () => {
    return userInfo.value?.role === 'teacher'
  }
  
  const setToken = (newToken) => {
    token.value = newToken
    uni.setStorageSync('token', newToken)
  }
  
  const setUserInfo = (info) => {
    userInfo.value = info
    uni.setStorageSync('userInfo', JSON.stringify(info))
  }
  
  const login = (loginToken, info) => {
    setToken(loginToken)
    setUserInfo(info)
  }
  
  const logout = () => {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
  }
  
  const initFromStorage = () => {
    const storedToken = uni.getStorageSync('token')
    const storedUserInfo = uni.getStorageSync('userInfo')
    
    if (storedToken) {
      token.value = storedToken
    }
    if (storedUserInfo) {
      try {
        userInfo.value = JSON.parse(storedUserInfo)
      } catch (e) {
        console.error('解析用户信息失败', e)
      }
    }
  }
  
  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    isTeacher,
    setToken,
    setUserInfo,
    login,
    logout,
    initFromStorage
  }
})
