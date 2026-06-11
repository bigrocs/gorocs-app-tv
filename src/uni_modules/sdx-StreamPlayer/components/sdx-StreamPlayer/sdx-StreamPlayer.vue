<template>
	<button type="default" @click="connect">播放音频</button>
	<button type="default" @click="end">结束播放</button>
	<!-- 逻辑层和renderjs的交互需要通过这种方式传递数据，具体看文档 -->
	<view :isStop="isStop" :change:isStop="renderJS.stop" :prop="currBuffer" :change:prop="renderJS.playTTS" type="renderjs" module="renderJS"></view>
</template>
<script>
	/**
	 * 本页面代码为仅供参考的案例，只列举了实现思路，是我从项目代码中抽出来的，具体是否能跑通需要测试
	 * 核心代码在plugins
	 */
	
	let ws = null
	export default {
		data(){
			return {
				currBuffer: null,
				isStop: false,
				isStreamPlaying: false
			}
		},
		methods: {
			connect() {
				// 这里链接socket或者sse,并把接受到的二进制数据不断调用即可, 具体的ws请自行封装
				ws = uni.connectSocket({
					url: 'xxxxx',
					method: 'GET',
					success() {},
					fail(e) {
						console.log(e);
					}
				});
				ws.onMessage(arrayBuffer => {
					this.isStreamPlaying = true
					this.currBuffer= uni.arrayBufferToBase64(e.data)
				})
			},
			end() {
				this.isStop = !this.isStop
			},
			changeStreamPlaying(e) {
				this.isStreamPlaying = e.type
			}
		}
	}
</script>
<script module="renderJS" lang="renderjs">
	/**
	 * 如果不需要支持iOS，建议使用这个，同时支持mp3和pcm
	 */
	// import { StreamPlayer } from "../../plugins/H5AndAndroidStreamPlayer";
	/**
	 * 如果需要支持安卓iOS和H5，使用这个，支持pcm，暂时不支持mp3
	 * 如果想支持mp3可以自己开发，我在测试中mp3的效果太差所以放弃了。
	 */
	import { StreamPlayer } from "../../plugins/StreamPlayer";
	let player=null
	export default {
		mounted() {
			const _this = this;
			player = new StreamPlayer({callback: _this.callback});
		},
		methods: {
			playTTS (base64) {
				if(!base64)return
				const binaryStr = atob(base64)
				const bytes = new Uint8Array(binaryStr.length)
				for (let i = 0; i < binaryStr.length; i++) {
					bytes[i] = binaryStr.charCodeAt(i)
				}
				player.appendChunk(bytes.buffer);
			},
			stop() {
				player&&player.destroy()
				player = null
			},
			callback(e) {
				if(e==='ended') {
					this.$ownerInstance.callMethod('changeStreamPlaying', {type: false});
				}
			}
		}
	}
</script>
