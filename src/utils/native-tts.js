/*
 * @Description: TTS 原生封装 —— 按 Fvv-UniTTS 插件源码（UniTTS.java）用 plus.android 重写
 *
 * 目标：不依赖任何编译型原生插件，直接用 plus.android 调 android.speech.tts.TextToSpeech，
 *       方法名/参数/语义与 UniTTS.java 的 @JSMethod 一一对应，可视为
 *       uni.requireNativePlugin('Fvv-UniTTS') 的等价替代。
 *
 * ============ 与源码 UniTTS.java 的方法对照 ============
 *   init(JSCallback, engine)          → init(callback, engine)        // 回调拿到 onInit 的 status(0=成功)
 *   setEngine(String)                 → setEngine(engine)             // setEngineByPackageName
 *   setPitch(int 0~100)               → setPitch(value)               // 内部 value*2*0.01，与源码一致
 *   setSpeechRate(int 0~100)          → setSpeechRate(value)          // 内部 value*1.5*0.01，与源码一致
 *   setLanguage(String)               → setLanguage(lang)             // 名字→Locale 静态常量
 *   setLanguageCustom(String,String)  → setLanguageCustom(lang,country)
 *   speak(JSONObject)                 → speak({text,queue,id})        // Lollipop+ 走 4 参 speak(text,mode,null,id)，与源码一致
 *   stop()                            → stop()
 *   isSpeaking()                      → isSpeaking()
 *   getMaxSpeechInputLength()         → getMaxSpeechInputLength()      // API18+
 *   getInstallTTS(JSCallback)         → getInstallTTS(callback)       // 返回 [{name,label}]（源码返回原始 List，此处转 JS 数组便于消费）
 *   saveAudioFile(JSONObject)         → saveAudioFile({text,id,path}) // synthesizeToFile
 *   openSettings()                    → openSettings()                // 跳转系统 TTS 设置
 *   destroy()                         → destroy()                     // stop + shutdown + 置空
 *
 * ============ 未实现（plus.android 能力限制，已注明）============
 *   onStart / onDone / onError：源码靠 UtteranceProgressListener（抽象类）回调；
 *       plus.android.implements 只能代理 Java 接口，无法代理抽象类，故这 3 个回调无法 1:1 复刻。
 *       本应用为“立即播报 / 清队列”场景，不需要这些回调。
 *   test()：源码里只是弹个 Toast 的演示方法，无业务意义，略去。
 *
 * ============ 与源码的必要差异（本应用适配，已注明）============
 *   1. init 默认语言：源码 onInit 里设 Locale.ENGLISH → 本模块设 zh-CN（必诚付播报中文金额所需）。
 *      仍可通过 setLanguage('ENGLISH') 等随时改回，API 与源码一致。
 *   2. 额外暴露 isReady()：源码靠 init 回调隐式判断就绪；本模块额外维护内部就绪标志，
 *      供 speak 前判空（避免未初始化时静默失败）。
 *   3. 额外保留 diagnose()：打印当前引擎 / 中文支持码 / 已装引擎列表，TV 盒子排障用（源码无）。
 *   4. init 增加并发合并与 8s 超时兜底：App.vue 与 index.nvue 都会 dispatch('tts/init')，
 *      合并到同一次 onInit 回调，避免重复构造；onInit 8s 未回调则视为失败（源码无此保护）。
 *
 * 平台：仅 APP-PLUS(Android) 生效；H5 / 小程序 / 非 Android 一律走空实现，永不抛错。
 */

const TAG = '[native-tts]'
const ENGINE_IFLYTEK = 'com.iflytek.speechcloud'

/** TextToSpeech 静态常量（AOSP 源码确认值） */
const QUEUE_FLUSH = 0
const QUEUE_ADD = 1
const TTS_SUCCESS = 0
const LANG_NOT_SUPPORTED = -2

/** 单例内部状态 */
let _tts = null // android.speech.tts.TextToSpeech 实例
let _TTSClass = null // importClass 缓存：android.speech.tts.TextToSpeech
let _EngineClass = null // importClass 缓存：android.speech.tts.TextToSpeech$Engine（取 KEY_PARAM_UTTERANCE_ID）
let _LocaleClass = null // importClass 缓存：java.util.Locale
let _ready = false // onInit 成功后置真
let _initing = false // 构造→onInit 期间为真，用于合并并发 init（区别于“失败后残留的非就绪实例”）
let _pendingCbs = [] // 构造期间的 init 回调队列（合并并发 init）
let _initTimer = null // init 超时兜底定时器

