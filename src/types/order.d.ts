export type PayMethod = 'wechat' | 'alipay' | 'unionpay' | 'credit' | 'card' | 'digital'

export interface Order {
  id: string
  userId: string
  brandId: string
  channelId: number
  subMerId: string
  method: PayMethod
  tradeMethod: string
  title: string
  totalFee: number
  outTradeNo: string
  tradeNo: string
  bankTradeNo: string
  status: number
  date: string
  createdAt: string
  terminalId?: string
  operatorName?: string
  linkId?: string
  channel?: string
}
