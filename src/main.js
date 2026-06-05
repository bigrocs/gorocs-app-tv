import Vue from 'vue'
import App from './App'
import store from './store'

// #ifndef MP
// 处理 uni.connectSocket 兼容问题，确保 mqtt.js 在 APP-PLUS 下正常工作
uni.connectSocket = (function(connectSocket) {
  return function(options) {
    options.success = options.success || function() {}
    return connectSocket.call(this, options)
  }
})(uni.connectSocket)
// #endif

Vue.use(store)

Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  store,
  ...App
})
app.$mount()
