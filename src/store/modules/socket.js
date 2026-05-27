import { Base64 } from 'js-base64'
import { baseWSUrl } from '@/settings.js'
import store from '@/store'
const state = {
  token: uni.getStorageSync('token'),
  open: false,
  msgQueue: [],
  event: {},
  deviceId: '',
  status: false,
  timer: null,
  timerOut: null,
  order: null,
  orderList: [],
}

const mutations = {
  INIT: (state, deviceId) => {
    state.deviceId = deviceId
    uni.connectSocket({
      url: baseWSUrl,
      header: {
        'content-type': 'application/json',
        'deviceAddress': deviceId
      },
    })
  },
  PUSH_ORDER: (state, data) => {
    const order = JSON.parse(Base64.decode(data))
    // orderList前面插入order
    state.orderList.unshift(order)
    // orderList订单超过50个删掉前面的
    if (state.orderList.length > 50) {
      state.orderList.pop()
    }
    state.order = order
    store.dispatch('tts/order', order) // 语音播报
    // 三秒后清空order
    clearInterval(state.timerOut); //再次清空定时器，防止重复注册定时器
    state.timerOut = null
    state.timerOut = setTimeout(() => {
      state.order = null
    } , 10000)
  },  //... 其他 mutations
  SET_HEALTH_CHECK: (state, received) => {
    state.status = received;
    if (received) {
      state.lastHealthCheckTime = new Date();
    }
  }
}

const actions = {
  webSocket({ commit, state },deviceId) {
    commit('INIT', deviceId) // 初始化
    uni.onSocketOpen((res) => {
      console.log('WebSocket连接已打开！');
      state.status = true
      clearInterval(state.timer); //再次清空定时器，防止重复注册定时器
      state.timer = null
    })
    // 监听WebSocket接受到的消息
    uni.onSocketError((res) => {
      state.status = false
      console.log('WebSocket连接报错:', JSON.stringify(res));
      // 每隔3秒执行一次
      clearInterval(state.timer); //再次清空定时器，防止重复注册定时器
      state.timer = null
      state.timer = setInterval(() => {
        if (!state.status) {
          console.log('WebSocket正在尝试连接！');
          commit('INIT', deviceId)
        }
      }, 5000)
    });
    uni.onSocketClose((res) => {  
      state.status = false
      console.log('WebSocket连接断开，请检查！');
      // 每隔3秒执行一次
      clearInterval(state.timer); //再次清空定时器，防止重复注册定时器
      state.timer = null
      state.timer = setInterval(() => {
        if (!state.status) {
          console.log('WebSocket正在尝试连接！');
          commit('INIT', deviceId)
        }
      }, 5000)                   
    });
    uni.onSocketMessage((res) => {
      if (res.data) {
        const event = JSON.parse(res.data)
        switch (event.MqueueName) {
          case "TV":
            commit('PUSH_ORDER', event.Content)
            break;
          case "health":
            // 处理健康检查消息
            commit('SET_HEALTH_CHECK', true);
            break;
          default:
            break;
        }
      }
    });
    // 添加一个定时器来检查健康检查消息的时间间隔
    setInterval(() => {
      if (state.lastHealthCheckTime && new Date() - state.lastHealthCheckTime > 35000) {
        commit('SET_HEALTH_CHECK', false);
        // 当判断为不健康状态时进行处理
        if (!state.status) {
          console.log('连接不健康，尝试重新连接...');
          commit('INIT', deviceId);
        }
      }
    }, 1000);
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
