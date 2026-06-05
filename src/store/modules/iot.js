/*
 * @Description: IoT设备信息模块 — 获取MQTT连接凭证和设备配置
 */
import store from '@/store'
import { getDeviceInfo } from '@/api/iot/iotInfo'

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
  },
  SET_LOADING(state, loading) {
    state.loading = loading
  },
  SET_ERROR(state, error) {
    state.error = error
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
  },
}

const actions = {
  async fetchDeviceInfo({ commit }) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', '')
    const deviceProps = store.state.deviceProps
    const label = deviceProps.label
    const deviceSn = deviceProps.deviceSn
    try {
      const info = await getDeviceInfo(label, deviceSn)
      if (!info) {
        commit('SET_ERROR', '获取设备信息返回为空')
        uni.showModal({ title: '设备异常', content: '获取设备信息返回为空', showCancel: false })
        return
      }
      commit('SET_IOT_INFO', info)
    } catch (e) {
      commit('SET_ERROR', e.message || '获取设备信息失败')
      console.error('[iot] 获取设备信息失败:', e)
    } finally {
      commit('SET_LOADING', false)
    }
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
