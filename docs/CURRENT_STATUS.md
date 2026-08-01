# NEAU Local Schedule - 当前状态

更新日期：2026-08-01

## 项目概述

完全本地运行的东北农业大学个人日程安排管理桌面软件。
**纯本地运行，不联网**：课表数据通过 JSON/HTML/剪贴板/Excel 文件导入，不支持也不包含任何学校官网联网获取功能（该功能已随 2026-08-01 重构移除，如将来需要可重新设计）。

## 开发进度

| 阶段 | 状态 | 完成内容 |
|------|------|----------|
| Day 1 | ✅ 完成 | 项目初始化、数据库层、基础 UI |
| Day 2 | ✅ 完成 | 课程数据层、TimetableGrid、CourseListView |
| Day 3 | ✅ 完成 | CourseEditor、双击编辑、JSON 导入预览 |
| Day 4 | ✅ 完成 | HTML 导入、剪贴板导入、去重、冲突处理 |
| Day 5 | ✅ 完成 | Excel/CSV 导入、备份恢复、学期归档 |
| Day 6 | ✅ 完成 | 导出器框架、打包、验收 |
| UI 迭代 | ✅ 完成 | 格子备注、智能粘贴、暗色模式、右键菜单、提醒系统 |
| 2026-08-01 重构 | ✅ 完成 | 移除全部联网/登录/账号代码，清理死代码，修复编码问题 |

## 技术栈

- **前端**：React 18 + TypeScript + Vite
- **桌面**：Electron 33
- **数据库**：sql.js（纯 JavaScript SQLite）
- **HTML 解析**：cheerio@1.0.0-rc.12
- **Excel 解析**：xlsx
- **测试**：vitest

## 数据库方案

**sql.js** — 纯 JavaScript 实现的 SQLite

### 持久化机制

1. 应用启动时从 `{userData}/data/schedule.db` 加载数据库
2. 如果文件不存在，创建新的内存数据库
3. 每次执行 INSERT/UPDATE/DELETE 后自动保存到文件
4. 事务完成后统一保存
5. 应用关闭前保存数据库

## 依赖兼容性注意事项

### cheerio 版本

- **cheerio@1.2.0** 通过 undici 依赖 `node:sqlite`，会导致启动错误
- **cheerio 必须精确固定为 1.0.0-rc.12**（不能使用 `^1.0.0-rc.12` 或 `~1.0.0-rc.12`）
- **禁止升级 cheerio 到 1.2.0 或更高版本**

### 禁止引入的依赖

- better-sqlite3（需要原生编译）
- sqlite3（需要原生编译）
- 任何需要 C++ 编译工具链的依赖
- 任何联网相关依赖（axios、playwright 等）

## 已完成功能

### 学期管理

- 新建学期
- 归档学期
- 删除学期
- 学期切换

### 课程管理

- 课程 CRUD（通过 IPC）
- 课程事件 CRUD（通过 IPC）
- 自动颜色分配
- 双击课表编辑课程

### 课表展示

- 周课表视图（CSS Grid）
- 课程列表视图
- 长课跨节次显示
- 今天高亮
- 周次切换

### 数据导入

- JSON 导入（完整实现）
- HTML 导入（基础实现）
- 剪贴板导入（基础实现）
- CSV/Excel 导入（完整实现）
- 智能粘贴（考试时间等文本自动识别）
- 导入预览
- 去重检测（source_hash）
- 冲突处理（保留本地/覆盖/跳过）

### 自定义格子备注

- cell_annotations 表（存储备注和颜色）
- CellNoteEditor 组件（点击空格子编辑备注）
- 9 种预设颜色选择
- 备注按周次和单双周过滤

### 提醒系统

- 默认提醒：课程/备注上课前 N 分钟提醒（可配置）
- 自定义提醒：针对具体课程事件设置任意时间提醒
- 应用内 Toast 弹窗 + 桌面系统通知（Windows AppUserModelID）
- 提醒设置面板（开关、提前分钟数、通知方式）
- 提醒数据存 localStorage（纯本地）

### 备份恢复

- JSON 备份导出（手动选择位置）
- JSON 备份恢复（恢复前自动备份）

### 数据保护

- 手动修改标记 updated_manually
- 重新导入不静默覆盖手动修改
- source_hash 去重

## 测试状态

- TypeScript 类型检查：✅ 通过
- 单元测试：✅ 全部通过（5 个测试文件，约 38 个用例）
  - 剪贴板导入器：6 个
  - 导出器（tools/neau-timetable-exporter）：16 个
  - HTML 导入器：5 个
  - JSON 规范化：6 个
  - CSV/Excel 导入器：5 个

## 文件结构

```
src/
  app/App.tsx              — 主应用组件
  components/
    TimetableGrid.tsx      — 周课表视图
    CourseListView.tsx     — 课程列表视图
    CourseEditor.tsx       — 课程编辑器
    SemesterManager.tsx    — 学期管理（含备份/恢复）
    SemesterSwitcher.tsx   — 学期切换器
    ImportPreview.tsx      — 导入预览
    CellNoteEditor.tsx     — 格子备注编辑器
    SmartPasteDialog.tsx   — 智能粘贴对话框
    ReminderSettings.tsx   — 提醒设置面板
    CustomReminderDialog.tsx — 自定义提醒对话框
    ReminderToast.tsx      — 提醒 Toast 组件
    Modal.tsx              — 弹窗组件
  db/
    connection.ts          — sql.js 连接管理
    schema.sql             — 数据库 schema
    seed.ts                — 开发模式种子数据
    repositories/          — 各实体数据访问
  importers/
    jsonImporter.ts        — JSON 导入
    htmlImporter.ts        — HTML 导入
    clipboardImporter.ts   — 剪贴板导入
    xlsxImporter.ts        — CSV/Excel 导入
    textRecognizer.ts      — 智能文本识别
    normalizer.ts          — 数据规范化
  domain/                  — 类型定义
  utils/                   — 工具函数（含 weekday 共享映射）
  hooks/useReminderScheduler.ts — 提醒调度
  styles/                  — global.css / reminder.css
electron/
  main.ts                  — Electron 主进程
  preload.ts               — 预加载脚本（window.api 定义）
  ipc/                     — 各模块 IPC handlers
```

## 下一步

1. 用户运行 `npm run dev` 冒烟验证 UI（本环境无法人工验收 GUI）
2. 真实数据导入测试（JSON/Excel/剪贴板/智能粘贴）
3. 提醒功能验证（设置提醒 → 到点触发 Toast/系统通知）
4. 备份导出/恢复验证
5. `npm run build` 打包验收
