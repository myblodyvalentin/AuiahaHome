# AuiahaHome

个人站点：[AuiahaHome](https://github.com/myblodyvalentin/AuiahaHome)

线上访问：https://myblodyvalentin.github.io/AuiahaHome/

## 开发

```bash
# 前端
npm install
npm run dev

# 后端留言板（另开终端）
cd server
cp .env.example .env   # 填写 GitHub OAuth 等配置
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## 当前页面

- 顶部菜单栏：左侧悬停展开全站模块导航（页面右移并变暗）
- 右侧 GitHub 头像入口，跳转 [myblodyvalentin](https://github.com/myblodyvalentin)
- 模块：首页、关于、社交（草地种花）、项目、笔记、联系（GitHub 登录留言板）

部署说明见 [`server/README.md`](server/README.md)。
