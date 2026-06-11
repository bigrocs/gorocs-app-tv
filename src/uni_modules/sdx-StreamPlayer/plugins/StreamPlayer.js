/**
 * 支持安卓、iOS、H5的pcm格式，
 * 如果想支持mp3，需要增加mp3相关解码合并处理等，个人测试效果不太好，所以没有加
 */
export class StreamPlayer {
	constructor({
		inputSampleRate = 16000,
		numChannels = 1,
		bitDepth = 16,
		littleEndian = true,
		pcmType = 'int',
		callback = ()=>{}
	} = {}) {
		// 参数校验
		if (![16, 32].includes(bitDepth)) throw new Error('bitDepth 必须是 16 或 32');
		if (inputSampleRate <= 0) throw new Error('采样率必须大于 0');
		if (!['int', 'float'].includes(pcmType)) throw new Error('pcmType 必须是 int 或 float');

		this.audioContext = new(window.AudioContext || window.webkitAudioContext)();
		this.inputSampleRate = inputSampleRate;
		this.numChannels = numChannels;
		this.bitDepth = bitDepth;
		this.littleEndian = littleEndian;
		this.pcmType = pcmType;
		this.audioQueue = [];
		this.playbackEndTime = 0;
		this.currentSource = null;
		this.lastBlockTail = null; // 用于交叉淡入淡出
		this.callback = callback;
	}

	appendChunk(audioData) {
		this.audioQueue.push(audioData);
		this._processQueue();
	}

	destroy() {
		this.audioQueue = [];
		this.playbackEndTime = 0;
		if (this.currentSource) {
			this.currentSource.stop();
			this.currentSource = null;
		}
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
	}

	async _processQueue() {
		if(this.audioQueue.length === 0) {
			this.callback('ended')
			return
		}
		if (!this.audioContext || this.currentSource) return;
		const buffer = this._mergeArrayBuffers(this.audioQueue)
		this.audioQueue = []
		try {
			const audioBuffer = this._convertPCM(buffer);
			await this._schedulePlay(audioBuffer);
			this._processQueue();
		} catch (err) {
			console.error('音频处理失败:', err);
		}
	}

	_convertPCM(buffer) {
		// 1. 数据对齐：确保长度是样本大小的整数倍
		const bytesPerSample = this.bitDepth / 8;
		const requiredBytes = bytesPerSample * this.numChannels;
		const validByteLength = Math.floor(buffer.byteLength / requiredBytes) * requiredBytes;
		const validBuffer = buffer.slice(0, validByteLength);
		const dataView = new DataView(validBuffer);
		const numSamples = validByteLength / requiredBytes;

		// 2. 创建音频缓冲区
		const audioBuffer = this.audioContext.createBuffer(
			this.numChannels,
			numSamples,
			this.inputSampleRate
		);

		// 3. 解析PCM数据
		for (let ch = 0; ch < this.numChannels; ch++) {
			const channelData = audioBuffer.getChannelData(ch);
			for (let i = 0; i < numSamples; i++) {
				// 计算字节位置（修正后的多声道索引）
				const pos = (i * this.numChannels * bytesPerSample) + (ch * bytesPerSample);
				let value;

				// 根据位深和数据类型解析
				if (this.bitDepth === 16) {
					value = dataView.getInt16(pos, this.littleEndian) / 32768;
				} else {
					if (this.pcmType === 'int') {
						value = dataView.getInt32(pos, this.littleEndian) / 2147483648;
					} else {
						value = dataView.getFloat32(pos, this.littleEndian);
					}
				}
				channelData[i] = value;
			}

			// 4. 消除直流偏移
			let sum = 0;
			for (let i = 0; i < channelData.length; i++) {
				sum += channelData[i];
			}
			const dcOffset = sum / channelData.length;
			for (let i = 0; i < channelData.length; i++) {
				channelData[i] -= dcOffset;
			}

			// 5. 块内淡入淡出（减少边界突变）
			const fadeLength = Math.min(100, channelData.length);
			for (let i = 0; i < fadeLength; i++) {
				channelData[i] *= (i / fadeLength);
			}
			const startFadeOut = Math.max(0, channelData.length - fadeLength);
			for (let i = startFadeOut; i < channelData.length; i++) {
				const factor = 1 - (i - startFadeOut) / fadeLength;
				channelData[i] *= factor;
			}
		}

		// 6. 块间交叉淡入淡出（解决重音关键点）
		const crossfadeLength = 50;
		if (this.lastBlockTail && this.lastBlockTail.length === this.numChannels) {
			for (let ch = 0; ch < this.numChannels; ch++) {
				const channelData = audioBuffer.getChannelData(ch);
				const prevTail = this.lastBlockTail[ch];

				// 只处理有足够长度交叉的情况
				if (prevTail.length >= crossfadeLength && channelData.length >= crossfadeLength) {
					for (let i = 0; i < crossfadeLength; i++) {
						const prevWeight = (crossfadeLength - i) / crossfadeLength;
						const currWeight = i / crossfadeLength;
						channelData[i] = channelData[i] * currWeight + prevTail[i] * prevWeight;
					}
				}
			}
		}

		// 7. 保存当前块尾部用于下一次交叉
		this.lastBlockTail = [];
		for (let ch = 0; ch < this.numChannels; ch++) {
			const channelData = audioBuffer.getChannelData(ch);
			const tailStart = Math.max(0, channelData.length - crossfadeLength);
			this.lastBlockTail[ch] = channelData.slice(tailStart);
		}

		return audioBuffer;
	}
	_schedulePlay(audioBuffer) {
		return new Promise(resolve => {
			const source = this.audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(this.audioContext.destination);

			const plannedStartTime = this.playbackEndTime;
			const now = this.audioContext.currentTime;
			let startTime = Math.max(plannedStartTime, now);

			// 动态速率调整（示例，需根据实际测试调整阈值）
			const timeDrift = plannedStartTime - now;
			if (timeDrift < -0.02) {
				source.playbackRate.value = Math.min(1.04, 1 - (timeDrift / audioBuffer.duration));
			} else if (timeDrift > 0.02) {
				source.playbackRate.value = Math.max(0.96, 1 - (timeDrift / audioBuffer.duration));
			} else {
				source.playbackRate.value = 1.0;
			}

			source.start(startTime);
			this.playbackEndTime = startTime + (audioBuffer.duration / source.playbackRate.value);

			source.onended = () => {
				this.currentSource = null;
				resolve();
			};
			this.currentSource = source;
		});
	}
	
	// 合并多个 ArrayBuffer 的辅助函数
	_mergeArrayBuffers(buffers) {
		let totalLength = 0;
		for (let buffer of buffers) {
			totalLength += buffer.byteLength;
		}
		const result = new Uint8Array(totalLength);
		let offset = 0;
		for (let buffer of buffers) {
			const view = new Uint8Array(buffer);
			result.set(view, offset);
			offset += view.length;
		}
		return result.buffer;
	}
}