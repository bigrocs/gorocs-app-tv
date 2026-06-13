/*
 * @Author: BigRocs
 * @Date: 2022-05-07 17:07:41
 * @LastEditTime: 2023-11-27 20:58:28
 * @LastEditors: BigRocs
 * @Description: QQ: 532388887, Email:bigrocs@qq.com
 */
const FvvUniTTS = uni.requireNativePlugin("Fvv-UniTTS");
const state = {
	isTtsInit: false,
}

const mutations = {
}

const actions = {
  init({ commit,state }) {
	FvvUniTTS.init((callback) => {
		state.isTtsInit = true
		actions.speak({ commit,state }, {text:"欢迎使用必诚付",id:"1"})
	},'com.iflytek.speechcloud');
  },
  showMethod(key) {
		switch (key) {
			case 'wechat':
				return '微信支付'
			case 'alipay':
				return '支付宝'
			case 'unionpay':
				return '银联云闪付'
			case 'credit':
				return '信用卡'
			case 'card':
				return '银行卡'
			case 'digital':
				return '数字货币'
		}
  },
  order({ commit,state },order) {
	let method = actions.showMethod(order.method)
	// 替换.00为空防止播报两百点零零元
	let text = "收款"+((order.totalFee ? Number(order.totalFee) : 0)/100).toFixed(2).replace(/\.00/g, '')+"元"
	if (order.operatorName) {
		text = order.operatorName+text
	}else{
		text = method+text
	}
	actions.speak({ commit,state }, {text:text,id:order.id})
  },
  speak({ commit,state },{text,id}) {
	if (state.isTtsInit ) {
		FvvUniTTS.speak({
			text: text,
			id:id,
		})
	}else{
		uni.showToast({
			duration: 3000,
			icon:'error',
			title: "播报未初始化",
		})
	}
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
