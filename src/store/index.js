/*
 * @Description: Vuex Store入口
 */
import Vue from 'vue'
import Vuex from 'vuex'
import getters from './getters'
import user from './modules/user'
import mqtt from './modules/mqtt'
import deviceProps from './modules/device-props'
import iot from './modules/iot'
import seller from './modules/seller'
import institution from './modules/institution'
import settings from './modules/settings'
import tts from './modules/tts'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    $u: {},
    onReachBottom: false,
  },
  mutations: {
    SET_U: (state, u) => {
      state.$u = u
    },
    ON_REACH_BOTTOM: (state) => {
      state.onReachBottom = !state.onReachBottom
    },
  },
  actions: {
    setU({ commit }, u) {
      commit('SET_U', u)
    },
    onReachBottom({ commit }) {
      commit('ON_REACH_BOTTOM')
    },
  },
  modules: {
    user,
    mqtt,
    deviceProps,
    iot,
    seller,
    settings,
    institution,
    tts,
  },
  getters,
})

export default store
