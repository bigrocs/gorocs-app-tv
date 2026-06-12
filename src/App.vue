<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 初始化 TTS 语音播报引擎（仅 App 端原生插件可用）
			// #ifdef APP-PLUS
			this.$store.dispatch('tts/init')
			// #endif
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
</style>