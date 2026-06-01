# NEAU Local Schedule

完全本地运行的东北农业大学个人课表管理桌面软件。

## 核心规则

1. 主软件不联网，不保存学校账号密码，不绕过验证码。
2. 所有数据保存在本地 SQLite。
3. 只允许在当前仓库（D:\coding_relative\neau-local-schedule）内工作。
4. 禁止加入云同步、遥测、在线 CDN、账号系统。
5. 优先实现 MVP，不擅自扩展功能。
6. 导入器统一输出 CourseEvent 结构。
7. 手动修改过的数据重新导入时不得静默覆盖。
8. 每次完成任务必须运行测试或写明无法测试原因。
9. 每天必须写 docs/dev-log/YYYY-MM-DD.md。
10. 每天结束前输出完成内容、改动文件、测试结果、风险和下一步建议。

## 技术栈

- Electron (main process)
- React (renderer)
- TypeScript
- Vite (bundler)
- SQLite (better-sqlite3)
- CSS Grid
- cheerio (HTML 解析)
- xlsx (Excel 导入)
- electron-builder (打包)
- vitest (测试)

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
