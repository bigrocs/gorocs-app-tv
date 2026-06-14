/*
 * @Author: BigRocs
 * @Date: 2022-05-07 17:07:41
 * @LastEditTime: 2023-11-27 20:58:28
 * @LastEditors: BigRocs
 * @Description: QQ: 532388887, Email:bigrocs@qq.com
 * @Description: TTS 语音播报 Vuex 模块
 *
 * 底层走 @/utils/native-tts：按 Fvv-UniTTS 插件源码（UniTTS.java）用 plus.android 直接封装，
 * 不再依赖任何编译型原生插件。该 Vuex 模块在所有平台均可加载，仅 native-tts 内部对
 * plus.android 调用做了 APP-PLUS 条件编译与平台守卫。
 *
 * 公共 API 与历史版本完全一致，调用方（App.vue / mqtt.js / index.nvue）无需改动：
 *   - state.isTtsInit
 *   - action init({commit,state})
 *   - action showMethod(key)
 *   - action order({commit,state},order)
 *   - action speak({commit,state},{text,id,mode})
 *
 * 排障：控制台可直接 require('@/utils/native-tts').default.diagnose() 看引擎 / 中文支持码。
 */
import nativeTts from '@/utils/native-tts'

const state = {
  isTtsInit: false,
}

const mutations = {
  SET_TTS_INIT(state, value) {
    state.isTtsInit = !!value
  },
}

const actions = {
  /**
   * 初始化 TTS 引擎（讯飞 com.iflytek.speechcloud），成功后播报欢迎语。
   * 走 nativeTts.init(callback, engine)：回调拿到 onInit 的 status(0=成功)，
   * 与原插件 init(callback, engine) 同形（对照 UniTTS.java）。
   * 多次 dispatch（App.vue + index.nvue 都会调）会被 native-tts 合并到同一次 onInit，不会重复构造。
   */
  init({ commit, state }) {
    console.log('[store/tts] init | engine=com.iflytek.speechcloud')
    nativeTts.init((status) => {
      const ok = status === 0
      commit('SET_TTS_INIT', ok)
      console.log('[store/tts] init 回调 status=', status, '| ok=', ok, '| isReady=', nativeTts.isReady())
      if (ok) {
        actions.speak({ commit, state }, { text: '欢迎使用必诚付', id: '1' })
      }
    }, 'com.iflytek.speechcloud')
  },

  showMethod(key) {
    switch (key) {
      case 'wechat':
        return '微信支付'
      case 'alipay':
        return '支付宝'
      case 'unionpay':
        return '银联云闪付'
      case 'credit':
        return '信用卡'
      case 'card':
        return '银行卡'
      case 'digital':
        return '数字货币'
    }
  },

  /**
   * 订单收款播报
   * 文案格式与历史版本完全一致：
   *   收款 + 金额(元，去掉 .00) + 元；有 operatorName 则前缀 operatorName，否则前缀支付方式名
   */
  order({ commit, state }, order) {
    const method = actions.showMethod(order.method)
    // 替换.00为空防止播报两百点零零元
    const text = '收款' + ((order.totalFee ? Number(order.totalFee) : 0) / 100).toFixed(2).replace(/\.00/g, '') + '元'
    let final = text
    if (order.operatorName) {
      final = order.operatorName + text
    } else {
      final = method + text
    }
    console.log('[store/tts] order 播报:', final, '| id=', order.id)
    actions.speak({ commit, state }, { text: final, id: order.id })
  },

  /**
   * 播报文本。未就绪时提示“播报未初始化”（保持原 toast 行为）。
   * @param {Object} p
   * @param {string} p.text
   * @param {string|number} [p.id]
   * @param {('flush'|'add')} [p.mode='flush'] 'flush'=清空队列立即播报；'add'=追加队尾（透传为源码 queue 参数）
   */
  speak({ commit, state }, { text, id, mode }) {
    const ready = state.isTtsInit && nativeTts.isReady()
    console.log('[store/tts] speak:', text, '| id=', id, '| mode=', mode || 'flush', '| ready=', ready)
    if (ready) {
      nativeTts.speak({ text: text, id: id, queue: mode || 'flush' })
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
