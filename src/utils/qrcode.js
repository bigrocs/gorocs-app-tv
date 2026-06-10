/*
 * @Description: 二维码生成工具 — 基于 qrcode-generator 纯 JS 库，兼容 nvue 环境
 */
import qrcode from 'qrcode-generator'

/**
 * 生成二维码 Data URL (GIF 格式)
 * @param {string} text - 要编码的文本内容
 * @returns {string} GIF Data URL，可直接用于 <image :src="...">
 */
export function generateQRCode(text) {
	const qr = qrcode(0, 'M')
	qr.addData(text)
	qr.make()
	return qr.createDataURL(8, 4)
}
