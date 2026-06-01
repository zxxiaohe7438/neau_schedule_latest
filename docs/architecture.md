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
- **electron/** — Electron 主进程和 IPC handlers
- **components/** — React UI 组件（仅 renderer）
- **app/** — React 入口和路由

## 数据流

1. React 组件调用 `window.api.*`（通过 contextBridge）
2. preload.ts 通过 ipcRenderer 发送 IPC 消息
3. main.ts 中的 ipcMain handler 调用 repository
4. Repository 操作 SQLite 并返回结果
5. 结果通过 IPC 返回给 React 组件

## 约束

- 主软件不联网
- 不保存学校凭证
- SQLite 是唯一事实来源
- 手动修改标记 updated_manually
- 导入不静默覆盖
