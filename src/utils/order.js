/*
 * @Description: 订单相关工具函数
 */

/** 支付方式中文名称映射 */
const methodNameMap = {
  wechat: '微信支付',
  alipay: '支付宝',
  unionpay: '银联云闪付',
  credit: '信用卡',
  card: '银行卡',
  digital: '数字货币',
}

/** 获取支付方式图标路径 */
export function getMethodIcon(method) {
  return '/static/icon/' + method + '.png'
}

/** 获取支付方式中文名称 */
export function getMethodName(method) {
  return methodNameMap[method] || method
}

/**
 * 获取订单状态文本
 * @param {number} status 订单状态: 1=成功, 0=待支付, -1=已关闭
 * @param {number} totalFee 金额(分)
 */
export function getStatusText(status, totalFee) {
  if (status === 1 && totalFee !== undefined && totalFee <= 0) return '退款成功'
  if (status === 1) return '收款成功'
  if (status === -1) return '支付超时'
  if (status === 0 || status === undefined || status === null || status === '') return '支付中…'
}
/**
 * 获取订单状态颜色
 * @param {number} status
 */
export function getStatusColor(status) {
  switch (status) {
    case 1: return '#67C23A'
    case 0: return '#E6A23C'
    case -1: return '#F56C6C'
    default: return '#909399'
  }
}

/**
 * 获取金额显示颜色
 * @param {number} status
 */
export function getFeeColor(status) {
  if (status === -1) return '#F56C6C'
  return '#333333'
}

/**
 * 格式化金额(分转元)
 * @param {number} totalFee 金额(分)
 */
export function formatFee(totalFee) {
  const yuan = ((totalFee ? Number(totalFee) : 0) / 100).toFixed(2)
  const formatted = yuan.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  if (totalFee > 0) return '+' + formatted
  return formatted
}

const cnDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * 整数部分转中文读法（支持 0–99999999，即到千万级）
 * @param {number} num 非负整数
 */
function integerToChinese(num) {
  if (num === 0) return ''
  const units = ['', '十', '百', '千', '万', '十', '百', '千']
  const str = String(num)
  const len = str.length
  let result = ''
  let zero = false
  for (let i = 0; i < len; i++) {
    const d = Number(str[i])
    const pos = len - 1 - i
    if (d === 0) {
      zero = true
      if (pos === 4) result += '万'   // 万位补“万”，如 10000 → 一万
    } else {
      if (zero) {
        result += '零'
        zero = false
      }
      result += cnDigits[d] + units[pos]
    }
  }
  return result
}

/**
 * 金额（分）转中文读法，用于 TTS 播报
 * 整数部分按十百千读，小数部分用“点”逐位读（避免阿拉伯数字直接交给 TTS）
 * 例：1→零点零一元 10→零点一元 100→一元 123→一点二三元 1250→十二点五元 10000→一百元
 * @param {number} totalFee 金额（分）
 */
export function amountToChinese(totalFee) {
  const fen = Math.round(Number(totalFee) || 0)
  if (fen === 0) return '零元'
  // 转成“元”的小数形式：整数部分按十百千，小数部分去末尾 0 后逐位读
  const yuanStr = (fen / 100).toFixed(2)
  const [intPart, decPart] = yuanStr.split('.')
  let result = ''
  const intNum = Number(intPart)
  result += intNum === 0 ? '零' : integerToChinese(intNum)
  const decTrimmed = decPart.replace(/0+$/, '')   // 12.50 → 12.5
  if (decTrimmed) {
    result += '点'
    for (let i = 0; i < decTrimmed.length; i++) {
      result += cnDigits[Number(decTrimmed[i])]
    }
  }
  result += '元'
  return result
}
