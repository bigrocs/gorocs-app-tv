/*
 * @Description: MQTT客户端模块 — 管理MQTT连接和订单消息
 */
import mqtt from 'mqtt/dist/mqtt.js'
import store from '@/store'
import { isPaying } from '@/utils/order'

const state = {
  client: null,
  connected: false,
  connecting: false,
  orderList: [],
  lastOrder: null,
  mqttInfo: null,
  tokenRefreshTimer: null,
  // 取消支付：支付中订单号队列(FIFO，最大容量3) / 被取消订单(预留单条展示钩子)
  payingQueue: [],
  lastCancelledOrder: null,
}

const mutations = {
  SET_CONNECTED(state, connected) {
    state.connected = connected
  },
  SET_CONNECTING(state, connecting) {
    state.connecting = connecting
  },
  SET_MQTT_INFO(state, mqttInfo) {
    state.mqttInfo = mqttInfo
  },
  SET_CLIENT(state, client) {
    state.client = client
  },
  SET_TOKEN_REFRESH_TIMER(state, timer) {
    state.tokenRefreshTimer = timer
  },
  PUSH_ORDER(state, order) {
    const existIdx = state.orderList.findIndex((o) => o.outTradeNo === order.outTradeNo)
    if (existIdx !== -1) {
      // 终态锁定：已顾客取消支付(-10)的订单不再变化
      if (state.orderList[existIdx].status === -10) return
      // 状态未变化则跳过
      if (state.orderList[existIdx].status === order.status) return
      state.orderList.splice(existIdx, 1, order)
    } else {
      // 新订单插入头部
      state.orderList.unshift(order)
      if (state.orderList.length > 50) {
        state.orderList.pop()
      }
    }
    state.lastOrder = order
  },
  // 取消队列里唯一的一笔支付中订单（仅在 payingQueue.length===1 时调用：单订单无歧义）
  CANCEL_SOLE_PAYING(state) {
    const outTradeNo = state.payingQueue[0]
    state.payingQueue = state.payingQueue.slice(1)
    const idx = state.orderList.findIndex((o) => o.outTradeNo === outTradeNo)
    if (idx === -1) return // 已被淘汰出列表
    const cancelled = Object.assign({}, state.orderList[idx], { status: -10 })
    state.orderList.splice(idx, 1, cancelled)
    state.lastCancelledOrder = cancelled
  },
  // 维护支付中订单号队列：支付中入列，非支付中出列；第4笔入列时清空仅保留新单（容错，恢复单订单判定）
  SYNC_PAYING_QUEUE(state, { outTradeNo, paying }) {
    if (!outTradeNo) return
    const idx = state.payingQueue.indexOf(outTradeNo)
    if (paying && idx === -1) {
      if (state.payingQueue.length >= 3) {
        state.payingQueue = [outTradeNo]
      } else {
        state.payingQueue = state.payingQueue.concat(outTradeNo)
      }
    } else if (!paying && idx !== -1) {
      state.payingQueue = state.payingQueue.filter((no) => no !== outTradeNo)
    }
  },
  CLEAR_ORDERS(state) {
    state.orderList = []
    state.lastOrder = null
    state.payingQueue = []
    state.lastCancelledOrder = null
  },
}

