// 环境配置
// 统一使用线上服务器地址
const BASE_URL = 'https://piano.xingyue.fun/api'

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')
          uni.reLaunch({
            url: '/pages/login/login'
          })
          reject(new Error('登录已过期，请重新登录'))
        } else {
          reject(new Error(res.data?.message || '请求失败'))
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

export const get = (url, data) => {
  return request({
    url,
    method: 'GET',
    data
  })
}

export const post = (url, data) => {
  return request({
    url,
    method: 'POST',
    data
  })
}

export const put = (url, data) => {
  return request({
    url,
    method: 'PUT',
    data
  })
}

export const del = (url, data) => {
  return request({
    url,
    method: 'DELETE',
    data
  })
}

export default {
  get,
  post,
  put,
  del,
  request
}
