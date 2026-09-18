# 留言板后端（GitHub 登录 + 阿里云存数据）

本目录是 AuiahaHome 的 API 服务：

- 访客用 **GitHub OAuth** 登录
- 留言写入服务器上的 **`data/messages.json`**
- 把这个服务部署到 **阿里云 ECS** 后，数据就保存在阿里云磁盘上

---

## 一、整体结构

```
浏览器前端 (Vite :5173)
    │  /api/*
    ▼
本后端 (Express :8787)
    │  GitHub OAuth 登录
    ▼
data/messages.json   ← 留言真实存放位置（在阿里云服务器硬盘上）
```

---

## 二、本地先跑通（必做）

### 1. 创建 GitHub OAuth App

1. 打开：https://github.com/settings/developers  
2. **OAuth Apps** → **New OAuth App**  
3. 填写：
   - **Application name**：`AuiahaHome Guestbook`
   - **Homepage URL**：`http://localhost:5173`
   - **Authorization callback URL**：`http://localhost:8787/api/auth/github/callback`
4. 创建后复制 **Client ID**，再生成 **Client Secret**

### 2. 配置环境变量

在 `server` 目录：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
PORT=8787
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8787
GITHUB_CLIENT_ID=你的ClientID
GITHUB_CLIENT_SECRET=你的ClientSecret
SESSION_SECRET=请换成很长的随机字符串
DATA_FILE=./data/messages.json
CORS_ORIGIN=http://localhost:5173
```

生成随机密钥示例：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 安装并启动

开两个终端：

```bash
# 终端 1：后端
cd server
npm install
npm run dev
```

```bash
# 终端 2：前端（项目根目录）
npm run dev
```

浏览器打开 http://localhost:5173 → 滚到「联系」→ **使用 GitHub 登录** → 留言。

### 4. 确认数据写进了服务器文件

本地留言成功后，打开：

`server/data/messages.json`

能看到 JSON 数组，就说明「存入服务器」已经生效。部署到阿里云后，是同一套逻辑，只是文件在云主机上。

---

## 三、部署到阿里云 ECS（推荐入门方案）

### 1. 买一台轻量 / ECS

- 系统建议：**Ubuntu 22.04**
- 安全组放行：**22**（SSH）、**80**（HTTP）、**443**（HTTPS，可选）
- 记下公网 IP，例如：`47.x.x.x`

### 2. 登录服务器并安装环境

```bash
ssh root@你的公网IP

sudo apt update
sudo apt install -y nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 3. 上传代码

任选一种：

- `git clone` 你的仓库  
- 或本机用 `scp` / 宝塔面板上传整个项目

例如放到：

```bash
/var/www/auiahahome
```

### 4. 构建前端 + 启动后端

```bash
cd /var/www/auiahahome
npm install
npm run build

cd /var/www/auiahahome/server
cp .env.example .env
nano .env
```

阿里云上的 `.env` 示例（用你的 IP 或域名替换）：

```env
PORT=8787
NODE_ENV=production
FRONTEND_URL=http://你的公网IP
BACKEND_URL=http://你的公网IP
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SESSION_SECRET=生产环境必须换新密钥
DATA_FILE=./data/messages.json
CORS_ORIGIN=http://你的公网IP
```

然后：

```bash
npm install
mkdir -p data
pm2 start src/index.js --name auiaha-api
pm2 save
pm2 startup
```

### 5. 配置 Nginx 反代（同域最省事）

创建 `/etc/nginx/sites-available/auiahahome`：

```nginx
server {
  listen 80;
  server_name 你的公网IP;   # 有域名就写域名

  root /var/www/auiahahome/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:8787/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/auiahahome /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. 改 GitHub OAuth 回调为线上地址

回到 GitHub OAuth App 设置：

- Homepage URL：`http://你的公网IP`（或 `https://你的域名`）
- Callback URL：`http://你的公网IP/api/auth/github/callback`

因为 Nginx 把 `/api` 转到了后端，回调走 80 端口即可，不必对外暴露 8787。

### 7. 数据在哪里？

在阿里云服务器上：

```bash
cat /var/www/auiahahome/server/data/messages.json
```

这就是留言板内容。备份只要复制这个文件：

```bash
cp /var/www/auiahahome/server/data/messages.json ~/messages-backup.json
```

---

## 四、常见问题

| 现象 | 处理 |
|---|---|
| 前端提示连不上服务器 | 先确认 `server` 已 `npm run dev` / `pm2` 在跑 |
| GitHub 登录后报错 | 检查 Callback URL 是否与 `BACKEND_URL` + `/api/auth/github/callback` 完全一致 |
| 登录成功但立刻掉线 | 生产环境需 HTTPS 时把站点升到 HTTPS；或暂时同域反代 |
| 想换数据库 | 当前是 JSON 文件，便于入门；以后可改成阿里云 RDS MySQL |

---

## 五、API 一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/auth/github` | 跳转 GitHub 登录 |
| GET | `/api/auth/me` | 当前登录用户 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/messages` | 留言列表 |
| POST | `/api/messages` | 发布留言（需登录） |
| DELETE | `/api/messages/:id` | 删除自己的留言 |
