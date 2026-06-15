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
import { playMp3 } from '@/utils/audio-mp3'

/**
 * 支付方式 → 预录 MP3 映射（文件位于 /static/audio/）。
 * 命中：先播该 MP3，onEnded 后再 TTS 金额；
 * 未命中（credit 信用卡 / card 银行卡 / digital 数字货币）：不播报支付方式，仅 TTS 金额。
 */
const METHOD_MP3 = {
  wechat: 'wechat.mp3',
  alipay: 'alipay.mp3',
  unionpay: 'unionpay.mp3',
}

const state = {
  isTtsInit: false,
  welcomePlayed: false,
}

const mutations = {
  SET_TTS_INIT(state, value) {
    state.isTtsInit = !!value
  },
  SET_WELCOME_PLAYED(state, value) {
    state.welcomePlayed = !!value
  },
}

const actions = {
  /**
   * 初始化 TTS 引擎（讯飞 com.iflytek.speechcloud），成功后播报欢迎语 MP3。
   * 走 nativeTts.init(callback, engine)：回调拿到 onInit 的 status(0=成功)，
   * 与原插件 init(callback, engine) 同形（对照 UniTTS.java）。
   * 多次 dispatch（App.vue + index.nvue 都会调）会被 native-tts 合并到同一次 onInit，不会重复构造；
   * 但两个回调都会触发，用 welcomePlayed 守卫保证欢迎 MP3 只播一遍。
   */
  init({ commit, state }) {
    console.log('[store/tts] init | engine=com.iflytek.speechcloud')
    nativeTts.init((status) => {
      const ok = status === 0
      commit('SET_TTS_INIT', ok)
      console.log('[store/tts] init 回调 status=', status, '| ok=', ok, '| isReady=', nativeTts.isReady())
      if (ok && !state.welcomePlayed) {
        commit('SET_WELCOME_PLAYED', true)
        playMp3('welcomeusechengyi.mp3')
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
   * 订单收款播报（固定文案走 MP3，动态金额走 TTS）：
   *   1) 有 operatorName：TTS 整句 "姓名收款X元"（姓名无 MP3）
   *   2) 无 operatorName 且方式命中 METHOD_MP3：先 MP3，onEnded 后再 TTS "收款X元"
   *   3) 无 operatorName 且方式未命中（信用卡/银行卡/数字货币）：不播报方式，仅 TTS "收款X元"
   * 金额部分始终 TTS（金额动态、无法预录）。
   */
  order({ commit, state }, order) {
    // 替换.00为空防止播报两百点零零元
    const amountText = '收款' + ((order.totalFee ? Number(order.totalFee) : 0) / 100).toFixed(2).replace(/\.00/g, '') + '元'

    // 1) 有 operatorName：TTS 整句（姓名无 MP3）
    if (order.operatorName) {
      const final = order.operatorName + amountText
      console.log('[store/tts] order 播报(operatorName):', final, '| id=', order.id)
      actions.speak({ commit, state }, { text: final, id: order.id })
      return
    }

    // 2) 支付方式有 MP3：先 MP3，播完再 TTS 金额
    const mp3 = METHOD_MP3[order.method]
    if (mp3) {
      console.log('[store/tts] order 播报(MP3+TTS):', mp3, '+', amountText, '| id=', order.id)
      playMp3(mp3).then(() => {
        actions.speak({ commit, state }, { text: amountText, id: order.id })
      })
      return
    }

    // 3) 信用卡/银行卡/数字货币：不播报方式，仅 TTS 金额
    console.log('[store/tts] order 播报(仅金额, method=', order.method, '):', amountText, '| id=', order.id)
    actions.speak({ commit, state }, { text: amountText, id: order.id })
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
