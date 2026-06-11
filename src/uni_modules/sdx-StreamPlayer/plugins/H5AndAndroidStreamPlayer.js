/**
 * 二进制音频播放-h5api
 * 在app中使用renderjs调用
 * 因为iOS不支持MediaSource，所以暂不支持iOS
 */
export class StreamPlayer {
	constructor() {
		this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
		this.mediaSource = new MediaSource()
		this.audio = new Audio()
		this.cacheBuffers = []
		this.audio.src = URL.createObjectURL(this.mediaSource)

		this.audioContextConnect()
		this.listenMedisSource()
	}

	// 连接音频上下文
	audioContextConnect() {
		const source = this.audioContext.createMediaElementSource(this.audio)
		source.connect(this.audioContext.destination)
	}

	// 监听媒体资源
	listenMedisSource() {
		this?.mediaSource.addEventListener('sourceopen', () => {
			if (this.sourceBuffer) return
			this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg')
			this.sourceBuffer.addEventListener('update', () => {
				if (this.cacheBuffers?.length && !this.sourceBuffer?.updating) {
					const cacheBuffer = this.cacheBuffers.shift()
					this.sourceBuffer?.appendBuffer(cacheBuffer)
				}
				this._pauseAudio()
			})
		})
	}

	// 暂停音频
	_pauseAudio() {
		const neePlayTime = this.sourceBuffer.timestampOffset - this.audio.currentTime || 0
		this.pauseTimer && clearTimeout(this.pauseTimer)
		// 播放完成5秒后还没有新的音频流过来，则暂停音频播放
		this.pauseTimer = setTimeout(() => this.audio.pause(), neePlayTime * 1000 + 5000)
	}
	_playAudio() {
		// 为防止下一段音频流传输过来时，上一段音频已经播放完毕，造成音频卡顿现象，
		// 这里做了1秒的延时，可根据实际情况修正
		setTimeout(() => {
			if (this.audio.paused) {
				try {
					this.audio.play()
				} catch (e) {
					this._playAudio()
				}
			}
		}, 1000)
	}

	// 接收音频数据
	appendChunk(audioData) {
		if (!audioData?.byteLength) return

		if (this.sourceBuffer?.updating) {
			this.cacheBuffers.push(audioData)
		} else {
			this.sourceBuffer.appendBuffer(audioData)
		}

		this._playAudio()
	}
}