/**
 * 安全执行原生调用，异常时返回 fallback 并打日志（TV 盒子上任何原生异常都不应中断业务）
 * @param {Function} fn 真实原生调用闭包
 * @param {*} fallback 异常时返回值
 */
function _safe(fn, fallback) {
  try {
    return fn()
  } catch (e) {
    console.error(TAG, '原生调用异常:', e && e.message ? e.message : e)
    return fallback
  }
}

/**
 * 当前环境是否可用 plus.android（仅 APP-PLUS+Android 为真）。
 * 注意：两个条件编译块之外不得放任何语句——uni 预处理器按块裁剪，
 * 块外代码会保留到所有平台，破坏“非 APP-PLUS 永不触碰 plus”的保证。
 */
function _available() {
  // #ifdef APP-PLUS
  try {
    return typeof plus !== 'undefined' && !!plus.android && typeof plus.android.importClass === 'function'
  } catch (e) {
    return false
  }
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

/** 懒加载并缓存 TextToSpeech / Locale / Engine 类对象（importClass 有开销，仅做一次） */
function _ensureClasses() {
  if (_TTSClass) return true
  _TTSClass = _safe(() => plus.android.importClass('android.speech.tts.TextToSpeech'), null)
  _LocaleClass = _safe(() => plus.android.importClass('java.util.Locale'), null)
  _EngineClass = _safe(() => plus.android.importClass('android.speech.tts.TextToSpeech$Engine'), null)
  return !!_TTSClass
}

/**
 * 读取系统 API 等级（android.os.Build.VERSION.SDK_INT）。读不到返回 -1。
 * 用于判定 speak 是否可用 4 参重载（Lollipop/API21+）。
 */
function _readSdkInt() {
  return _safe(() => {
    const Version = plus.android.importClass('android.os.Build$VERSION')
    return plus.android.getAttribute(Version, 'SDK_INT')
  }, -1)
}

/**
 * 按 Locale 静态常量名取 Locale 对象（CANADA / CANADA_FRENCH / CHINA / CHINESE / ENGLISH /
 * FRANCE / FRENCH / GERMAN / GERMANY / ITALIAN / ITALY / JAPAN / JAPANESE / KOREA / KOREAN /
 * PRC / ROOT / SIMPLIFIED_CHINESE / TAIWAN / TRADITIONAL_CHINESE / UK / US）。
 * 等价于源码 setLanguage 里那一长串 if-else，只是统一用 getAttribute 读取同名静态字段。
 */
function _localeByName(name) {
  if (!_LocaleClass || !name) return null
  return _safe(() => plus.android.getAttribute(_LocaleClass, String(name).toUpperCase()), null)
}

/** 清理 init 超时定时器 */
function _clearTimer() {
  if (_initTimer) {
    clearTimeout(_initTimer)
    _initTimer = null
  }
}

/**
 * onInit 统一处理（对应源码 OnInitListener.onInit）：
 *   成功 → 配置 zh-CN 语言 + 源码默认 pitch(50)/rate(65)，并结算所有 pending 回调；
 *   失败 → 同样结算为失败 status。
 * 差异1：源码设 ENGLISH，本模块设 SIMPLIFIED_CHINESE（播报中文金额）。
 */
function _onInit(status) {
  _clearTimer()
  _initing = false
  try {
    if (status === TTS_SUCCESS) {
      _ready = true
      _setLanguageByName('SIMPLIFIED_CHINESE') // 差异1：源码为 ENGLISH
      setPitch(50) // 源码 onInit 默认
      setSpeechRate(65) // 源码 onInit 默认
      console.log(TAG, 'TTS 初始化成功 | 语言=zh-CN pitch=50 rate=65')
    } else {
      _ready = false
      console.warn(TAG, 'TTS 初始化失败 status=', status)
    }
  } catch (e) {
    _ready = false
    console.error(TAG, 'onInit 处理异常:', e && e.message ? e.message : e)
  }
  // 结算所有 pending 回调（合并并发 init）
  const cbs = _pendingCbs
  _pendingCbs = []
  cbs.forEach((cb) => {
    try {
      cb(status)
    } catch (e) {
      console.error(TAG, 'init 回调执行异常:', e && e.message ? e.message : e)
    }
  })
}

/** 真正销毁实例（对应源码 destroy：stop + shutdown + 置空） */
function _destroyInternal() {
  _clearTimer()
  if (_available() && _tts) {
    _safe(() => plus.android.invoke(_tts, 'stop'), undefined)
    _safe(() => plus.android.invoke(_tts, 'shutdown'), undefined)
  }
  _tts = null
  _ready = false
  _initing = false
}

/**
 * 初始化 TTS 引擎（对应源码 init(JSCallback, String engine)）。
 *   - 已就绪：立即 callback(0)；
 *   - 构造中（并发 init）：合并到同一次 onInit，callback 一并触发；
 *   - 首次：3 参构造绑定指定引擎，等 onInit 异步回调；8s 未回调则超时兜底 callback(-1)。
 * 引擎选择按 API 等级兼容：API14+ 用 3 参构造直接指定引擎；构造失败回退 2 参 + setEngineByPackageName。
 *
 * @param {Function} [callback] 回调，入参为 onInit 的 status（0=成功，-1=失败）
 * @param {string} [engine] TTS 引擎包名，默认 com.iflytek.speechcloud（讯飞）
 */
function init(callback, engine) {
  const cb = typeof callback === 'function' ? callback : function () {}
  const eng = engine && String(engine).length ? String(engine) : ENGINE_IFLYTEK

  if (_ready && _tts) {
    cb(TTS_SUCCESS)
    return
  }
  if (!_available()) {
    console.warn(TAG, 'plus.android 不可用，跳过 TTS 初始化')
    cb(-1)
    return
  }

  // 构造中（onInit 未回调）：合并到 pending，等同一个 onInit 触发（App.vue + index.nvue 都会 init）
  if (_initing) {
    _pendingCbs.push(cb)
    return
  }

  if (!_ensureClasses()) {
    cb(-1)
    return
  }
  _destroyInternal()

  const main = _safe(() => plus.android.runtimeMainActivity(), null)
  if (!main) {
    console.error(TAG, '获取 Activity(Context) 失败')
    cb(-1)
    return
  }

  // OnInitListener 是接口，plus.android.implements 可代理
  const listener = _safe(
    () =>
      plus.android.implements('android.speech.tts.TextToSpeech$OnInitListener', {
        onInit: function (status) {
          _onInit(status)
        },
      }),
    null
  )
  if (!listener) {
    console.error(TAG, '构造 OnInitListener 代理失败')
    cb(-1)
    return
  }

  _pendingCbs = [cb]
  _initing = true
  // 超时兜底（源码没有；本模块增加，防 onInit 不回调卡死）
  _initTimer = setTimeout(() => {
    console.warn(TAG, 'onInit 超时(8s 未回调)，视为失败')
    _onInit(-1)
  }, 8000)

  // 对应源码：new TextToSpeech(ctx, listener, engine)
  // API14+ 直接用 3 参构造绑定引擎；构造失败再回退 2 参 + setEngineByPackageName（仍指向指定引擎，不切本地/系统默认）
  console.log(TAG, '构造引擎 engine=' + eng + ' | API=' + _readSdkInt())
  _tts = _safe(() => new _TTSClass(main, listener, eng), null)
  if (!_tts) {
    _tts = _safe(() => new _TTSClass(main, listener), null)
    if (_tts) _safe(() => plus.android.invoke(_tts, 'setEngineByPackageName', eng), undefined)
  }
  if (!_tts) {
    console.error(TAG, 'new TextToSpeech(...) 失败（引擎 ' + eng + ' 不可用，不回退本地引擎）')
    // _onInit 会清 timer、置 _initing=false，并结算 _pendingCbs（勿在此提前清空，否则回调永不触发）
    _onInit(-1)
  }
  // 成功路径：_tts 已拿到，等待 onInit 异步回调结算
}

/**
 * 设置引擎（对应源码 setEngine → setEngineByPackageName）。
 * 注意：运行期切换引擎效果有限，通常需重新 init 才能真正切换。
 * @param {string} engine 引擎包名
 * @returns {number} 0=成功，-1=失败
 */
function setEngine(engine) {
  if (!_available() || !_tts || !engine) return -1
  return _safe(() => plus.android.invoke(_tts, 'setEngineByPackageName', String(engine)), -1)
}

/**
 * 设置音调（对应源码 setPitch，0~100 整数，内部 value*2*0.01 → 0~2.0）。
 * @param {number} value 0~100
 */
function setPitch(value) {
  if (!_available() || !_tts) return
  let v = Number(value) || 0
  if (v > 100) v = 100
  if (v < 0) v = 0
  const tempValue = v * 2 * 0.01 // 与源码一致
  _safe(() => plus.android.invoke(_tts, 'setPitch', tempValue), undefined)
}

/**
 * 设置语速（对应源码 setSpeechRate，0~100 整数，内部 value*1.5*0.01 → 0~1.5）。
 * @param {number} value 0~100
 */
function setSpeechRate(value) {
  if (!_available() || !_tts) return
  let v = Number(value) || 0
  if (v > 100) v = 100
  if (v < 0) v = 0
  const tempValue = v * 1.5 * 0.01 // 与源码一致
  _safe(() => plus.android.invoke(_tts, 'setSpeechRate', tempValue), undefined)
}

/** 内部：按名字设置语言（复用 _localeByName，等价于源码 setLanguage 的 if-else 分支） */
function _setLanguageByName(name) {
  if (!_available() || !_tts) return LANG_NOT_SUPPORTED
  const loc = name === 'CUSTOM' ? null : _localeByName(name)
  if (!loc) return LANG_NOT_SUPPORTED
  return _safe(() => plus.android.invoke(_tts, 'setLanguage', loc), LANG_NOT_SUPPORTED)
}

/**
 * 设置语言（对应源码 setLanguage(String lang)）。
 * lang 取 Locale 静态常量名：CANADA / CHINESE / ENGLISH / SIMPLIFIED_CHINESE / US 等。
 * @param {string} lang
 * @returns {number} 0/1/2=可用，-1=缺离线语音数据，-2=不支持
 */
function setLanguage(lang) {
  return _setLanguageByName(lang || 'ENGLISH')
}

/**
 * 设置语言-自定义（对应源码 setLanguageCustom(String lang, String country) → new Locale(lang,country)）。
 * @param {string} lang 语言码，如 'zh'
 * @param {string} country 国家码，如 'CN'
 * @returns {number} 同 setLanguage
 */
function setLanguageCustom(lang, country) {
  if (!_available() || !_tts) return LANG_NOT_SUPPORTED
  const loc = _safe(() => plus.android.newObject('java.util.Locale', String(lang || 'zh'), String(country || 'CN')), null)
  if (!loc) return LANG_NOT_SUPPORTED
  return _safe(() => plus.android.invoke(_tts, 'setLanguage', loc), LANG_NOT_SUPPORTED)
}

/**
 * 开始播放（对应源码 speak(JSONObject)）。
 *   Lollipop(API21+)：speak(text, queueMode, null, utteranceId) —— 4 参，与源码一致；
 *   旧版 / 4 参在 plus.android 下解析失败时：回退 speak(text, queueMode, null) —— 3 参老式重载。
 * @param {Object} p
 * @param {string} p.text 播报文本
 * @param {('flush'|'add')} [p.queue='flush'] 'flush'=清空队列立即播报(QUEUE_FLUSH)；'add'=追加队尾(QUEUE_ADD)
 * @param {string|number} [p.id] 播报标识，缺省随机（与源码一致）
 * @returns {number} 0=已派发，-1=未初始化/失败
 */
function speak(p) {
  if (!_available() || !_tts) {
    console.warn(TAG, 'speak: TTS 未初始化')
    return -1
  }
  const o = p || {}
  const text = o.text == null ? '' : String(o.text)
  const queue = (o.queue == null ? 'flush' : String(o.queue)).toUpperCase()
  const queueType = queue === 'ADD' ? QUEUE_ADD : QUEUE_FLUSH
  const id = o.id == null ? String(Math.round(Math.random() * 1000)) : String(o.id) // 源码默认随机 id
  const sdkInt = _readSdkInt()
  return _safe(() => {
    if (sdkInt >= 21) {
      try {
        // 4 参：speak(CharSequence, int, Bundle, String) —— 与源码 Lollipop+ 分支一致
        return plus.android.invoke(_tts, 'speak', text, queueType, null, id)
      } catch (e4) {
        console.warn(TAG, '4参 speak 失败，回退 3 参:', e4 && e4.message ? e4.message : e4)
      }
    }
    // 3 参老式重载：speak(String, int, HashMap)
    return plus.android.invoke(_tts, 'speak', text, queueType, null)
  }, -1)
}

/** 停止播放（对应源码 stop） */
function stop() {
  if (_available() && _tts) _safe(() => plus.android.invoke(_tts, 'stop'), undefined)
}

/** 是否正在播放（对应源码 isSpeaking） */
function isSpeaking() {
  if (!_available() || !_tts) return false
  return _safe(() => plus.android.invoke(_tts, 'isSpeaking'), false)
}

/** 转换长度上限（对应源码 getMaxSpeechInputLength，API18+） */
function getMaxSpeechInputLength() {
  if (!_available() || !_tts) return -1
  return _safe(() => plus.android.invoke(_tts, 'getMaxSpeechInputLength'), -1)
}

/**
 * 获取已安装引擎（对应源码 getInstallTTS）。
 * 源码把原始 List 直接回传 JS（依赖 fastjson 序列化）；plus.android 下需手动遍历转 JS 数组。
 * @param {Function} [callback] 回调，入参 [{name,label}, ...]
 */
function getInstallTTS(callback) {
  const cb = typeof callback === 'function' ? callback : function () {}
  if (!_available() || !_tts) {
    cb(null)
    return
  }
  const arr = []
  _safe(() => {
    const list = plus.android.invoke(_tts, 'getEngines')
    const n = list ? plus.android.invoke(list, 'size') : 0
    for (let i = 0; i < n; i++) {
      const ei = plus.android.invoke(list, 'get', i)
      const name = _safe(() => plus.android.getAttribute(ei, 'name'), '')
      const label = _safe(() => plus.android.getAttribute(ei, 'label'), '')
      arr.push({ name: String(name), label: String(label) })
    }
  }, undefined)
  cb(arr)
}

/**
 * 合成并保存到音频文件（对应源码 saveAudioFile → synthesizeToFile）。
 * 本应用未使用，按源码保留。默认路径 /sdcard/1.wav。
 * @param {Object} o
 * @param {string} o.text
 * @param {string|number} [o.id]
 * @param {string} [o.path]
 */
function saveAudioFile(o) {
  if (!_available() || !_tts) return
  const text = (o && o.text) || ''
  const id = o && o.id != null ? String(o.id) : String(Math.round(Math.random() * 1000))
  const path = (o && o.path) || '/sdcard/1.wav'
  _safe(() => {
    const map = plus.android.newObject('java.util.HashMap')
    const key = _EngineClass ? plus.android.getAttribute(_EngineClass, 'KEY_PARAM_UTTERANCE_ID') : null
    if (key) plus.android.invoke(map, 'put', key, id)
    plus.android.invoke(_tts, 'synthesizeToFile', String(text), map, String(path))
  }, undefined)
}

/** 打开系统 TTS 设置页（对应源码 openSettings） */
function openSettings() {
  if (!_available()) return
  _safe(() => {
    const intent = plus.android.newObject('android.content.Intent', 'com.android.settings.TTS_SETTINGS')
    plus.android.invoke(plus.android.runtimeMainActivity(), 'startActivity', intent)
  }, undefined)
}

/** 销毁（对应源码 destroy） */
function destroy() {
  _destroyInternal()
  console.log(TAG, '已 destroy')
}

/* ============ 本模块附加（源码无）============ */

/** 引擎是否就绪（内部 onInit 标志，供 speak 前判空） */
function isReady() {
  return _ready && !!_tts
}

/**
 * 诊断：打印当前引擎、中文支持码、已安装引擎列表（TV 盒子排障用，源码无）。
 * 中文支持码 -1(LANG_MISSING_DATA) 说明离线语音包缺失，会走在线合成 → 网络一抖就“一卡一卡”。
 */
function diagnose() {
  console.warn(TAG, '========== TTS 诊断开始 ==========')
  console.warn(TAG, 'plus.android 可用 =', _available(), '| API 等级 =', _readSdkInt())
  console.warn(TAG, 'isReady =', isReady(), '| 已构造实例 =', !!_tts)
  if (!_tts) {
    console.warn(TAG, '========== 诊断结束（无实例）==========')
    return
  }
  const def = _safe(() => plus.android.invoke(_tts, 'getDefaultEngine'), null)
  console.warn(TAG, '系统默认引擎 =', def)
  const loc = _localeByName('SIMPLIFIED_CHINESE')
  if (loc) {
    const a = _safe(() => plus.android.invoke(_tts, 'isLanguageAvailable', loc), null)
    console.warn(TAG, '中文支持码 =', a, '（0/1/2=可用，-1=缺离线语音数据(走在线易卡)，-2=不支持）')
  }
  getInstallTTS((arr) => {
    console.warn(TAG, '已安装引擎数量 =', arr ? arr.length : 0)
    if (arr) arr.forEach((e, i) => console.warn(TAG, '  引擎[' + i + ']:', e.name, '/', e.label))
    console.warn(TAG, '========== TTS 诊断结束 ==========')
  })
}

/** 导出单例 API（plugin-like，普通 ES 模块；方法名/语义对齐 UniTTS.java） */
export default {
  init,
  setEngine,
  setPitch,
  setSpeechRate,
  setLanguage,
  setLanguageCustom,
  speak,
  stop,
  isSpeaking,
  getMaxSpeechInputLength,
  getInstallTTS,
  saveAudioFile,
  openSettings,
  destroy,
  // 以下为本模块附加（源码无）
  isReady,
  diagnose,
}
