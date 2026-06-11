/*
 * @Description: 语音播报模块 — 基于 Fvv-UniTTS 原生插件
 * 使用 Android TTS 引擎直接合成语音，无需音频文件
 *
 * 播报示例:
 *   微信收款100元   → "微信收款100元"
 *   支付宝收款12.5元 → "支付宝收款12.5元"
 */

const FvvUniTTS = (typeof uni.requireNativePlugin === 'function')
	? uni.requireNativePlugin('Fvv-UniTTS')
	: null

// 支付方式播报文本映射
const methodTextMap = {
	wechat: '微信收款',
	alipay: '支付宝收款',
	unionpay: '银联收款',
	credit: '银联收款',
	card: '银联收款',
	digital: '数字人民币收款',
}

const state = {
	isTtsInit: false,
}

const mutations = {
	SET_TTS_INIT(state, init) {
		state.isTtsInit = init
	},
}

const actions = {
	/**
	 * 初始化 TTS 引擎
	 */
	init({ commit }) {
		if (!FvvUniTTS) {
			console.error('[TTS] Fvv-UniTTS 插件未安装')
			return
		}

		// 初始化，使用系统默认 TTS 引擎
		FvvUniTTS.init((callback) => {
			console.log('[TTS] 初始化回调:', callback)
			commit('SET_TTS_INIT', true)
			console.log('[TTS] 播报模块就绪')
		})

		// 播放开始回调
		FvvUniTTS.onStart((res) => {
			console.log('[TTS] onStart:', res)
		})

		// 播放完成回调
		FvvUniTTS.onDone((res) => {
			console.log('[TTS] onDone:', res)
		})

		// 错误回调
		FvvUniTTS.onError((res) => {
			console.error('[TTS] onError:', res)
		})
	},

	/**
	 * 播报订单
	 * @param {Object} order 订单对象 { method, totalFee }
	 */
	order({ dispatch }, order) {
		const methodText = methodTextMap[order.method] || '收款'
		const fee = order.totalFee ? Number(order.totalFee) : 0
		// 金额处理：去掉 .00 防止播报"一百点零零元"
		const feeStr = (fee / 100).toFixed(2).replace(/\.00$/, '')
		const text = methodText + feeStr + '元'
		dispatch('speak', { text, id: order.outTradeNo || '0' })
	},

	/**
	 * 播报文本
	 * @param {string} text 中文文本
	 * @param {string} id 播报ID（用于回调识别）
	 */
	speak({ state }, { text, id }) {
		if (state.isTtsInit && FvvUniTTS) {
			FvvUniTTS.speak({ text, id: id || '0' })
			console.log('[TTS] 播报:', text)
		} else {
			uni.showToast({
				duration: 3000,
				icon: 'error',
				title: '播报未初始化',
			})
		}
	},

	/**
	 * 停止播报
	 */
	stop() {
		// Fvv-UniTTS 新的 speak 会自动中断旧的（QUEUE_FLUSH 模式）
		if (FvvUniTTS) {
			FvvUniTTS.speak({ text: '', id: 'stop' })
		}
	},

	/**
	 * 设置 TTS 引擎
	 * @param {string} engineName 引擎包名，如 'com.iflytek.speechcloud'
	 */
	setEngine({}, engineName) {
		if (FvvUniTTS) {
			const result = FvvUniTTS.setEngine(engineName)
			console.log('[TTS] 设置引擎:', engineName, '结果:', result)
		}
	},

	/**
	 * 设置语速
	 * @param {number} rate 语速（默认100）
	 */
	setSpeechRate({}, rate) {
		if (FvvUniTTS) {
			FvvUniTTS.setSpeechRate(rate)
		}
	},

	/**
	 * 设置音调
	 * @param {number} pitch 音调（默认100）
	 */
	setPitch({}, pitch) {
		if (FvvUniTTS) {
			FvvUniTTS.setPitch(pitch)
		}
	},
}

export default {
	namespaced: true,
	state,
	mutations,
	actions,
}
