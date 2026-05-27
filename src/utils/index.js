/**
 * Parse the time to string
 * @param {(Object|string|number)} time
 * @param {string} cFormat
 * @returns {string}
 */
export function parseTime(time, cFormat) {
    if (arguments.length === 0) {
        return null
    }
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
        // Note: getDay() returns 0 on Sunday
        if (key === 'a') { return ['日', '一', '二', '三', '四', '五', '六'][value] }
        if (result.length > 0 && value < 10) { // 不足两位自动补齐两位
            value = '0' + value
        }
        if (result === '{n}' && String(value).length === 2) { // 毫秒自动补齐三位
            value = '0' + value
        }
        return value || 0
    })
    return time_str
}

/**
 * @param {number} time
 * @param {string} option
 * @returns {string}
 */
export function formatTime(time, option) {
    if (('' + time).length === 10) {
        time = parseInt(time) * 1000
    } else {
        time = +time
    }
    const d = new Date(time)
    const now = Date.now()

    const diff = (now - d) / 1000

    if (diff < 30) {
        return '刚刚'
    } else if (diff < 3600) {
        // less 1 hour
        return Math.ceil(diff / 60) + '分钟前'
    } else if (diff < 3600 * 24) {
        return Math.ceil(diff / 3600) + '小时前'
    } else if (diff < 3600 * 24 * 2) {
        return '1天前'
    }
    if (option) {
        return parseTime(time, option)
    } else {
        return (
            d.getMonth() +
            1 +
            '月' +
            d.getDate() +
            '日' +
            d.getHours() +
            '时' +
            d.getMinutes() +
            '分'
        )
    }
}
/**
 * 数字前面自动补零
 * @param {int} num 数字
 * @param {int} length 总长度
 * @returns {string}
 */
export function addPreZero(num, length) {
  return (Array(length).join('0') + num).slice(-length)
}

// Sleep 自定义异步等待函数
export function Sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

// RouteParams 获取路由参数
export function RouteParams() {
    const routes = getCurrentPages()
    return routes[routes.length - 1].options; //获取路由参数
}

// OCR 图片识别
export function OCR(temp,type) {
    let ocr_type = 1
    switch (type) {
        case 'idcard':
            ocr_type = 1
            break;
        case 'bankcard':
            ocr_type = 2
            break;
        case 'driving':
            ocr_type = 3
            break;
        case 'driving_license':
            ocr_type = 4
            break;
        case 'biz_license':
            ocr_type = 7
            break;
        case 'ocr_comm':
            ocr_type = 8
            break;
        case 'plate_comm':
            ocr_type = 10
            break;
    }
    return new Promise((resolve, reject) => {
        // #ifdef MP-WEIXIN  
        uni.getFileSystemManager().readFile({
            filePath: temp,
            encoding: 'base64',
            success(r) { 
                OCRWechat(r.data,ocr_type).then(res => {
                    resolve(OCRWechatData(res.data))
                }).catch(err => {
                    console.log(err);
                    reject(err)
                })
            }
        })
        // #endif
    })
}
// 识别微信数据
export function OCRWechatData(e) {
    const data = {}
    if (e.idcard_res) {
        if (e.idcard_res.id) {
            data.idcard = {
                address: e.idcard_res.address.text,
                birth: e.idcard_res.birth.text,
                gender: e.idcard_res.gender.text,
                id: e.idcard_res.id.text,
                name: e.idcard_res.name.text,
                nationality: e.idcard_res.nationality.text,
            }
        }else{
            data.idcard = {
                authority: e.idcard_res.authority.text,
                valid_date: e.idcard_res.valid_date.text,
            } 
        }
    }
    if (e.biz_license_res) {
        data.bizLicense = {
            address: e.biz_license_res.address.text,
            business_scope: e.biz_license_res.business_scope.text,
            enterprise_name: e.biz_license_res.enterprise_name.text,
            legal_representative: e.biz_license_res.legal_representative.text,
            reg_num: e.biz_license_res.reg_num.text,
            // registered_capital: e.biz_license_res.registered_capital.text,
            registered_date: e.biz_license_res.registered_date.text,
            title: e.biz_license_res.title.text,
            type_of_enterprise: e.biz_license_res.type_of_enterprise.text,
            // valid_period: e.biz_license_res.valid_period.text,
        }
    }
    if (e.bankcard_res) {
        data.bankcard = {
            number: e.bankcard_res.number.text,
        }
    }
    return data
}
// OCRWechat 微信图片识别
// https://fuwu.weixin.qq.com/service/detail/000ce4cec24ca026d37900ed551415
export function OCRWechat(data,type) {
    return wx.serviceMarket.invokeService({
            service: 'wx79ac3de8be320b71', // '固定为服务商OCR的appid，非小程序appid',
            api: 'OcrAllInOne',
            data: {
                img_data: data,
                data_type: 2,
                ocr_type: type,
            },
        })
}
// fee 金额显示
export function fee(number) { // 是否存在不存在返回0
    return "￥"+((number ? Number(number) : 0)/100).toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
}