const actions = {
  /**
   * 建立MQTT连接
   * 重连策略：依赖 mqtt.js 内置 reconnectPeriod 自动重连（与 gorocs-tv 参考实现一致），
   * 不再使用手动 scheduleReconnect 定时器。
   */
  connect({ commit, state }, mqttInfo) {
    if (!mqttInfo.wsUrl) {
      console.warn('[mqtt] wsUrl 不存在，跳过连接')
      return
    }
    if (state.connecting) {
      console.warn('[mqtt] 正在连接中，跳过重复调用')
      return
    }

    commit('SET_MQTT_INFO', mqttInfo)

    // 销毁旧连接
    if (state.client) {
      try {
        state.client.removeAllListeners()
        state.client.end(true)
      } catch (e) {
        console.warn('[mqtt] 关闭旧连接异常:', e)
      }
      commit('SET_CLIENT', null)
    }

    commit('SET_CONNECTING', true)

    const { wsUrl, clientId, token, topic } = mqttInfo

    // APP-PLUS端需要将 wss:// 转换为 wxs://，ws:// 转换为 wx://
    let url = wsUrl
    // #ifdef APP-PLUS
    url = wsUrl.replace(/^wss:\/\//, 'wxs://').replace(/^ws:\/\//, 'wx://')
    // #endif

    const options = {
      clientId,
      username: '',
      password: token,
      protocolVersion: 4,
      keepalive: 30,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      clean: true,
    }

    const client = mqtt.connect(url, options)
    commit('SET_CLIENT', client)

    client.on('connect', () => {
      console.log('[mqtt] 连接成功')
      commit('SET_CONNECTING', false)
      commit('SET_CONNECTED', true)
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error('[mqtt] 订阅失败:', err)
        } else {
          console.log('[mqtt] 订阅成功:', topic)
        }
      })
    })

    client.on('message', (_topic, payload) => {
      try {
        const data = JSON.parse(payload.toString())
        // 取消广播(-10)无订单号，需单独放行；其余消息需带 outTradeNo
        if (data && (data.outTradeNo || data.status === -10)) {
          store.dispatch('mqtt/handleOrder', data)
        }
      } catch (e) {
        console.error('[mqtt] 消息解析失败:', e)
      }
    })

    client.on('error', (err) => {
      console.error('[mqtt] 连接错误:', err)
      commit('SET_CONNECTING', false)
    })

    client.on('close', () => {
      commit('SET_CONNECTING', false)
      commit('SET_CONNECTED', false)
    })

    client.on('offline', () => {
      console.log('[mqtt] 连接断开，等待内置重连')
      commit('SET_CONNECTED', false)
    })
  },

  /**
   * 处理收到的订单消息
   * status：1=成功 / 0=支付中 / -1=关闭 / -10=顾客取消支付
   * 取消广播(-10)仅含状态码、无订单号，与订单状态变更解耦：每条播报一次"顾客取消支付"
   *（对齐参考项目 gorocs-tv 的 cancelVoiceSeq 逻辑；该项目播报在页面层 watch，
   *  本项目 APP-PLUS 端页面层未实现 TTS，故在 store 内触发播报）。
   */
  handleOrder({ commit, state }, order) {
    // 顾客取消支付广播（仅含状态码、无订单号）：每条播报一次；
    // 仅当支付中队列恰好剩 1 笔时取消该单（单订单无歧义），并发多笔(>=2)无法定位则仅播报。
    if (order.status === -10) {
      store.dispatch('tts/speak', { text: '顾客取消支付', id: 'cancel' })
      if (state.payingQueue.length === 1) {
        commit('CANCEL_SOLE_PAYING')
      }
      return
    }
    commit('PUSH_ORDER', order)
    // 维护支付中队列：支付中(非退款)入列，离开则出列
    commit('SYNC_PAYING_QUEUE', {
      outTradeNo: order.outTradeNo,
      paying: isPaying(order.status) && order.totalFee >= 0,
    })
    // 成功支付的订单触发语音播报
    if (order.status === 1 && order.totalFee > 0) {
      store.dispatch('tts/order', order)
    }
  },

  /**
   * 安排Token刷新(到期前30分钟)
   */
  scheduleTokenRefresh({ commit, state }) {
    if (state.tokenRefreshTimer) {
      clearTimeout(state.tokenRefreshTimer)
      commit('SET_TOKEN_REFRESH_TIMER', null)
    }
    if (!state.mqttInfo) return

    const now = Math.floor(Date.now() / 1000)
    const refreshAt = state.mqttInfo.tokenExpireTime - 1800
    const delay = Math.max(0, (refreshAt - now) * 1000)

    console.log('[mqtt] Token刷新定时:', Math.round(delay / 1000) + '秒后')
    const timer = setTimeout(() => {
      console.log('[mqtt] 刷新Token...')
      store.dispatch('iot/fetchDeviceInfo').then(() => {
        const mqttInfo = store.state.iot ? store.state.iot.mqttInfo : null
        if (mqttInfo) {
          store.dispatch('mqtt/connect', mqttInfo)
          store.dispatch('mqtt/scheduleTokenRefresh')
        }
      })
    }, delay)
    commit('SET_TOKEN_REFRESH_TIMER', timer)
  },

  /**
   * 断开MQTT连接
   */
  disconnect({ commit, state }) {
    if (state.tokenRefreshTimer) {
      clearTimeout(state.tokenRefreshTimer)
      commit('SET_TOKEN_REFRESH_TIMER', null)
    }
    if (state.client) {
      try {
        state.client.removeAllListeners()
        state.client.end(true)
      } catch (e) {
        console.warn('[mqtt] 断开连接异常:', e)
      }
    }
    commit('SET_CLIENT', null)
    commit('SET_CONNECTED', false)
    commit('SET_CONNECTING', false)
  },

  /**
   * 清空所有数据
   */
  clear({ commit, dispatch }) {
    dispatch('disconnect')
    commit('CLEAR_ORDERS')
    commit('SET_MQTT_INFO', null)
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
