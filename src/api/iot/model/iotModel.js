/*
 * @Description: IoT设备信息API — 请求/响应模型
 */

/**
 * @typedef {Object} BizContent
 * @property {string} service - 服务类型
 * @property {string} label - 设备型号
 * @property {string} deviceSn - 设备序列号
 */

/**
 * @typedef {Object} RequestParams
 * @property {BizContent} bizContent
 * @property {string} appId
 * @property {string} signType
 */

/**
 * @typedef {Object} ApiResponse
 * @property {string} [sign] - 返回签名
 * @property {Object|string} [content] - 返回内容(DeviceInfo)
 * @property {string} [signType] - 签名类型
 */

export {}
