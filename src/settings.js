/*
 * @Author: BigRocs
 * @Date: 2022-05-08 08:36:41
 * @LastEditTime: 2024-09-16 16:39:25
 * @LastEditors: BigRocs
 * @Description: QQ: 532388887, Email:bigrocs@qq.com
 */

let  baseUrl = 'https://rpc.bichengbituo.com/'
// if (process.env.NODE_ENV === 'development') {
//   baseUrl = 'http://127.0.0.1:8080'
// }
module.exports = {
  baseUrl: baseUrl,
  baseWSUrl: 'wss://www.bichengbituo.com/ws',
  // baseWSUrl: 'ws://192.168.3.225:18080/',
  baseTVUrl: 'http://tvwgt.bichengbituo.com/',
  // 备案
  icp: '鲁ICP备2021012345号'
}
