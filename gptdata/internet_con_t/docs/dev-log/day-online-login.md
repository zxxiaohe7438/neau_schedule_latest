# Day: 学校账号登录验证 + callback JSON 课表获取

日期：2026-06-02

## 完成内容

### 1. 凭据保存模块 (`src/security/credentialStore.ts`)

- 使用 Electron `safeStorage` API 加密密码后写入 `{userData}/data/.credentials.json`
- 当 `safeStorage` 不可用时（如 Linux 无密钥环），自动降级为 session-only 内存存储
- 暴露接口：`saveCredential`, `getCredential`, `clearCredential`, `hasCredential`
- 密码绝不明文落盘，绝不写入 console.log，绝不保存到 sql.js 数据库

### 2. 登录验证服务 (`electron/services/schoolAuthService.ts`)

- Mock 模式：验证 `test_student / test_pass_123`
- 模拟 800ms 网络延迟
- 登录成功后自动保存凭据到 credentialStore
- 提供 `login`, `logout`, `isLoggedIn`, `getSavedUsername`, `fetchCallbackData` 接口
- `fetchCallbackData` 返回 mock callback JSON 数据

### 3. Auth IPC handlers (`electron/ipc/authIpc.ts`)

- `auth:login` — 登录
- `auth:logout` — 登出
- `auth:status` — 检查登录状态
- `auth:fetchSchedule` — 获取课表并解析为 ImportResult

### 4. Preload API 更新 (`electron/preload.ts`)

- 新增 `window.api.auth` 命名空间
- 包含 `login`, `logout`, `status`, `fetchSchedule` 方法

### 5. LoginPanel 组件更新 (`src/components/LoginPanel.tsx`)

- 改为使用 IPC auth API（不再使用 localStorage）
- 新增密码输入、登录状态提示、加密存储说明
- 支持自动检查已保存的登录状态

### 6. App.tsx 更新

- 移除 localStorage 登录状态管理
- 改为使用 `window.api.auth.status()` 检查登录状态
- 登录后自动刷新学期列表

### 7. Mock callback JSON fixtures (`tests/fixtures/mock-callback-response.json`)

- 包含 5 门有时间安排的课程 + 1 门无时间安排的课程
- 覆盖 all/odd/even 三种 weekPattern
- 包含 1-16 周和 1-18 周两种周次范围

### 8. 测试

- `tests/mockCallbackImporter.test.ts` — 11 个测试用例验证 mock callback 解析
- `tests/schoolAuthService.test.ts` — 6 个测试用例验证 mock 凭据逻辑

## 文件清单

| 文件 | 操作 |
|------|------|
| `src/security/credentialStore.ts` | 新增 |
| `electron/services/schoolAuthService.ts` | 新增 |
| `electron/ipc/authIpc.ts` | 新增 |
| `electron/preload.ts` | 修改（新增 auth API） |
| `electron/main.ts` | 修改（注册 authIpc） |
| `src/components/LoginPanel.tsx` | 修改（使用 IPC auth） |
| `src/app/App.tsx` | 修改（移除 localStorage，使用 IPC auth） |
| `tests/fixtures/mock-callback-response.json` | 新增 |
| `tests/mockCallbackImporter.test.ts` | 新增 |
| `tests/schoolAuthService.test.ts` | 新增 |
| `.gitignore` | 修改（添加 .credentials.json） |

## 测试结果

- TypeScript 类型检查：待运行 `npm run typecheck`
- 单元测试：待运行 `npm test`
- 开发模式：待运行 `npm run dev`

## 真实学校系统测试步骤

当需要连接真实学校系统时：

1. 将 `schoolAuthService.ts` 中的 mock 逻辑替换为真实 CAS 登录请求
2. 实现 CAPTCHA 处理（打开外部浏览器让用户手动完成）
3. 使用 session cookie 调用 `ajaxStudentSchedule/callback` API
4. 将返回的 JSON 传入 `importSchoolIndex()` 解析
5. 通过 ImportPreview 展示并确认导入

### 真实 NEAU CAS 登录流程（参考）

```
POST https://cas.neau.edu.cn/cas/login
  - username: 学号
  - password: 密码（需要 RSA 加密）
  - captcha: 验证码（需要浏览器交互）

GET http://jwxt.neau.edu.cn/student/courseSelectSchedule/callback
  - Cookie: JSESSIONID (from CAS)
  - Response: JSON (xkxx, jcsjbs, etc.)
```

## 风险

- safeStorage 在某些 Linux 环境下不可用（已实现 fallback）
- Mock 模式下无法测试真实网络错误处理
- 真实 CAS 登录需要处理 RSA 加密和 CAPTCHA

## 下一步

1. 运行 typecheck 和测试验证
2. 运行 dev 模式确认 UI 正常
3. 接入真实学校系统（需要用户手动测试）
4. 考虑添加"获取课表"按钮（登录后一键获取）
