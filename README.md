# CRM AI Platform (CRM 智能日志分析平台)

基于 Next.js 开发的智能化日志全链路分析与调试工具，旨在通过 AI 技术简化复杂的分布式系统日志排查流程。

## 🌟 核心特性

- **多端日志聚合**：支持 BSSP、SAC、TE、BOP 等核心系统的日志远程抓取与实时监控。
- **智能化诊断**：集成 AI 深度全链路分析，能够根据业务流水号自动识别性能瓶颈、逻辑冲突及潜在错误节点。
- **高效日志搜寻**：
  - 采用 `find` + `grep` 组合，支持 48 小时内的全文件覆盖搜索。
  - 针对高负载服务器进行了性能优化（Locale/Parallel 优化预留）。
- **文件分组展示**：日志按源文件名自动分组，支持 Accordion 折叠视图，提供清晰的调试上下文。
- **状态持久化**：使用 Zustand + LocalStorage 实现全局状态持久化，切换页面或刷新浏览器不丢失调试现场。
- **响应报文美化**：自动识别并美化 JSON/XML 报文，提升阅读体验。

## 🚀 快速开始

### 1. 环境配置
在项目根目录下创建 `.env.local` 文件并配置：
```env
# AI 配置
AI_API_KEY=your_api_key
AI_MODEL=your_model
AI_BASE_URL=your_base_url
```

### 2. 一键启动（生产模式）

**Windows:**
```
start-app.bat
```

**Linux / Mac:**
```bash
chmod +x start-app.sh
./start-app.sh
```

### 3. 开发模式
```bash
npm install
npm run dev
```
访问 [http://localhost:3000](http://localhost:3000) 即可开始。

## 📁 项目结构

- `src/app`: Next.js 页面与 API 路由处理。
- `src/components`: UI 组件（HTTP 工具、日志标签页等）。
- `src/store`: 全局状态管理（Zustand）。
- `src/lib`: 工具类与默认环境配置。
- `scripts/`: 用于主机配置生成与数据迁移的辅助脚本。
- `docker/`: 容器化部署方案（Dockerfile）。

## 🔧 技术栈

- **Frontend**: Next.js, React, Tailwind CSS, Lucide React, Radix UI
- **State**: Zustand
- **AI**: 通用 LLM 接口适配 (SSE Streaming)
- **Backend**: Node.js, node-ssh (SSH2)
- **Editor**: Monaco Editor

---

Developed for UniDev CRM Log Analysis.
