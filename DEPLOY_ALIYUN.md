# 阿里云 Ubuntu 22.04 部署命令清单

服务器信息：

- 系统：Ubuntu 22.04
- 公网 IP：`47.116.35.158`
- 部署目录：`/var/www/zhangyuan-h5`
- 访问方式：先使用 IP，不配置域名和 HTTPS

> 说明：当前项目已支持用 Node/Express 启动前台和后台 API，SQLite 数据库会自动初始化到 `data/app.sqlite`，上传文件会保存到 `uploads/`。

## 1. 登录服务器

```bash
ssh root@47.116.35.158
```

## 2. 安装 Git、Node.js 20、Nginx、PM2

```bash
apt update
apt upgrade -y

apt install -y git curl nginx build-essential python3 make g++

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

npm install -g pm2

node -v
npm -v
pm2 -v
nginx -v
```

## 3. 拉取项目到 /var/www/zhangyuan-h5

```bash
mkdir -p /var/www
cd /var/www

if [ -d /var/www/zhangyuan-h5 ]; then
  cd /var/www/zhangyuan-h5
  git pull
else
  git clone https://github.com/holidaysitu-blip/-1.git zhangyuan-h5
  cd /var/www/zhangyuan-h5
fi
```

## 4. 配置 .env

```bash
cd /var/www/zhangyuan-h5

cat > .env <<'EOF'
NODE_ENV=production
PORT=3000
APP_URL=http://47.116.35.158

ADMIN_USERNAME=admin
ADMIN_PASSWORD=guwuxuanyexiao
CONTENT_ADMIN_USERNAME=admin
CONTENT_ADMIN_PASSWORD=guwuxuanyexiao

QWEN_API_KEY=
DASHSCOPE_API_KEY=
WECHAT_APP_ID=
WECHAT_APP_SECRET=
EOF
```

上线后建议把 `ADMIN_PASSWORD` 和 `CONTENT_ADMIN_PASSWORD` 改成更强的密码：

```bash
nano /var/www/zhangyuan-h5/.env
```

## 5. 初始化数据目录和上传目录

SQLite 数据库和上传文件目录：

```bash
cd /var/www/zhangyuan-h5

mkdir -p data uploads
chmod 755 data uploads
```

说明：

- 数据库文件会在服务首次启动时自动创建：`/var/www/zhangyuan-h5/data/app.sqlite`
- 上传图片会保存到：`/var/www/zhangyuan-h5/uploads/`

## 6. 安装依赖并构建前端

```bash
cd /var/www/zhangyuan-h5

npm install
npm run build
```

## 7. 使用 PM2 启动 Node/Express 服务

```bash
cd /var/www/zhangyuan-h5

pm2 delete zhangyuan-h5 2>/dev/null || true
pm2 start npm --name zhangyuan-h5 -- run start
pm2 save
pm2 startup
```

执行 `pm2 startup` 后，终端会输出一行 `sudo env PATH=... pm2 startup ...` 命令。复制那一整行再执行一次。

查看运行状态和日志：

```bash
pm2 status
pm2 logs zhangyuan-h5
```

重启服务：

```bash
pm2 restart zhangyuan-h5 --update-env
```

## 8. 配置 Nginx

```bash
cat > /etc/nginx/sites-available/zhangyuan-h5 <<'EOF'
server {
    listen 80;
    server_name 47.116.35.158;

    client_max_body_size 50m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /.netlify/functions/ {
        proxy_pass http://127.0.0.1:3000/.netlify/functions/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/zhangyuan-h5 /etc/nginx/sites-enabled/zhangyuan-h5
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
systemctl status nginx --no-pager
```

这个 Nginx 配置支持：

- `/`
- `/admin`
- `/content-admin`
- 其他 React 前端路由刷新不 404
- `/api/` 反向代理
- `/.netlify/functions/` 兼容旧 API 路径
- `/uploads/` 上传图片访问

## 9. 开放阿里云安全组

在阿里云控制台安全组中确认开放：

- TCP `22`
- TCP `80`

本阶段不处理域名和 HTTPS，暂时不需要配置 `443`。

## 10. 验证访问

服务器内检查：

```bash
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/admin
curl http://127.0.0.1:3000/api/courses
```

公网访问：

- `http://47.116.35.158/`
- `http://47.116.35.158/admin`
- `http://47.116.35.158/content-admin`

刷新 `/admin` 和 `/content-admin`，应保持正常显示，不应 404。

## 11. 后续更新代码

```bash
cd /var/www/zhangyuan-h5

git pull
npm install
npm run build
pm2 restart zhangyuan-h5 --update-env
```

## 12. 常用排错命令

```bash
pm2 status
pm2 logs zhangyuan-h5

nginx -t
tail -n 100 /var/log/nginx/error.log

ls -lh /var/www/zhangyuan-h5/data
ls -lh /var/www/zhangyuan-h5/uploads
```
