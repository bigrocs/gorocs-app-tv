/*
 * @Description: TTS语音播报模块 — 使用科大讯飞原生插件
 */
import { getMethodName } from '@/utils/order'

const FvvUniTTS = (typeof uni.requireNativePlugin === 'function')
  ? uni.requireNativePlugin('Fvv-UniTTS')
  : null

const state = {
  isTtsInit: false,
}

const mutations = {
  SET_TTS_INIT(state, init) {
    state.isTtsInit = init
  },
}

const actions = {
  init({ commit, state }) {
    if (!FvvUniTTS) return
    FvvUniTTS.init((callback) => {
      commit('SET_TTS_INIT', true)
      // 欢迎语播报
      if (FvvUniTTS) {
        FvvUniTTS.speak({ text: '欢迎使用必诚付', id: '1' })
      }
    }, 'com.iflytek.speechcloud')
  },

  order({ dispatch }, order) {
    const method = getMethodName(order.method)
    // 替换.00为空防止播报"两百点零零元"
    const fee = ((order.totalFee ? Number(order.totalFee) : 0) / 100)
      .toFixed(2)
      .replace(/\.00/g, '')
    let text = '收款' + fee + '元'
    if (order.operatorName) {
      text = order.operatorName + text
    } else {
      text = method + text
    }
    dispatch('speak', { text, id: order.id })
  },

  speak({ state }, { text, id }) {
    if (state.isTtsInit && FvvUniTTS) {
      FvvUniTTS.speak({ text, id })
    } else {
      uni.showToast({
        duration: 3000,
        icon: 'error',
        title: '播报未初始化',
      })
    }
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
