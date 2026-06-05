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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error('请求失败: HTTP ' + res.statusCode))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败'))
    })
  })
}

/**
 * 获取设备信息(包含MQTT连接凭证)
 * @param {string} label - 设备型号
 * @param {string} deviceSn - 设备序列号
 * @returns {Promise<Object|null>} DeviceInfo
 */
export function getDeviceInfo(label, deviceSn) {
  const params = {
    bizContent: {
      service: 'TV',
      label: label,
      deviceSn: deviceSn
    },
    appId: '1778077994a85f55fd5b09',
    signType: 'RSA2'
  }

  const signature = rsa2Sign(params)

  const requestBody = Object.assign({}, params, { sign: signature })

  return uniPost(baseUrl + 'api/iot/secure/getIotInfo', requestBody).then((data) => {
    if (!data.content) {
      throw new Error('获取设备信息返回为空')
    }

    let content = data.content
    if (typeof content === 'string') {
      content = JSON.parse(content)
    }

    if (data.sign) {
      const isValid = verifySign(content, data.sign)
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

    return content
  })
}
