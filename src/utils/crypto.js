/*
 * @Description: RSA2 签名/验签工具
 */
import * as rs from 'jsrsasign'

const privateKeyBase64 = 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCBw1IV1y6Q7tNAtdvYm/r0zt6NN8z5Db3y8rQ7I2dDwoSr4ocs+LjUf2fB8+xFo0izxOkkWSxHkdx3u8umLMl5KX7ElfEMGyW0RVxvj4Xl2VGT8FgBmHz75rsPHZe8R2utZvdPHxcoUJjCQ7FvHpHtpfSdduQVK8+y2akOZvTnRXeO0ZQ1agyyoeqEUScF9tPLHHja4OZGVlBI41Gk7Cg1CBIvrmq2vSSc16j1jteo50CJIxVQwGZ/kybS3OOxJmBmqUJtyIthUo+dBtjj39nPajB6jFVezha2TD5qwL5+SgdBu3RY0lG5W3Lp9tk6dYTvdesr2ioRhuZlonDXmIU5AgMBAAECggEAV7rKAGIe5XXR9Wn+XI/4NxK1fBxBxA/6YAqet2zUIAee0uawJUNzEpegeoyDLQGb4Y47YYu4WBrRR1H7+TlGbVgUkKwe7+RatWo/eF08VY17jd1sYofJ2DTCOxHyyCQxNGbsxN1sNqFm5dAGYe31EwqkOuFqirW4El794PLSmJhymF3TgSa2z+Ealca94dLtoMuH5CnED1Yb+wj1jw6SwSQ4zpqjox+Sr4n+I5bC9Sjmn7q6c6ywg/GBy5akHcFAw0imk4Z5gR240AbD/S45cWynNbmXZG4M6IMzb1PtKDejYfy6g2Yo90v6xqHq+Gt8NAU8SJ1Hd8y4LhO2b/sWQQKBgQDMHfKyw7pERZV2pxTeX0PfSlsYMOTCRNnS1gPZf7ED1T2NGfz4nm7bRtEGTmhvdnh8Svg0HfsCUB2PfXUIZpWLPgXZ18KY+QKEPxfZmraZEBWeCrRJmPfqtN9NOCpwT7BUuv6ZdKBNrkoXytpPddaqhdSrVOGGfgvQNbjASTLhvQKBgQCivxlIYtwWOb4pXGhJ/QOF5UIaA/4Up105kLQn7V7/8/YYihVFpHSGTs+2y+oSnht/wu6d6JEXFWbQLiM97TCJssmTu7AhR2JQY6T5BeU+zt82AKEgvvDzI0hPxq+QF/hctLpVQ1zE2XdbD2pGLZlxDXpr1REurLeFnKxxU5IjLQKBgQCs1ncaFE53XQyQqi4rljNcshOsykoKjk58Dyi3VT7I5hn2jxj8VPu9xZtdYathJsojRUAisXhInxpI1IzzDhp3C4/cxKxM6B3PabWCV1VjCpGjf6Dl6ReUsI+dTX/yFihTtvu7aVwMKxcmSmjNfBTH1AcfBQLq5XSPW84TVGg3aQKBgBP5uLS1zaW8uKaC/Rn3wDLzDMX8r3cBg+PI6xPrgrmPzCj+6dV+df72NXCOXtCiL2XjGz6uiQB4VAJBZ3n2XvrHww4q/1dWV67eTCV0n8qxwZvzP9OxHAn7zqhcDrh0+LsIQ8arWfufZZL7tWOfvTGvIdOSd2VvNadkr5XJWCqRAoGBAKD+TkLZJxp1zHKRc54evRa1sFBYZ2rc5uAF1Y2rPrP2X+ISshVe5c7VC9pJHVChlVAtKijb8G/JmXpK0j2VorK7swYu6s9wZexX6Whj/qlrBb445vou7z4pJTAJ9rT+BEnyUCJSQvUNjw2tFNRlY9JqOTfoDqaJ15TLHOqA2NgE'

const platformPublicKeyBase64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxlWN6S81zyjkuxZuYOmevdiS0iTDzbM2B0Xso5hbBCsv8ZU8kUVvA9qGieTLz+vojBuNnmYDiccxhcB1dzsoir8MJSZHFkA1EkgNwCJjr0JsKyVymzsG4zsY3jNI/iOjir+GuKfUO9N0UmjIhiyFCEfMrQZG3CGhTb0BXpK5SmmMap2LVDRa3QJ3M0d0xFw/H09z+9z70mGjMzAajtzuphoQHL7bb9I4K3CFlfjIK4TvYSt5jQiMBTgftz6FScxID8LRiyExlxzNQJ+UmtGUgbzdbVtYRnWL/tJVrwjkGcqn+bkDnnUu6PbIGXhR8pmMmqqUPm9rYOXL5AgxU590EwIDAQAB'

function toPEM(base64Key, type) {
  type = type || 'PRIVATE KEY'
  const lines = base64Key.match(/.{1,64}/g) || []
  return '-----BEGIN ' + type + '-----\n' + lines.join('\n') + '\n-----END ' + type + '-----'
}

const privateKeyPem = toPEM(privateKeyBase64, 'PRIVATE KEY')
const platformPublicKeyPem = toPEM(platformPublicKeyBase64, 'PUBLIC KEY')

function sortAndStringify(obj) {
  if (obj === null || obj === undefined) return '""'
  if (typeof obj === 'string') return '"' + obj + '"'
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  if (Array.isArray(obj)) return '[' + obj.map(sortAndStringify).join(',') + ']'
  const record = obj
  const keys = Object.keys(record)
    .filter(k => k !== 'sign')
    .filter(k => record[k] !== null && record[k] !== undefined)
    .sort()
  const pairs = keys.map(k => '"' + k + '":' + sortAndStringify(record[k]))
  return '{' + pairs.join(',') + '}'
}

function buildSignString(params) {
  return sortAndStringify(params)
}

function buildVerifySignString(obj) {
  if (obj === null) return 'null'
  if (typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return '[' + obj.map(buildVerifySignString).join(',') + ']'
  const sorted = {}
  Object.keys(obj)
    .filter(k => k !== 'sign')
    .sort()
    .forEach(k => { sorted[k] = obj[k] })
  return JSON.stringify(sorted)
}

/**
 * RSA2签名
 * @param {Object} params 请求参数
 * @returns {string} Base64签名
 */
export function rsa2Sign(params) {
  const signStr = buildSignString(params)
  const key = rs.KEYUTIL.getKey(privateKeyPem)
  const sig = new rs.KJUR.crypto.Signature({ alg: 'SHA256withRSA' })
  sig.init(key)
  sig.updateString(signStr)
  return rs.hextob64(sig.sign())
}

/**
 * 验证返回签名
 * @param {Object} content 返回内容
 * @param {string} signature 签名
 * @returns {boolean}
 */
export function verifySign(content, signature) {
  const signStr = buildVerifySignString(content)
  const pubKey = rs.KEYUTIL.getKey(platformPublicKeyPem)
  const sig = new rs.KJUR.crypto.Signature({ alg: 'SHA256withRSA' })
  sig.init(pubKey)
  sig.updateString(signStr)
  return sig.verify(rs.b64tohex(signature))
}
