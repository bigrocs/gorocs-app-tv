/*
 * @Description: IoT设备信息API — 获取MQTT连接凭证
 */
import { rsa2Sign, verifySign } from '@/utils/crypto'
import { baseUrl } from '@/settings'

/**
 * POST请求封装
 * @param {string} url
 * @param {Object} data
 * @returns {Promise<Object>}
 */
function uniPost(url, data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data,
      success: (res) => {
        console.log('[API] 响应状态码:', res.statusCode)
        console.log('[API] 响应数据:', JSON.stringify(res.data))
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error('请求失败: HTTP ' + res.statusCode))
        }
      },
      fail: (err) => {
        console.error('[API] 请求失败:', err.errMsg)
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

/**
 * 获取设备信息(包含MQTT连接凭证)
 * @param {string} label - 设备型号
 * @param {string} deviceSn - 设备序列号
 * @returns {Promise<Object|null>} DeviceInfo
 */
export function getDeviceInfo(deviceSn) {
  const params = {
    bizContent: {
      service: 'ALIPAY',
      label: 'T3B00',
      deviceSn: deviceSn
    },
    appId: '1778077994a85f55fd5b09',
    signType: 'RSA2'
  }

  console.log('[API] 请求参数:', JSON.stringify(params))

  const signature = rsa2Sign(params)
  console.log('[API] 签名结果:', signature)

  const requestBody = Object.assign({}, params, { sign: signature })
  const url = baseUrl + 'api/iot/secure/getIotInfo'
  console.log('[API] 请求URL:', url)

  return uniPost(url, requestBody).then((data) => {
    if (!data.content) {
      throw new Error('获取设备信息返回为空')
    }

    let content = data.content
    if (typeof content === 'string') {
      content = JSON.parse(content)
    }

    if (data.sign) {
      const isValid = verifySign(content, data.sign)
      console.log('[API] 签名验证结果:', isValid)
      if (!isValid) {
        throw new Error('返回签名验证失败')
      }
    }

    if (typeof content.config === 'string' && content.config.trim() !== '') {
      content.config = JSON.parse(content.config)
    }

    if (content.returnCode !== 'SUCCESS') {
      throw new Error(content.returnMsg || '请求失败')
    }

    console.log('[API] 设备信息获取成功:', JSON.stringify(content))
    return content
  }).catch((err) => {
    console.error('[API] getDeviceInfo错误:', err.message)
    throw err
  })
}
