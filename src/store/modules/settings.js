import { baseUrl } from '@/settings'
const state = {
  payQrcodeUrl: '',
}

const mutations = {
  CHANGE_SETTING: (state, { key, value }) => {
    if (state.hasOwnProperty(key)) {
      state[key] = value
    }
  }
}

const actions = {
  changeSetting({ commit }, data) {
    commit('CHANGE_SETTING', data)
  },
  initConfig({ commit }) {
    uni.request({
      url: baseUrl+'user-api/configs/get',
      method: 'POST',
      data: {
          config:{
            id: 'SYS_PAY_CODE_URL'
          }
      },
      success: (res) => {
        commit('CHANGE_SETTING', {
              key: 'payQrcodeUrl',
              value: res.data.config.value
            })
      },
      fail: (error) => {
        console.log("initConfig"+ JSON.stringify(error));
      }
    })
  },
}
export default {
  namespaced: true,
  state,
  mutations,
  actions
}
