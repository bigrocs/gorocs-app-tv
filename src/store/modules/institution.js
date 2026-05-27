const state = {
    initCache: false,
    orderInfoCache: "", // 订单信息缓存
}

const mutations = {
    SER_ORDER_INFO_CACHE: (state, item) => {
        state.orderInfoCache = item
    },
    CHANGE_INIT_CACHE: (state) => {
        state.initCache = !state.initCache
    },
}

const actions = {
    setOrderInfoCache({ commit }, item) {
        commit('SER_ORDER_INFO_CACHE', item)
    },
    changeInitCache({ commit }) {
        commit('CHANGE_INIT_CACHE')
    },
}

export default {
    namespaced: true,
    state,
    mutations,
    actions
}
