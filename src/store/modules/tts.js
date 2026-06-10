/*
 * @Description: 语音播报模块 — 基于 mp3 音频文件拼接播报
 * 将金额拆分为音频片段顺序播放，例如：
 *   微信收款100元 → [wechat, one, bai, yuan]
 *   支付宝收款12.5元 → [alipay, one, shi, two, dian, five, yuan]
 */

const AUDIO_BASE = '/static/audio/'

// 支付方式音频映射
const methodAudioMap = {
	wechat: 'wechat',
	alipay: 'alipay',
	unionpay: 'unionpay',
	credit: 'unionpay',
	card: 'unionpay',
	digital: 'unionpay',
}

// 数字 0-9 音频名
const digitAudio = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * 将金额（分）转换为音频文件名列表
 * @param {number} fen 金额（分）
 * @returns {string[]} 音频文件名列表（不含路径和扩展名）
 */
function feeToAudioList(fen) {
	const list = []
	if (fen <= 0) return list

	// 转为元，保留最多2位小数
	const yuan = fen / 100
	const str = yuan.toFixed(2)

	// 去掉末尾多余的0: "100.00" → "100", "12.50" → "12.5", "12.05" → "12.05"
	let numStr = str.replace(/0+$/, '').replace(/\.$/, '')

	// 拆分整数和小数部分
	const parts = numStr.split('.')
	const intPart = parts[0]
	const decPart = parts.length > 1 ? parts[1] : ''

	// 解析整数部分
	parseInteger(intPart, list)

	// 解析小数部分
	if (decPart.length > 0) {
		// 整数部分为0时先播报'零'
		if (parseInt(intPart) === 0) {
			list.push('0')
		}
		list.push('unit_dian')
		for (let i = 0; i < decPart.length; i++) {
			const d = parseInt(decPart[i])
			list.push(digitAudio[d])
		}
	}

	list.push('unit_yuan')
	return list
}

/**
 * 解析整数部分，生成中文数字音频序列
 * 支持范围: 0 ~ 99999999
 */
function parseInteger(intStr, list) {
	const num = parseInt(intStr)
	if (num === 0) return

	// 拆分为 "万" 段和 "个" 段
	const wanPart = Math.floor(num / 10000)
	const gePart = num % 10000

	if (wanPart > 0) {
		parseFourDigits(wanPart, list)
		list.push('unit_wan')
		if (gePart > 0 && gePart < 1000) {
			// 补零: 10001 → 一万零一
			list.push('0')
		}
	}

	if (gePart > 0) {
		parseFourDigits(gePart, list)
	} else if (wanPart > 0) {
		// 整万，不加额外音频
	}
}

/**
 * 解析1-4位数字，生成中文数字音频
 * 例如: 123 → [one, bai, two, shi, three]
 *       1005 → [one, qian, zero, zero, five]
 */
function parseFourDigits(n, list) {
	const qian = Math.floor(n / 1000)
	const bai = Math.floor((n % 1000) / 100)
	const shi = Math.floor((n % 100) / 10)
	const ge = n % 10

	if (qian > 0) {
		list.push(digitAudio[qian])
		list.push('unit_qian')
		// 百位为零需要补零
		if (bai === 0 && (shi > 0 || ge > 0)) {
			list.push('0')
		}
	}

	if (bai > 0) {
		list.push(digitAudio[bai])
		list.push('unit_bai')
		// 十位为零需要补零
		if (shi === 0 && ge > 0) {
			list.push('0')
		}
	}

	if (shi > 0) {
		list.push(digitAudio[shi])
		list.push('unit_shi')
	} else if (shi === 0 && bai > 0 && ge === 0) {
		// 百位有值、十位和个位都为零，不加
	}

	if (ge > 0) {
		list.push(digitAudio[ge])
	}
}

/**
 * 音频播放器 — 按顺序播放音频列表，支持中断新播报
 */
class AudioPlayer {
	constructor() {
		this.innerAudio = null
		this.playing = false
		this.currentList = []
		this.currentIndex = 0
		this._playNext = this._playNext.bind(this)
	}

	init() {
		// #ifdef APP-PLUS
		this.innerAudio = uni.createInnerAudioContext()
		this.innerAudio.onEnded(this._playNext)
		this.innerAudio.onError((err) => {
			console.error('[Audio] 播放错误:', err)
			this._playNext()
		})
		// #endif
		console.log('[Audio] 初始化成功')
	}

	/**
	 * 播放音频列表，会中断当前播报
	 * @param {string[]} audioNames 音频文件名列表
	 */
	play(audioNames) {
		if (!audioNames || audioNames.length === 0) return
		this.stop()
		this.currentList = audioNames.map(name => AUDIO_BASE + name + '.mp3')
		this.currentIndex = 0
		this.playing = true
		this._playCurrent()
	}

	stop() {
		this.playing = false
		if (this.innerAudio) {
			this.innerAudio.stop()
		}
		this.currentList = []
		this.currentIndex = 0
	}

	_playCurrent() {
		if (!this.playing || this.currentIndex >= this.currentList.length) {
			this.playing = false
			return
		}
		// #ifdef APP-PLUS
		this.innerAudio.src = this.currentList[this.currentIndex]
		this.innerAudio.play()
		// #endif
	}

	_playNext() {
		if (!this.playing) return
		this.currentIndex++
		if (this.currentIndex >= this.currentList.length) {
			this.playing = false
			return
		}
		this._playCurrent()
	}

	destroy() {
		this.stop()
		if (this.innerAudio) {
			this.innerAudio.destroy()
			this.innerAudio = null
		}
	}
}



// 单例
const player = new AudioPlayer()

const state = {
	isTtsInit: false,
}

const mutations = {
	SET_TTS_INIT(state, init) {
		state.isTtsInit = init
	},
}

const actions = {
	init({ commit }) {
		player.init()
		commit('SET_TTS_INIT', true)
		// 欢迎语：微信收款零元（播报"欢迎使用"没有对应音频，直接静默初始化）
		console.log('[Audio] 播报模块就绪')
	},

	/**
	 * 播报订单
	 * @param {Object} order 订单对象 { method, totalFee, operatorName }
	 */
	order({ dispatch }, order) {
		// 1. 支付方式音频
		const methodAudio = methodAudioMap[order.method] || 'unionpay'

		// 2. 金额音频序列
		const fee = order.totalFee ? Number(order.totalFee) : 0
		const feeAudioList = feeToAudioList(fee)

		// 3. 拼接: [支付方式] + [金额序列]
		const audioList = [methodAudio, ...feeAudioList]

		console.log('[Audio] 播报:', audioList.join(' + '))
		dispatch('playList', { audioList })
	},

	/**
	 * 播放音频列表
	 */
	playList({ state }, { audioList }) {
		if (state.isTtsInit) {
			player.play(audioList)
		} else {
			uni.showToast({
				duration: 3000,
				icon: 'error',
				title: '播报未初始化',
			})
		}
	},

	/**
	 * 停止播放
	 */
	stop() {
		player.stop()
	},
}

export default {
	namespaced: true,
	state,
	mutations,
	actions,
}
