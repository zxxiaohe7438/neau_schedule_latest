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
- **importers/** — 数据导入解析器（仅 main process，纯函数）
- **config/** — 学校域名白名单、课表接口路径等常量
- **electron/** — Electron 主进程、IPC handlers、services（会话/抓取）
- **components/** — React UI 组件（仅 renderer）
- **hooks/** — 数据加载/导入/编辑/提醒调度逻辑（仅 renderer）
- **app/** — React 入口和视图组装

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
   │  (import:recognizeText) │── importJson()/recognizeText() 解析数据
   │                          │── checkDuplicatesAndConflicts()
   │                          │    （source_hash 去重 + updated_manually 冲突检测
   │                          │     + 同格重叠检测：调课/换地点后哈希变化但格子相同）
   │◄─ ImportResult ─────────│
   │                          │
   │── import:confirm ──────►│
   │                          │── 写入 SQLite（学期/课程/课程事件）
   │                          │    （冲突裁决：skip / keep_local 均保留本地；
   │                          │      仅 overwrite 更新既有事件）
   │◄─ done ─────────────────│
```

### 官网课表抓取数据流

```
Renderer                   Main Process
   │                            │
   │── school:openLoginWindow ►│── 独立 BrowserWindow 加载学校学生入口
   │                            │    （专用 session 分区 persist:school，
   │                            │     用户在窗口内扫码/账号登录，密码不经过应用）
   │                            │── 导航/跳转监听 → 候选域探测课表接口
   │                            │    （返回含 xkxx 即确认登录成功）
   │◄─ school:loginStatus ─────│    （登录成功后 Cookie 集 safeStorage 加密备份）
   │                            │
   │── school:fetchSchedule ──►│── fetchSchoolScheduleRaw()（Cookie 头 + UA/Referer）
   │                            │── importSchoolIndex() 解析（与导入器同管道）
   │                            │── checkDuplicatesAndConflicts() 检测
   │◄─ ImportResult ───────────│── 复用 import:confirm 预览/确认/写入
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

- 默认纯本地运行；唯一允许的联网行为是用户主动触发的学校官网课表抓取（仅 `*.neau.edu.cn` 官方域名）
- 不保存密码（登录在独立浏览器窗口内由用户完成，账号密码不经过应用代码）
- 会话 Cookie：专用 session 分区（Windows 上 Chromium DPAPI 加密落盘）+ safeStorage 加密备份（`{userData}/data/school-session.json`，可选"记住登录"）
- SQLite 是课表数据的唯一事实来源
- 手动修改标记 updated_manually
- 导入不静默覆盖
- 提醒设置与自定义提醒存储在 localStorage（纯本地）

## 数据存储位置

- 课表数据：SQLite `{userData}/data/schedule.db`
- 备份数据：`{userData}/data/backups/`（自动）或用户选择位置（手动）
- 所有数据都在用户本地数据目录，不在项目源码目录
