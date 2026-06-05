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
  switch (status) {
    case 1: return '收款成功'
    case 0: return '支付中…'
    case -1: return '支付超时'
    default: return '未知状态'
  }
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
