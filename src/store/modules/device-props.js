/*
 * @Description: 设备属性模块 — 获取设备SN和型号
 */

const state = {
  deviceSn: '',
  label: '',
}

const mutations = {
  SET_DEVICE_SN(state, sn) {
    state.deviceSn = sn
  },
  SET_LABEL(state, label) {
    state.label = label
  },
}

const actions = {
  fetchProps({ commit }) {
    return new Promise((resolve) => {
      try {
        const sysInfo = uni.getSystemInfoSync()
        commit('SET_DEVICE_SN', sysInfo.deviceId || '')
        commit('SET_LABEL', sysInfo.model || 'AndroidTV')
      } catch (e) {
        console.warn('[device-props] 获取设备信息失败:', e)
        commit('SET_LABEL', 'AndroidTV')
      }
      resolve()
    })
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
