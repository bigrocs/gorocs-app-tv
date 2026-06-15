/*
 * @Description: 本地 MP3 播报封装 —— 固定文案走预录 MP3（欢迎语 / 支付方式名）
 *
 * 背景：动态金额仍由 @/utils/native-tts 实时合成（金额无法预录）；固定文案改用预录 MP3，
 *       音色统一、不依赖 TTS 引擎与网络（TV 盒子断网/缺离线语音包时仍能正常播报）。
 *
 * 平台：仅 APP-PLUS 生效；H5 / 小程序 / 非 APP 一律走空实现（与 native-tts 的平台守卫一致，永不抛错）。
 *
 * 契约：playMp3(name) 返回 Promise，在音频自然播完(onEnded) 或出错(onError) 时 resolve，
 *       两种情况都 resolve —— 保证调用方 .then() 链式接 TTS 金额时不会因 MP3 异常而永远卡住。
 *       订单频率低，每次 create 一个 InnerAudioContext，播完 destroy；若上一次仍在播，先 stop+destroy 并立即
 *       结算上一个 Promise，避免重叠播放、内存泄漏，以及被取代的 .then(金额TTS) 被 15s 超时拖住。
 */

const TAG = '[audio-mp3]'
const SAFETY_TIMEOUT = 15000 // 兜底：onEnded/onError 都不触发时（异常）避免 Promise 永挂

let _current = null // 当前正在播放项 { ctx, finish }，新播放前先清理它

/** 是否 APP-PLUS（仅 App 端有 uni.createInnerAudioContext 能力） */
function _available() {
  // #ifdef APP-PLUS
  return typeof uni !== 'undefined' && typeof uni.createInnerAudioContext === 'function'
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

/** 清理上一个仍活着的实例：stop + destroy，并立即结算其 Promise（reason=superseded） */
function _teardownCurrent() {
  if (!_current) return
  const cur = _current
  _current = null
  try {
    cur.ctx.stop()
  } catch (e) {}
  try {
    cur.ctx.destroy()
  } catch (e) {}
  if (typeof cur.finish === 'function') cur.finish('superseded')
}

/**
 * 播放 /static/audio/ 下的本地 MP3。
 * @param {string} name 文件名（如 'wechat.mp3'）或不含扩展名的名（如 'wechat' → 自动补 .mp3）
 * @returns {Promise<void>} 音频播完或出错时 resolve（永不 reject，方便 .then 接 TTS）
 */
export function playMp3(name) {
  // 非 APP-PLUS：空操作直接 resolve，保证调用链不中断
  if (!_available()) {
    console.log(TAG, '非 APP-PLUS 环境，跳过 MP3 播报:', name)
    return Promise.resolve()
  }

  const file = /\.(mp3|wav|m4a|aac)$/i.test(name) ? name : name + '.mp3'
  const src = '/static/audio/' + file

  // 清理上一个（若有）：保证同一时刻只有一条 MP3，且被取代的 .then(金额TTS) 不被超时拖住
  _teardownCurrent()

  return new Promise((resolve) => {
    const entry = { ctx: null, finish: null }
    let done = false
    let timer = null

    entry.finish = (reason) => {
      if (done) return
      done = true
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (_current === entry) _current = null
      try {
        entry.ctx.destroy()
      } catch (e) {}
      console.log(TAG, '播报结束:', file, '| reason=', reason)
      resolve()
    }

    const ctx = uni.createInnerAudioContext()
    entry.ctx = ctx
    _current = entry
    ctx.src = src
    ctx.autoplay = false // 部分基座 autoplay 不可靠，统一显式 play()

    ctx.onEnded(() => entry.finish('ended'))
    ctx.onError((err) => {
      console.error(TAG, '播报出错:', file, '|', err && err.errMsg ? err.errMsg : err)
      entry.finish('error')
    })

    // 兜底超时：异常情况下 onEnded/onError 都不触发时，避免 Promise 永挂卡住后续 TTS 金额
    timer = setTimeout(() => entry.finish('timeout'), SAFETY_TIMEOUT)

    console.log(TAG, '开始播报:', src)
    try {
      ctx.play()
    } catch (e) {
      console.error(TAG, 'play() 异常:', e && e.message ? e.message : e)
      entry.finish('play-exception')
    }
  })
}

export default { playMp3 }
