# zzbbs-forum-web

基于 React 18+ / Vite / TypeScript / MUI 的 zzbbs 前端，对接后端 `/api` 接口。

## 开发

```bash
npm install
npm run dev          # http://localhost:3000，默认代理到 http://localhost:8080
PYBBS_BACKEND=http://host:8080 npm run dev   # 指定后端地址
```

## 打包部署

```bash
npm run build        # 产物在 dist/
```

把 `dist/` 交给 Nginx 托管，并将 `/api`、`/common`、`/static`、`/upload`、`/oauth`、`/websocket` 反向代理到 zzbbs 后端；其余路径回退到 `index.html`（SPA）。

```nginx
location / { root /path/to/dist; try_files $uri /index.html; }
location ~ ^/(api|common|static|upload|oauth) { proxy_pass http://127.0.0.1:8080; }
location /websocket { proxy_pass http://127.0.0.1:8080; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
```

验证码依赖后端 session（Cookie），因此前端与后端需同域（通过上面的反向代理实现）。

## 功能

首页（全部/精华/最新/热门/无人问津）、标签、搜索、积分榜、话题详情（评论增删改、点赞、收藏、作者其他话题）、发布/编辑话题（图片、视频上传）、登录（账号密码 / 手机验证码 / 第三方）、注册、个人主页、个人设置（头像、资料、邮箱绑定与激活、改密码、刷新 token）、通知（开启 websocket 时实时推送，否则每分钟轮询）、中英文切换。

第三方登录：前端跳转 `/oauth/redirect/{type}?spa=1`，回调后后端把登录态写入 session 并跳回前端 `/oauth-login`，前端再调 `/api/oauth/session` 换取 token（token 不出现在 URL 里）。
需要后端提供 `/api/search`、`/api/top100`、`/api/site`、`GET /api/settings`、`/api/oauth/session`（均已在 zzbbs 主仓库中实现）。

## 发布与部署

push 到 `main` 后，`.github/workflows/release-dist.yml` 会构建并把 `forum-ui.tar.gz` 发到固定 tag `deploy-latest` 的 release。

挂载路径：站点根路径 `/`（构建使用默认 `base=/`）。

服务器侧：
1. 把 `deploy/deploy-forum-ui.sh` 放到 `/home/pybbs/`，执行 `bash deploy-forum-ui.sh`（下载走 mihomo 代理，原子替换，保留上一版 `forum-ui.bak`）。
2. nginx 按 `deploy/nginx-forum.conf.example` 修改：`/` 指向静态目录，`/api`、`/common`、`/static`、`/oauth`、`/admin`、`/adminlogin`、`/active`、`/bot`、`/websocket` 仍转给后端。
3. `nginx -t` 通过后再 `nginx -s reload`。

回滚：`cd /home/pybbs && rm -rf forum-ui && mv forum-ui.bak forum-ui`。
