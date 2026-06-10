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
        const rawId = sysInfo.deviceId || ''
        // 取后20位作为设备SN，与设备标签格式一致（如SMIT3B2021A18000523）
        const sn = rawId.length > 20 ? rawId.slice(-20) : rawId
        commit('SET_DEVICE_SN', sn)
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
