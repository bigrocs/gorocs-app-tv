const state = {
  date: new Date(), // 修改数据date
}

const mutations = {
}

const actions = {
}

setInterval(() => {
  state.date = new Date() // 修改数据date
}, 500)

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
