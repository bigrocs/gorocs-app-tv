export interface MqttInfo {
  clientId: string;
  tcpUrl: string;
  token: string;
  tokenExpireIn: number;
  tokenExpireTime: number;
  topic: string;
  username: string;
  wsUrl: string;
}

export interface PayChannel {
  notifyUrl: string;
  subMerId: string;
  type: string;
}

export interface Config {
  TVMaintainer: string;
  TVMaintainerPhone: string;
  TVServicePhone: string;
  TVTheme: string;
  TVOrderScale?: number;
}

export interface DeviceInfo {
  config: Config;
  deviceSn: string;
  label: string;
  lable: string;
  loginType: string;
  messagePush: string;
  mqttInfo: MqttInfo;
  payChannel: PayChannel;
  printBottomText: string;
  qrcodes: Record<string, any>[] | null;
  returnCode: string;
  returnMsg: string;
  sellerId: string;
  sellerName: string;
  service: string;
}
