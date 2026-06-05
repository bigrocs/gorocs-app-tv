/*
 * @Description: Vuex全局getters
 */
export default {
  token: (state) => state.user.token,
  avatar: (state) => state.user.avatar,
  username: (state) => state.user.username,
  name: (state) => state.user.name,
  balance: (state) => state.user.balance,
  userId: (state) => state.user.userId,
  roles: (state) => state.user.roles,
  openid: (state) => state.user.openid,
  appid: (state) => state.user.appid,
  mqttConnected: (state) => state.mqtt.connected,
  orderList: (state) => state.mqtt.orderList,
  lastOrder: (state) => state.mqtt.lastOrder,
  deviceConfig: (state) => state.iot.config,
  deviceSn: (state) => state.deviceProps.deviceSn,
  mqttConnecting: (state) => state.mqtt.connecting,
}
