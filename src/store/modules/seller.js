const state = {
    initCache: false,
    orderInfoCache: "", // 订单信息缓存
    facePayCont: 0, // 打开次数[控制第一次自动进入facePay页面]
}

const mutations = {
    SER_ORDER_INFO_CACHE: (state, item) => {
        state.orderInfoCache = item
    },
    CHANGE_INIT_CACHE: (state) => {
        state.initCache = !state.initCache
    },
    ADD_FACE_PAY_CONT: (state) => {
        state.facePayCont++
    }
}

const actions = {
    setOrderInfoCache({ commit }, item) {
        commit('SER_ORDER_INFO_CACHE', item)
    },
    changeInitCache({ commit }) {
        commit('CHANGE_INIT_CACHE')
    },
    addFacePayCont({ commit }) {
        commit('ADD_FACE_PAY_CONT')
    }
}

export default {
    namespaced: true,
    state,
    mutations,
    actions
}
