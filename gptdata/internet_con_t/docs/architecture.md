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
│  │  - Auth      │    │                    │  │
│  │  - SafeStore │    │                    │  │
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
- **security/** — 凭据加密存储（仅 main process，使用 Electron safeStorage）
- **electron/** — Electron 主进程、IPC handlers、services
- **components/** — React UI 组件（仅 renderer）
- **app/** — React 入口和路由

## 数据流

### 常规数据流

1. React 组件调用 `window.api.*`（通过 contextBridge）
2. preload.ts 通过 ipcRenderer 发送 IPC 消息
3. main.ts 中的 ipcMain handler 调用 repository
4. Repository 操作 SQLite 并返回结果
5. 结果通过 IPC 返回给 React 组件

### 登录 + 课表获取数据流

```
Renderer                 Main Process              School System
   │                          │                         │
   │── auth:login ──────────►│                         │
   │                          │── validate (mock) ──►   │
   │                          │◄─ result ─────────────  │
   │                          │── saveCredential()      │
   │◄─ { success, username }─│                         │
   │                          │                         │
   │── auth:fetchSchedule ──►│                         │
   │                          │── fetchCallbackData() ─►│
   │                          │◄─ callback JSON ───────│
   │                          │── importSchoolIndex()   │
   │◄─ ImportResult ─────────│                         │
   │                          │                         │
   │── import:confirm ──────►│                         │
   │                          │── write to SQLite       │
   │◄─ done ─────────────────│                         │
```

### 凭据存储流程

```
saveCredential(username, password)
  ├─ safeStorage.isEncryptionAvailable()?
  │   ├─ YES: safeStorage.encryptString(password)
  │   │       → write to {userData}/data/.credentials.json
  │   └─ NO:  store in session memory only
  │           → return warning "仅本次会话保存"
  └─ return { ok, warning? }
```

## 约束

- 主软件不联网（mock 模式下）
- 密码不保存到 sql.js 业务数据库
- 密码使用 Electron safeStorage 加密存储
- SQLite 是课表数据的唯一事实来源
- 手动修改标记 updated_manually
- 导入不静默覆盖
- 凭据文件 (.credentials.json) 不在 Git 中

## 安全设计

### 凭据安全

1. 密码通过 Electron safeStorage 加密后写入磁盘
2. safeStorage 使用操作系统级加密（Windows: DPAPI, macOS: Keychain, Linux: libsecret）
3. 如果系统不支持，降级为 session-only 内存存储
4. 凭据文件路径：`{userData}/data/.credentials.json`（不在项目源码目录中）
5. .gitignore 中已排除 `.credentials.json`
6. console.log 中绝不输出密码

### 数据隔离

- 课表数据：SQLite `{userData}/data/schedule.db`
- 凭据数据：`{userData}/data/.credentials.json`（加密）
- 备份数据：`{userData}/data/backups/`
- 所有数据目录在用户本地数据目录，不在项目源码目录
