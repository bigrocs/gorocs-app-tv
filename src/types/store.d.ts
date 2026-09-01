import type { MqttInfo, Config, PayChannel } from './iot'
import type { Order } from './order'
import type { MqttClient } from 'mqtt'

export interface MqttState {
  client: MqttClient | null
  connected: boolean
  connecting: boolean
  orderList: Order[]
  lastOrder: Order | null
  mqttInfo: MqttInfo | null
  tokenRefreshTimer: ReturnType<typeof setTimeout> | null
  payingQueue: string[]
  lastCancelledOrder: Order | null
}

export interface DevicePropsState {
  deviceSn: string
  label: string
}

export interface IotState {
  config: Config | null
  loginType: string
  messagePush: string
  mqttInfo: MqttInfo | null
  payChannel: PayChannel | null
  printBottomText: string
  qrcodes: Record<string, any>[] | null
  returnCode: string
  returnMsg: string
  sellerId: string
  sellerName: string
  service: string
  loading: boolean
  error: string
}
