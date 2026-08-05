# NEAU Local Schedule

东北农业大学个人课表管理桌面软件，纯本地运行，不联网。

## 核心规则

1. 所有数据保存在本地 SQLite。
2. 只允许在当前仓库（D:\coding_relative\neau-local-schedule）内工作。
3. 禁止加入云同步、遥测、在线 CDN、账号系统，禁止联网获取数据。
4. 优先实现 MVP，不擅自扩展功能。
5. 导入器统一输出 CourseEvent 结构。
6. 手动修改过的数据重新导入时不得静默覆盖。
7. 每次完成任务必须运行测试或写明无法测试原因。
8. 每天必须写 docs/dev-log/YYYY-MM-DD.md。
9. 每天结束前输出完成内容、改动文件、测试结果、风险和下一步建议。

## 技术栈

- Electron (main process)
- React (renderer)
- TypeScript
- Vite (bundler)
- SQLite (sql.js) — 纯 JavaScript 实现，无需原生编译
- CSS Grid
- cheerio (HTML 解析) — 固定 1.0.0-rc.12，见下方兼容性说明
- xlsx (Excel 导入)
- electron-builder (打包)
- vitest (测试)

## Dependency Compatibility Notes

### cheerio 版本兼容性

- **cheerio@1.2.0** 通过 undici 依赖 `node:sqlite`，而 Electron 的 Node.js 版本不支持此模块，会导致启动错误：`ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`
- **cheerio 必须精确固定为 1.0.0-rc.12**（不能使用 `^1.0.0-rc.12` 或 `~1.0.0-rc.12`）
- **禁止升级 cheerio 到 1.2.0 或更高版本**，除非确认 undici 不再引用 node:sqlite

### 数据库方案

- **当前使用 sql.js** — 纯 JavaScript 实现的 SQLite，无需编译原生模块
- Day 1 原计划使用 better-sqlite3，但因 Windows 编译问题改用 sql.js
- **禁止重新引入 better-sqlite3、sqlite3 或其他需要原生编译的 SQLite 依赖**
- 数据库文件保存在 `{userData}/data/schedule.db`，每次写入后自动持久化

## 命令

- `npm install` — 安装依赖
- `npm run dev` — 启动开发模式（Vite + Electron）
- `npm run build` — 构建并打包
- `npm run test` — 运行测试

## 目录结构

```
electron/          — Electron main/preload/IPC
src/
  app/             — React 入口和路由
  components/      — UI 组件
  db/              — schema, migrations, repositories
  importers/       — JSON/HTML/clipboard/xlsx 导入器
  domain/          — 领域类型定义
  utils/           — 工具函数
  styles/          — 全局样式
tools/             — 独立工具（导出器）
data/              — 数据目录（备份、原始导入）
docs/              — 文档
tests/             — 测试和 fixtures
.claude/skills/    — Claude Code skills
```

## 命令行规则

- Windows 命令优先 PowerShell。
- 不使用 rg（ripgrep）。
- 不使用 any，除非有明确理由并写注释说明。
- 所有检查命令都必须有真实输出，不允许用 None 或空输出作为成功依据。
