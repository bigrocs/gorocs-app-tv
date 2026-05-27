/**
 * login.js 登录类
 */
import store from '@/store'
const login = {
    api : store.state.$u.api,
    Auth(user) {
        return new Promise((resolve, reject) => {
            this.api.user.auth.Auth({ user }).then(res => {
                resolve(res)
            }).catch(err => {
                reject(err)
            })
        })
    },
    Mobile(mobile,code){
        return new Promise((resolve, reject) => {
            this.api.user.auth.MobileAuth({ user:{
                mobile: mobile
            }, captcha: code }).then(res => {
                resolve(res)
            }).catch(err => {
                reject(err)
            })
        })
    },
    MpWechat() {
        // 微信小程序登录
        return new Promise((resolve, reject) => {
            this.uniLogin('weixin').then(res=>{
                if (res.errMsg === "login:ok") {
                    const client_id = uni.getAccountInfoSync().miniProgram.appId;
                    this.socialitesAuth( res.code,'miniprogram_wechat',client_id).then(res => {
                        resolve(res)
                    }).catch(err => {
                        reject(err)
                    })
                } else {
                    reject(res)
                }
            }).catch(err => {
                reject(err)
            })
        })
    },
    // 社会登录授权
    socialitesAuth(code, driver, client_id) {
        return new Promise((resolve, reject) => {
            this.api.SocialitesAuth({ code, driver, client_id }).then(res => {
                resolve(res)
            }).catch(err => {
                reject(err)
            })
        })
    },
    socialitesRegister(driver, mobile, captcha){
        return new Promise(async(resolve, reject) => {
            let request = {
                socialite: {
                    driver: driver,
                    code: '',
                },
                socialiteUser: {
                    users: [
                        {
                            name: '',
                            avatar: '',
                            mobile: mobile,
                        }
                    ]
                },
                captcha: captcha
            }
            let provider = ''
            switch (driver) {
                case 'miniprogram_wechat':
                    provider = 'weixin'
                    break;
                default:
                    console.error('不支持此注册方式:', driver);
                    break;
            }

            await this.uniLogin(provider).then(res => {
                request.socialite.code = res.code
            }).catch(err => {
                reject(err)
            })
            // #ifdef MP-WEIXIN || MP-QQ || MP-BAIDU 
            const userInfo = uni.getStorageSync('userInfo')
            let name = userInfo.nickName;
            // 过滤大多数emoji表情
            name = name.replace(/[\uD83C|\uD83D|\uD83E][\uDC00-\uDFFF][\u200D|\uFE0F]|[\uD83C|\uD83D|\uD83E][\uDC00-\uDFFF]|[0-9|*|#]\uFE0F\u20E3|[0-9|#]\u20E3|[\u203C-\u3299]\uFE0F\u200D|[\u203C-\u3299]\uFE0F|[\u2122-\u2B55]|\u303D|[\A9|\AE]\u3030|\uA9|\uAE|\u3030/g, '')
            request.socialiteUser.users[0].name = name
            request.socialiteUser.users[0].avatar = userInfo.avatarUrl
            request.socialite.client_id = uni.getAccountInfoSync().miniProgram.appId
			// #endif
            await this.api.SocialitesRegister(request).then(res => {
                resolve(res)
            }).catch(err => {
                reject(err)
            })
        })
    },
    uniGetUserInfo(driver) {
        return new Promise((resolve, reject) => {
            uni.authorize({
                scope: 'scope.userInfo',
                success() {
                    uni.getUserInfo({
                        provider: driver,
                        success: res => {
                            resolve(res)
                        },
                        fail: err => {
                            reject(err)
                        }
                    });
                },
                fail(err){
                    reject(err)
                }
            })
        })
    },
    // uni登录
    uniLogin(driver) {
        return new Promise((resolve, reject) => {
            uni.login({
                provider: driver,
                success: res => {
                    resolve(res)
                },
                fail: err => {
                    reject(err)
                }
            });
        })
    },
}
export default login
