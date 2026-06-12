/*
 * @Description: IoT设备信息模块 — 获取MQTT连接凭证和设备配置
 */
import store from '@/store'
import { getDeviceInfo } from '@/api/iot/iotInfo'
import { generateQRCode } from '@/utils/qrcode'

const state = {
  config: null,
  loginType: '',
  messagePush: '',
  mqttInfo: null,
  payChannel: null,
  printBottomText: '',
  qrcodes: null,
  returnCode: '',
  returnMsg: '',
  sellerId: '',
  sellerName: '',
  service: '',
  loading: false,
  error: '',
  /** 设备未绑定时生成的二维码 Data URL，非空则显示绑定弹窗 */
  qrcodeDataUrl: '',
}

const mutations = {
  SET_IOT_INFO(state, info) {
    if (info.config) state.config = info.config
    if (info.loginType) state.loginType = info.loginType
    if (info.messagePush) state.messagePush = info.messagePush
    if (info.mqttInfo) state.mqttInfo = info.mqttInfo
    if (info.payChannel) state.payChannel = info.payChannel
    if (info.printBottomText) state.printBottomText = info.printBottomText
    if (info.qrcodes) state.qrcodes = info.qrcodes
    if (info.returnCode) state.returnCode = info.returnCode
    if (info.returnMsg) state.returnMsg = info.returnMsg
    if (info.sellerId) state.sellerId = info.sellerId
    if (info.sellerName) state.sellerName = info.sellerName
    if (info.service) state.service = info.service
    // 设备已绑定，清除二维码
    state.qrcodeDataUrl = ''
  },
  SET_LOADING(state, loading) {
    state.loading = loading
  },
  SET_ERROR(state, error) {
    state.error = error
  },
  SET_QRCODE_DATA_URL(state, url) {
    state.qrcodeDataUrl = url
  },
  CLEAR_IOT(state) {
    state.config = null
    state.loginType = ''
    state.messagePush = ''
    state.mqttInfo = null
    state.payChannel = null
    state.printBottomText = ''
    state.qrcodes = null
    state.returnCode = ''
    state.returnMsg = ''
    state.sellerId = ''
    state.sellerName = ''
    state.service = ''
    state.error = ''
    state.qrcodeDataUrl = ''
  },
}

const actions = {
  async fetchDeviceInfo({ commit }) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', '')
    try {
      const info = await getDeviceInfo(store.state.deviceProps.deviceSn)
      if (!info) {
        commit('SET_ERROR', '获取设备信息返回为空')
        // 设备未绑定，生成二维码
        _generateBindQrcode(commit)
        return
      }
      commit('SET_IOT_INFO', info)
    } catch (e) {
      commit('SET_ERROR', e.message || '获取设备信息失败')
      console.error('[iot] 获取设备信息失败:', e)
      // 设备未绑定，生成二维码
      _generateBindQrcode(commit)
    } finally {
      commit('SET_LOADING', false)
    }
  },
}

/**
 * 生成设备绑定二维码（与 gorocs-tv 项目链接格式一致）
 */
function _generateBindQrcode(commit) {
  const { deviceSn } = store.state.deviceProps
  if (deviceSn) {
    // service 固定为 BICHENG，label 固定为 TV
    const url = `https://mock1024.github.io/installer/?deviceSn=${deviceSn}&label=TV&service=BICHENG`
    const dataUrl = generateQRCode(url)
    commit('SET_QRCODE_DATA_URL', dataUrl)
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
