// 环境配置
// 统一使用线上服务器地址
export const BASE_URL = 'https://piano.xingyue.fun/api'

const buildUrl = (url) => {
  if (/^https?:\/\//.test(url)) {
    return url
  }

  return BASE_URL + url
}

const getPathFromUrl = (url = '') => {
  const withoutQuery = String(url).split('?')[0]

  if (!/^https?:\/\//.test(withoutQuery)) {
    return withoutQuery
  }

  const pathStart = withoutQuery.indexOf('/', withoutQuery.indexOf('://') + 3)
  const path = pathStart >= 0 ? withoutQuery.slice(pathStart) : '/'
  return path.startsWith('/api/') ? path.slice(4) : path
}

const isGuardianPublicPath = (path) => {
  return path === '/guardian/login' ||
    path === '/guardian/bind' ||
    path === '/guardian/invites' ||
    path.startsWith('/guardian/invites/')
}

const getAuthType = (url) => {
  const path = getPathFromUrl(url)

  if (path.startsWith('/guardian/') && !isGuardianPublicPath(path)) {
    return 'guardian'
  }

  return 'teacher'
}

const getTeacherToken = () => {
  return uni.getStorageSync('teacherToken') ||
    (uni.getStorageSync('loginType') !== 'guardian' ? uni.getStorageSync('token') : '')
}

const getGuardianToken = () => {
  return uni.getStorageSync('guardianToken') ||
    (uni.getStorageSync('loginType') === 'guardian' ? uni.getStorageSync('token') : '')
}

const saveGuardianSessionToStorage = (session = {}) => {
  const token = session.token || getGuardianToken()
  const students = Array.isArray(session.students) ? session.students : null

  if (token) {
    uni.setStorageSync('guardianToken', token)
    uni.setStorageSync('token', token)
    uni.setStorageSync('loginType', 'guardian')
  }

  if (session.guardian) {
    uni.setStorageSync('guardianInfo', JSON.stringify(session.guardian))
  }

  if (students) {
    uni.setStorageSync('guardianStudents', JSON.stringify(students))

    const currentSelectedId = uni.getStorageSync('selectedGuardianStudentId')
    const hasCurrentStudent = students.some(student => student._id === currentSelectedId)
    const selectedId = hasCurrentStudent ? currentSelectedId : students[0]?._id

    if (selectedId) {
      uni.setStorageSync('selectedGuardianStudentId', selectedId)
    } else {
      uni.removeStorageSync('selectedGuardianStudentId')
    }
  }
}

let guardianLoginPromise = null

const loginGuardianSilently = () => {
  if (guardianLoginPromise) {
    return guardianLoginPromise
  }

  const currentPromise = new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('无法获取微信登录凭证'))
          return
        }

        uni.request({
          url: buildUrl('/guardian/login'),
          method: 'POST',
          data: { code: loginRes.code },
          header: {
            'Content-Type': 'application/json'
          },
          success: (res) => {
            const session = res.data?.data

            if (res.statusCode === 200 && session?.token) {
              saveGuardianSessionToStorage(session)
              resolve(session.token)
              return
            }

            reject(new Error(res.data?.message || '学生端登录已过期，请重新登录'))
          },
          fail: reject
        })
      },
      fail: reject
    })
  })

  guardianLoginPromise = currentPromise
  currentPromise.then(
    () => {
      if (guardianLoginPromise === currentPromise) {
        guardianLoginPromise = null
      }
    },
    () => {
      if (guardianLoginPromise === currentPromise) {
        guardianLoginPromise = null
      }
    }
  )

  return guardianLoginPromise
}

const getTokenByAuthType = async (authType) => {
  if (authType === 'guardian') {
    return getGuardianToken() || await loginGuardianSilently()
  }

  return getTeacherToken()
}

const clearAuthSession = (authType) => {
  if (authType === 'guardian') {
    uni.removeStorageSync('guardianToken')
    uni.removeStorageSync('guardianInfo')
    uni.removeStorageSync('guardianStudents')
    uni.removeStorageSync('selectedGuardianStudentId')

    if (uni.getStorageSync('loginType') === 'guardian') {
      uni.removeStorageSync('token')
      uni.removeStorageSync('loginType')
    }
    return
  }

  uni.removeStorageSync('teacherToken')
  uni.removeStorageSync('userInfo')

  if (uni.getStorageSync('loginType') !== 'guardian') {
    uni.removeStorageSync('token')
    uni.removeStorageSync('loginType')
  }
}

const getLoginUrl = (authType) => {
  return authType === 'guardian' ? '/pages/guardian/login' : '/pages/login/login'
}

const request = async (options) => {
  const authType = getAuthType(options.url)
  let token = ''

  try {
    token = await getTokenByAuthType(authType)
  } catch (error) {
    clearAuthSession(authType)
    uni.reLaunch({ url: getLoginUrl(authType) })
    throw error
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: buildUrl(options.url),
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
          clearAuthSession(authType)
          uni.reLaunch({ url: getLoginUrl(authType) })
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

export const uploadFile = (url, filePath, formData = {}) => {
  return new Promise((resolve, reject) => {
    const token = getTeacherToken()
    const uploadUrl = buildUrl(url)

    uni.uploadFile({
      url: uploadUrl,
      filePath,
      name: 'file',
      formData,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        let data = res.data
        try {
          data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        } catch (error) {
          reject(new Error('上传响应解析失败'))
          return
        }

        if (res.statusCode === 200) {
          resolve(data)
        } else {
          reject(new Error(data?.message || `上传失败(${res.statusCode})`))
        }
      },
      fail: (err) => {
        const message = err?.errMsg || err?.message || '文件上传失败'
        console.warn('文件上传失败:', uploadUrl, message)
        uni.showToast({
          title: message.includes('domain') || message.includes('url not in domain list')
            ? '请配置上传合法域名'
            : '文件上传失败',
          icon: 'none'
        })
        reject(new Error(message))
      }
    })
  })
}

const getFileNameFromPath = (filePath, fallback = 'file') => {
  const cleanPath = (filePath || '').split('?')[0]
  const name = cleanPath.split('/').pop()
  return name || fallback
}

const getMimeType = (filePath, mediaType) => {
  const ext = (filePath || '').split('?')[0].split('.').pop()?.toLowerCase()
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    wav: 'audio/wav'
  }

  return map[ext] || (mediaType === 'audio' ? 'audio/mpeg' : 'image/jpeg')
}

export const uploadFileData = (url, filePath, formData = {}) => {
  return new Promise((resolve, reject) => {
    const fileSystemManager = uni.getFileSystemManager?.()
    if (!fileSystemManager) {
      reject(new Error('当前环境不支持文件读取'))
      return
    }

    fileSystemManager.readFile({
      filePath,
      encoding: 'base64',
      success: async (res) => {
        try {
          const mediaType = formData.mediaType || 'image'
          const result = await post(url, {
            ...formData,
            fileName: getFileNameFromPath(filePath, mediaType === 'audio' ? 'record.mp3' : 'image.jpg'),
            mimeType: getMimeType(filePath, mediaType),
            data: res.data
          })
          resolve(result)
        } catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        reject(new Error(err?.errMsg || '读取文件失败'))
      }
    })
  })
}

export const downloadFile = (url) => {
  return new Promise((resolve, reject) => {
    const token = getGuardianToken() || getTeacherToken()

    uni.downloadFile({
      url: buildUrl(url),
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath)
        } else {
          reject(new Error('文件下载失败'))
        }
      },
      fail: reject
    })
  })
}

export default {
  get,
  post,
  put,
  del,
  uploadFile,
  uploadFileData,
  downloadFile,
  request
}
