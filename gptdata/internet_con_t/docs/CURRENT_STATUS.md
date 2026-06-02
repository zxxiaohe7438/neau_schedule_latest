# NEAU Local Schedule - 当前状态

更新日期：2026-06-02

## 项目概述

完全本地运行的东北农业大学个人课表管理桌面软件。

## 开发进度

| 阶段 | 状态 | 完成内容 |
|------|------|----------|
| Day 1 | ✅ 完成 | 项目初始化、数据库层、基础 UI |
| Day 2 | ✅ 完成 | 课程数据层、TimetableGrid、CourseListView |
| Day 3 | ✅ 完成 | CourseEditor、双击编辑、JSON 导入预览 |
| Day 3.5 | ✅ 完成 | 双击编辑持久化验证、updated_manually 验证 |
| Day 4 | ✅ 完成 | HTML 导入、剪贴板导入、去重、冲突处理 |
| Day 5 | ⏳ 待做 | Excel/CSV 导入、备份恢复、学期归档 |
| Day 6 | ⏳ 待做 | 导出器框架、打包、总验收 |
| Online Login | ✅ 完成 | 学校账号登录 UI、凭据加密存储、mock 登录验证、callback JSON 解析 |

## 技术栈

- **前端**：React 18 + TypeScript + Vite
- **桌面**：Electron 33
- **数据库**：sql.js（纯 JavaScript SQLite）
- **HTML 解析**：cheerio@1.0.0-rc.12
- **Excel 解析**：xlsx
- **测试**：vitest
- **凭据加密**：Electron safeStorage

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
- 导入预览
- 去重检测
- 冲突处理（保留本地/覆盖/跳过）

### 学校系统登录

- 登录 UI（LoginPanel 组件）
- 凭据加密存储（credentialStore，使用 Electron safeStorage）
- 登录验证服务（schoolAuthService，当前为 mock 模式）
- Auth IPC handlers（auth:login, auth:logout, auth:status, auth:fetchSchedule）
- callback JSON 解析（schoolIndexImporter）
- Mock callback fixtures（6 门课程，覆盖 all/odd/even 周模式）

### 数据保护

- 手动修改标记 updated_manually
- 重新导入不静默覆盖手动修改
- source_hash 去重
- 密码绝不明文保存

### 备份恢复

- JSON 备份导出（自动/手动选择位置）
- JSON 备份恢复（恢复前自动备份）

## 测试状态

- TypeScript 类型检查：✅ 通过
- 单元测试：✅ 23+ 个通过
  - JSON 导入器：7 个
  - HTML 导入器：5 个
  - 剪贴板导入器：6 个
  - CSV 导入器：5 个
  - Mock callback 导入器：11 个
  - Auth service mock：6 个

## 文件结构

```
src/
  app/App.tsx              — 主应用组件
  components/
    TimetableGrid.tsx      — 周课表视图
    CourseListView.tsx      — 课程列表视图
    CourseEditor.tsx        — 课程编辑器
    SemesterManager.tsx     — 学期管理
    SemesterSwitcher.tsx    — 学期切换器
    ImportPreview.tsx       — 导入预览
    LoginPanel.tsx          — 登录面板（使用 IPC auth）
    Modal.tsx               — 弹窗组件
  db/
    connection.ts           — sql.js 连接管理
    schema.sql              — 数据库 schema
    seed.ts                 — 开发模式种子数据
    repositories/           — 数据访问层
  importers/
    jsonImporter.ts         — JSON 导入
    htmlImporter.ts         — HTML 导入
    clipboardImporter.ts    — 剪贴板导入
    xlsxImporter.ts         — CSV/Excel 导入
    schoolIndexImporter.ts  — NEAU callback JSON 导入
    normalizer.ts           — 数据规范化
  security/
    credentialStore.ts      — 凭据加密存储
  domain/                   — 类型定义
  utils/                    — 工具函数
electron/
  main.ts                   — Electron 主进程
  preload.ts                — 预加载脚本（含 auth API）
  ipc/
    authIpc.ts              — 认证 IPC handlers
    importIpc.ts            — 导入 IPC handlers
    ...
  services/
    schoolAuthService.ts    — 学校认证服务（mock 模式）
```

## 下一步

1. 运行 typecheck 和测试验证所有改动
2. 运行 dev 模式确认 UI 正常
3. 接入真实学校系统（需要用户手动测试）
4. 配置 electron-builder 打包
5. 全面测试和验收
