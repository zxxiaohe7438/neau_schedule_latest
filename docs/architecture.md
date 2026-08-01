# NEAU Local Schedule - 架构设计

## 总体架构

```
┌─────────────────────────────────────────────┐
│                  Electron                    │
│  ┌─────────────┐    ┌────────────────────┐  │
│  │  Main Process │    │  Renderer Process   │  │
│  │              │    │                    │  │
│  │  - SQLite    │    │  - React UI        │  │
│  │  - IPC       │◄──►│  - CSS Grid        │  │
│  │  - File I/O  │    │  - Components      │  │
│  │  - Importers │    │                    │  │
│  └─────────────┘    └────────────────────┘  │
│         ▲                     ▲              │
│         │    preload.ts       │              │
│         └──── contextBridge ─┘              │
└─────────────────────────────────────────────┘
```

## 分层

- **domain/** — 纯 TypeScript 类型定义，无依赖
- **db/** — SQLite schema、连接、repositories（仅 main process）
- **importers/** — 数据导入解析器（仅 main process）
- **electron/** — Electron 主进程、IPC handlers
- **components/** — React UI 组件（仅 renderer）
- **app/** — React 入口和路由

## 数据流

### 常规数据流

1. React 组件调用 `window.api.*`（通过 contextBridge）
2. preload.ts 通过 ipcRenderer 发送 IPC 消息
3. main.ts 中的 ipcMain handler 调用 repository
4. Repository 操作 SQLite 并返回结果
5. 结果通过 IPC 返回给 React 组件

### 导入数据流

```
Renderer                 Main Process
   │                          │
   │── import:json ─────────►│
   │                          │── importJson() 解析数据
   │                          │── checkDuplicatesAndConflicts()
   │                          │    （source_hash 去重 + updated_manually 冲突检测）
   │◄─ ImportResult ─────────│
   │                          │
   │── import:confirm ──────►│
   │                          │── 写入 SQLite（学期/课程/课程事件）
   │◄─ done ─────────────────│
```

### 备份数据流

```
Renderer                 Main Process
   │                          │
   │── backup:exportTo ─────►│── dialog.showSaveDialog
   │                          │── 导出学期 JSON 到用户选择位置
   │── backup:import ───────►│── dialog.showOpenDialog
   │                          │── 恢复前先 autoBackup
   │                          │── 校验版本并写入 SQLite
```

## 约束

- 纯本地运行：不联网、不接云服务、不接账号系统
- 不保存任何学校账号、密码、cookie、token
- SQLite 是课表数据的唯一事实来源
- 手动修改标记 updated_manually
- 导入不静默覆盖
- 提醒设置与自定义提醒存储在 localStorage（纯本地）

## 数据存储位置

- 课表数据：SQLite `{userData}/data/schedule.db`
- 备份数据：`{userData}/data/backups/`（自动）或用户选择位置（手动）
- 所有数据都在用户本地数据目录，不在项目源码目录
