/*
 * @Description: MQTT客户端模块 — 管理MQTT连接和订单消息
 */
import mqtt from 'mqtt/dist/mqtt.js'
import store from '@/store'

const state = {
  client: null,
  connected: false,
  connecting: false,
  orderList: [],
  lastOrder: null,
  mqttInfo: null,
  tokenRefreshTimer: null,
  reconnectTimer: null,
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
  SET_RECONNECT_TIMER(state, timer) {
    state.reconnectTimer = timer
  },
  PUSH_ORDER(state, order) {
    const existIdx = state.orderList.findIndex((o) => o.outTradeNo === order.outTradeNo)
    if (existIdx !== -1) {
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
  CLEAR_ORDERS(state) {
    state.orderList = []
    state.lastOrder = null
  },
}

const actions = {
  /**
   * 建立MQTT连接
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
      reconnectPeriod: 0,
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
        if (data && data.outTradeNo) {
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
      console.log('[mqtt] 连接断开')
      commit('SET_CONNECTED', false)
      store.dispatch('mqtt/scheduleReconnect')
    })
  },

  /**
   * 处理收到的订单消息
   * MQTT推送的order对象直接包含: outTradeNo, status(1=成功/0=支付中/-1=关闭), totalFee(分), method, createdAt等
   */
  handleOrder({ commit }, order) {
    commit('PUSH_ORDER', order)
    // 成功支付的订单触发语音播报
    if (order.status === 1 && order.totalFee > 0) {
      store.dispatch('tts/order', order)
    }
  },

  /**
   * 安排重新连接(10秒延迟)
   */
  scheduleReconnect({ commit, state }) {
    if (state.reconnectTimer || state.connecting) return
    const timer = setTimeout(() => {
      commit('SET_RECONNECT_TIMER', null)
      if (state.mqttInfo) {
        store.dispatch('mqtt/connect', state.mqttInfo)
      }
    }, 10000)
    commit('SET_RECONNECT_TIMER', timer)
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
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer)
      commit('SET_RECONNECT_TIMER', null)
    }
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
