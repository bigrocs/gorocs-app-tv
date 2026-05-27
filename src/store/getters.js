const getters = {
  token: state => state.user.token,
  avatar: state => state.user.avatar,
  username: state => state.user.username,
  name: state => state.user.name,
  balance: state => state.user.balance,
  userId: state => state.user.userId,
  roles: state => state.user.roles,
  openid: state => state.user.openid,
  appid: state => state.user.appid,
}
export default getters
