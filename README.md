# NEAU Local Schedule

东北农业大学个人课表管理桌面软件 — 默认纯本地运行；唯一联网行为是用户主动触发的学校官网课表抓取（仅连接 `*.neau.edu.cn` 官方域名）。

## 功能

- 学期管理（创建 / 归档 / 删除）
- 周课表展示（单双周过滤、当前周高亮、节次时间）
- 课程与课程事件编辑
- JSON 课表导入（含智能粘贴文本识别）
- **官网获取课表**（2026-08-03 新增）：应用内登录窗口扫码/账号登录 → 自动抓取本学期课表 → 复用导入预览/冲突裁决（密码不经过应用，会话加密保存可选）
- 格子备注（颜色 / 提醒）
- 自定义提醒（系统通知 + 应用内 Toast）
- 数据备份导出 / 恢复（SQLite 全量导出）
- 开发模式测试数据（seed / clearAll / 官网抓取模拟数据）

## 技术栈

- Electron (main process) + React + TypeScript
- Vite (bundler) + vite-plugin-electron
- SQLite via sql.js（纯 JavaScript 实现，无需原生编译）
- cheerio（HTML 解析，**固定 1.0.0-rc.12**，见 AGENTS.md 兼容性说明）
- xlsx（Excel/CSV 解析）
- vitest（测试）

## 命令

```powershell
npm install      # 安装依赖
npm run dev      # 启动开发模式（Vite + Electron）
npm run build    # 类型检查 + 构建 + electron-builder 打包
npm run test     # 运行全部测试
npm run typecheck  # TypeScript 类型检查
npm run exporter:from-html -- --input <html> --output output/timetable.json  # HTML 课表转 JSON
```

## 目录结构

```
electron/          — Electron main/preload/IPC
src/
  app/             — React 入口（App.tsx 视图组装）
  components/      — UI 组件
  db/              — schema, connection, repositories
  domain/          — 领域类型定义
  hooks/           — 数据加载 / 导入 / 编辑 / 提醒调度 hooks
  importers/       — JSON/HTML/clipboard/xlsx/text 导入器
  utils/           — 工具函数
  styles/          — 全局样式
tools/             — 独立工具（HTML 课表导出器）
tests/             — 测试和 fixtures
docs/              — 文档（archive/ 为历史归档）
```

## 数据存储

- 数据库：`{userData}/data/schedule.db`（sql.js，每次写入后自动持久化）
- 备份：`{userData}/data/backups/*.json`
- 学校会话（可选）：`{userData}/data/school-session.json`（safeStorage 加密，不含密码）

## 官网获取课表

1. 点击工具栏"**官网获取**"→ 打开登录窗口（学校统一身份认证，支持扫码/账号/微信登录）
2. 登录成功后应用自动检测并接管会话，点击"获取课表"抓取本学期课程安排
3. 确认学期信息（开学日期/周数可修正）→ 进入导入预览（新增/重复/冲突裁决）→ 确认写入
4. 会话默认加密保存（"记住登录"可关闭，关闭即清除会话）
5. 开发模式提供"模拟数据"按钮离线演示完整流程；学校系统改版时抓一份接口响应即可校准解析器

### 校外访问（WebVPN）

- 在校外请选"**WebVPN 入口（校外）**"：窗口内登录 WebVPN（https://webvpn.neau.edu.cn/），在门户中点击"教务处-学生系统"进入课表页面即可自动接管
- 登录窗口与抓取统一使用 **Edge 风格 UA**（WebVPN 对 Chromium 内核 UA 敏感——Edge 可登录、Chrome 风格可能被拒）
- 校内选"校内入口"直连即可；开学后需实机联调（见 `docs/CURRENT_STATUS.md` 顶部清单）

## 文档

- `docs/architecture.md` — 分层架构
- `docs/requirements.md` — MVP 需求
- `docs/CURRENT_STATUS.md` — 当前状态
- `docs/dev-log/` — 每日开发日志
- `AGENTS.md` — 开发规则与依赖兼容性说明（重要，开发前必读）
