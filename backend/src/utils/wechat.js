const https = require('https')

const APPID = 'wxc0fad9ed6db1b4a7'
const APPSECRET = 'a31612ae78c3e971ba69fe41c3e2f1a5'
const TEMPLATE_ID = 'FPymYYMiWppMeQyUl6RwZbFfJvgCuknjdyphRkDs1Y0'

let accessTokenCache = {
  token: '',
  expiresAt: 0
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
    const accessToken = await getAccessToken()
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`

    const postData = JSON.stringify({
      touser: openId,
      template_id: TEMPLATE_ID,
      data: data,
      miniprogram: {
        appid: APPID,
        page: page
      }
    })

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
            const result = JSON.parse(responseData)
            if (result.errcode === 0) {
              resolve(result)
            } else {
              reject(new Error(result.errmsg || '发送订阅消息失败'))
            }
          } catch (error) {
            reject(error)
          }
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.write(postData)
      req.end()
    })
  } catch (error) {
    throw error
  }
}

const formatTime = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

module.exports = {
  getAccessToken,
  sendSubscribeMessage,
  formatTime
}
