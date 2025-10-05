# 项目配置

## 安装依赖

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

nvm install
nvm alias default 22
nvm use

npm install

npm update && npm ci
```

## 配置文件

您可以在 `package.json` 中修改或添加额外的脚本，以下是一些预置的脚本命令：

### 调试项目

🚀 **使用以下命令启动项目调试** 🚀：

```bash
npm start
```

程序会运行在： [localhost:8000](http://localhost:8000/)

### 检查代码格式

```bash
npm run lint
```

### 检查并自动修复代码格式

```bash
npm run lint:fix
```

### 测试代码

```bash
npm test
```

### 构建项目

```bash
npm run build
```

## 自动发布

项目的 .github/workflows/build.yml 文件中配置了基于 tag 的自动发布流程，只需在本地创建一个符合'v\*'格式的 tag 并推送到远程仓库即可触发发布。通过在项目中配置密钥 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID，即可实现自动部署到 Cloudflare Pages。

```bash
# 列出已有标签
git tag

# 创建一个新的标签
git tag v0.0.1

# 将该标签推送到远程
git push origin v0.0.1
```
