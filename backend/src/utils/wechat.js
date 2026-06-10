const https = require('https')

const APPID = 'wxc0fad9ed6db1b4a7'
const APPSECRET = 'a31612ae78c3e971ba69fe41c3e2f1a5'
const TEMPLATE_ID = 'FPymYYMiWppMeQyUl6RwZbFfJvgCuknjdyphRkDs1Y0'
const DEFAULT_MINIPROGRAM_STATE = 'trial'
const VALID_MINIPROGRAM_STATES = ['developer', 'trial', 'formal']

let accessTokenCache = {
  token: '',
  expiresAt: 0
}

const getMiniprogramState = () => {
  const state = process.env.WECHAT_MINIPROGRAM_STATE || DEFAULT_MINIPROGRAM_STATE
  if (VALID_MINIPROGRAM_STATES.includes(state)) {
    return state
  }
  
  console.warn(`无效的 WECHAT_MINIPROGRAM_STATE: ${state}, 使用 ${DEFAULT_MINIPROGRAM_STATE}`)
  return DEFAULT_MINIPROGRAM_STATE
}

const getAccessToken = async () => {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token
  }

  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`

    https.get(url, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.access_token) {
            accessTokenCache.token = result.access_token
            accessTokenCache.expiresAt = Date.now() + (result.expires_in - 300) * 1000
            resolve(result.access_token)
          } else {
            reject(new Error(result.errmsg || '获取 access_token 失败'))
          }
        } catch (error) {
          reject(error)
        }
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

const sendSubscribeMessage = async (openId, data, page = 'pages/schedule/schedule') => {
  try {
    console.log('开始发送订阅消息...')
    console.log('openId:', openId)
    console.log('page:', page)
    console.log('data:', JSON.stringify(data, null, 2))
    
    const accessToken = await getAccessToken()
    console.log('获取到 access_token:', accessToken ? '成功' : '失败')
    const miniprogramState = getMiniprogramState()
    console.log('miniprogram_state:', miniprogramState)
    
    const postData = JSON.stringify({
      touser: openId,
      template_id: TEMPLATE_ID,
      page: page,
      miniprogram_state: miniprogramState,
      data: data
    })
    
    console.log('发送的数据:', postData)

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.weixin.qq.com',
        port: 443,
        path: `/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }

      const req = https.request(options, (res) => {
        let responseData = ''

        res.on('data', (chunk) => {
          responseData += chunk
        })

        res.on('end', () => {
          try {
            console.log('微信API响应:', responseData)
            const result = JSON.parse(responseData)
            if (result.errcode === 0) {
              console.log('订阅消息发送成功')
              resolve(result)
            } else {
              console.error('订阅消息发送失败:', result)
              reject(new Error(`错误码: ${result.errcode}, 错误信息: ${result.errmsg}`))
            }
          } catch (error) {
            console.error('解析响应失败:', error)
            reject(error)
          }
        })
      })

      req.on('error', (error) => {
        console.error('请求失败:', error)
        reject(error)
      })

      req.write(postData)
      req.end()
    })
  } catch (error) {
    console.error('发送订阅消息异常:', error)
    throw error
  }
}

const formatTime = (date) => {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value
    return result
  }, {})

  const year = parts.year
  const month = parts.month
  const day = parts.day
  const hours = parts.hour
  const minutes = parts.minute
  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

const getOpenIdByCode = async (code) => {
  if (!code) {
    throw new Error('缺少 code 参数')
  }

  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APPSECRET}&js_code=${code}&grant_type=authorization_code`

    https.get(url, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.openid) {
            resolve(result.openid)
          } else {
            reject(new Error(result.errmsg || '获取 openId 失败'))
          }
        } catch (error) {
          reject(error)
        }
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

module.exports = {
  getAccessToken,
  getOpenIdByCode,
  sendSubscribeMessage,
  formatTime
}
