import { post } from './request'

export const GUARDIAN_SUBSCRIBE_TEMPLATE_ID = 'FPymYYMiWppMeQyUl6RwZbFfJvgCuknjdyphRkDs1Y0'

export const getGuardianToken = () => {
  return uni.getStorageSync('guardianToken') ||
    (uni.getStorageSync('loginType') === 'guardian' ? uni.getStorageSync('token') : '')
}

export const saveGuardianSession = (session = {}) => {
  const token = session.token || getGuardianToken()
  const students = Array.isArray(session.students) ? session.students : []

  if (token) {
    uni.setStorageSync('guardianToken', token)
    uni.setStorageSync('token', token)
    uni.setStorageSync('loginType', 'guardian')
  }

  if (session.guardian) {
    uni.setStorageSync('guardianInfo', JSON.stringify(session.guardian))
  }

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

export const clearGuardianSession = () => {
  uni.removeStorageSync('guardianToken')
  uni.removeStorageSync('guardianInfo')
  uni.removeStorageSync('guardianStudents')
  uni.removeStorageSync('selectedGuardianStudentId')

  if (uni.getStorageSync('loginType') === 'guardian') {
    uni.removeStorageSync('token')
    uni.removeStorageSync('loginType')
  }
}

export const requestGuardianSubscription = async () => {
  try {
    const result = await new Promise((resolve, reject) => {
      uni.requestSubscribeMessage({
        tmplIds: [GUARDIAN_SUBSCRIBE_TEMPLATE_ID],
        success: resolve,
        fail: reject
      })
    })

    if (result[GUARDIAN_SUBSCRIBE_TEMPLATE_ID] !== 'accept') {
      return false
    }

    await post('/guardian/subscribe')
    return true
  } catch (error) {
    console.warn('学生端订阅提醒失败', error?.message || error)
    return false
  }
}

export const getStoredGuardianStudents = () => {
  const raw = uni.getStorageSync('guardianStudents')
  if (!raw) return []

  try {
    return JSON.parse(raw)
  } catch (error) {
    return []
  }
}

export const getSelectedGuardianStudentId = (students = []) => {
  const storedId = uni.getStorageSync('selectedGuardianStudentId')
  if (students.some(student => student._id === storedId)) {
    return storedId
  }

  return students[0]?._id || ''
}
