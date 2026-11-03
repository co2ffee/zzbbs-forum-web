#!/bin/bash
# 用法：bash deploy-forum-ui.sh   下载最新用户端静态产物 → 校验 → 原子替换（不需要重启后端）
# 放在服务器 /home/pybbs/ 下；下载走本机 mihomo 代理(127.0.0.1:7891)
set -e
cd /home/pybbs

URL="https://github.com/co2ffee/zzbbs-forum-web/releases/download/deploy-latest/forum-ui.tar.gz"

echo "通过代理下载用户端前端..."
curl --socks5 127.0.0.1:7891 -fL --max-time 120 -o forum-ui.tar.gz.new "$URL"

if [ ! -s forum-ui.tar.gz.new ] || ! tar -tzf forum-ui.tar.gz.new >/dev/null 2>&1; then
    echo "下载的压缩包无效，取消部署"
    rm -f forum-ui.tar.gz.new
    exit 1
fi

rm -rf forum-ui.new
mkdir forum-ui.new
tar -xzf forum-ui.tar.gz.new -C forum-ui.new
rm -f forum-ui.tar.gz.new

if [ ! -f forum-ui.new/index.html ]; then
    echo "压缩包里没有 index.html，取消部署"
    rm -rf forum-ui.new
    exit 1
fi

echo "替换静态文件（保留上一版 forum-ui.bak，出问题可回滚）..."
rm -rf forum-ui.bak
[ -d forum-ui ] && mv forum-ui forum-ui.bak
mv forum-ui.new forum-ui
echo "用户端前端部署完成"
