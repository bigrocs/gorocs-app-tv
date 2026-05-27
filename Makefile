.PHONY: git
git:
	git add .
	git commit -m"自动提交 git 代码"
	git push
tag:
	git push --tags
.PHONY: docker
docker:
	docker build -f Dockerfile  -t pay
.PHONY: run
run:
	yarn serve
.PHONY: wechat
wechat:
	yarn dev:mp-weixin
.PHONY: alipay
alipay:
	yarn dev:mp-alipay
.PHONY: build
build:
	yarn build:app-plus
.PHONY: app
app:
	yarn dev:app-plus