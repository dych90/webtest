import request from '@/utils/request'

export const login = (data) => {
  return request({
    url: '/login',
    method: 'post',
    data
  })
}

export const logout = () => {
  return request({
    url: '/logout',
    method: 'post'
  })
}

export const getUserInfo = () => {
  return request({
    url: '/user/info',
    method: 'get'
  })
}
