# 编译环境
FROM node:12.22.12 as builder

WORKDIR /go/src/github.com/lecex/TV
COPY . .
# RUN npm install
# RUN npm run build

# 运行环境自动构建
FROM nginx:alpine

RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
WORKDIR /usr/share/nginx/html
COPY --from=builder /go/src/github.com/lecex/TV/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /go/src/github.com/lecex/TV/src/manifest.json ./manifest.json
COPY --from=builder /go/src/github.com/lecex/TV/unpackage/release/ .