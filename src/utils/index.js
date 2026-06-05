/*
 * @Description: 通用工具函数
 */

/**
 * 解析时间为字符串
 * @param {Date|string|number|null} time
 * @param {string} cFormat
 */
export function parseTime(time, cFormat) {
  if (arguments.length === 0 || time === null) return null
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if ((typeof time === 'string') && (/^[0-9]+$/.test(time))) {
      time = parseInt(time)
    }
    if ((typeof time === 'number') && (time.toString().length === 10)) {
      time = time * 1000
    }
    date = new Date(time)
  }

  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    n: date.getMilliseconds(),
    a: date.getDay()
  }
  const time_str = format.replace(/{(y|m|d|h|i|s|n|a)+}/g, (result, key) => {
    let value = formatObj[key]
    if (key === 'a') { return ['日', '一', '二', '三', '四', '五', '六'][value] }
    if (result.length > 0 && value < 10) {
      value = '0' + value
    }
    return String(value || 0)
  })
  return time_str
}

/**
 * 数字前面自动补零
 */
export function addPreZero(num, length) {
  return (Array(length).join('0') + num).slice(-length)
}

/**
 * 异步等待
 */
export function Sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}
