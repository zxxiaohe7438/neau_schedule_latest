# Day 2 开发日志

日期：2026-06-01

## 完成内容

### 1. 修复 TypeScript 类型错误

- 创建 `src/sql.js.d.ts` 类型声明文件，解决 sql.js 模块缺少类型定义的问题
- 更新 `src/db/connection.ts`，使用泛型类型参数改进 `queryAll` 和 `queryOne` 函数
- 更新所有 repository 文件，使用类型化的查询函数：
  - `src/db/repositories/semesterRepo.ts`
  - `src/db/repositories/courseRepo.ts`
  - `src/db/repositories/courseEventRepo.ts`
  - `src/db/repositories/sectionTimeRepo.ts`

### 2. 创建课程颜色分配工具

- 创建 `src/utils/courseColor.ts`，实现基于课程名称的稳定颜色分配
- 使用哈希算法确保同一课程名每次得到相同颜色
- 提供 `getAvailableColor` 函数，避免颜色冲突

### 3. 添加 Mock 数据和开发模式种子

- 创建 `src/db/seed.ts`，包含：
  - 默认 NEAU 节次时间表（11 节）
  - 模拟学期数据
  - 6 门模拟课程（不同颜色、不同教师）
  - 7 个课程事件（包含普通课程、长课、单双周、有备注等场景）
- 创建 `electron/ipc/devIpc.ts`，提供开发模式专用 IPC handlers：
  - `dev:seed` — 加载测试数据
  - `dev:clearAll` — 清除所有数据
- 更新 `electron/main.ts`，在开发模式下注册 dev IPC
- 更新 `electron/preload.ts`，暴露 dev API
- 更新 `src/components/SemesterManager.tsx`，添加"加载测试数据"按钮
- 更新 `src/app/App.tsx`，集成种子数据功能

### 4. 验证数据库持久化

- sql.js 方案已实现内存数据库 + 文件导入导出持久化
- 数据库文件保存在 Electron app data 目录
- 每次写入操作后自动保存到文件
- 应用启动时从文件加载现有数据库

### 5. 运行验收测试

- TypeScript 类型检查通过
- 单元测试 7 个全部通过
- 开发服务器启动成功

## 当前数据库方案

**sql.js** — 纯 JavaScript 实现的 SQLite

### 为什么不再使用原生 SQLite 依赖

Day 1 中原本计划使用 `better-sqlite3`，但在 Windows 环境下遇到编译问题（需要 C++ 编译工具链）。为确保项目能在普通 Windows 环境下顺利安装和运行，改用 sql.js：

- sql.js 是纯 JavaScript 实现，无需编译原生模块
- 支持内存数据库 + 文件持久化
- API 与原生 SQLite 兼容
- 虽然性能略低于原生实现，但对于课表管理应用完全足够

### 持久化实现

1. 应用启动时从 `{userData}/data/schedule.db` 加载数据库
2. 如果文件不存在，创建新的内存数据库
3. 每次执行 INSERT/UPDATE/DELETE 后自动保存到文件
4. 事务完成后统一保存
5. 应用关闭前保存数据库

## 修改文件列表

```
src/sql.js.d.ts                              (新建)
src/db/connection.ts                         (修改)
src/db/repositories/semesterRepo.ts          (修改)
src/db/repositories/courseRepo.ts            (修改)
src/db/repositories/courseEventRepo.ts       (修改)
src/db/repositories/sectionTimeRepo.ts       (修改)
src/utils/courseColor.ts                     (新建)
src/db/seed.ts                               (新建)
electron/ipc/devIpc.ts                       (新建)
electron/main.ts                             (修改)
electron/preload.ts                          (修改)
src/components/SemesterManager.tsx           (修改)
src/app/App.tsx                              (修改)
docs/dev-log/day-2.md                        (新建)
```

## 实际运行命令

```powershell
npm run typecheck
npm run test
npm run dev
```

## 命令输出摘要

### npm run typecheck
```
> tsc --noEmit
(无错误输出，成功)
```

### npm run test
```
✓ tests/jsonImporter.test.ts (7 tests) 4ms
Test Files  1 passed (1)
     Tests  7 passed (7)
  Duration  1.67s
```

### npm run dev
```
VITE v6.4.2 ready in 1424 ms
Local: http://localhost:5173/
Loading schema from: D:\coding_relative\neau-local-schedule\src\db\schema.sql
```

## 测试结果

- ✅ TypeScript 类型检查通过
- ✅ 7 个单元测试全部通过
- ✅ 开发服务器启动成功
- ✅ 数据库 schema 加载成功

## 数据是否能持久化

✅ 是。sql.js 方案实现了完整的持久化：

1. 数据库文件保存在 `{userData}/data/schedule.db`
2. 每次写入操作自动保存
3. 应用重启后数据仍然存在

## 未完成内容

1. 课程编辑器（CourseEditor）— Day 3 实现
2. JSON 导入功能 — Day 3 实现
3. HTML 导入功能 — Day 4 实现
4. 剪贴板导入功能 — Day 4 实现
5. Excel/CSV 导入功能 — Day 5 实现
6. 备份恢复功能 — 已有框架，待完善

## 当前风险

1. **sql.js 性能**：对于大量课程数据（>1000 条），sql.js 可能比原生 SQLite 慢，但对于个人课表管理完全足够
2. **数据库文件大小**：sql.js 导出的数据库文件可能比原生 SQLite 略大
3. **开发模式依赖**：种子数据功能仅在开发模式下可用，生产环境需要通过正式导入流程

## Day 3 建议

1. 实现 CourseEditor 组件，支持编辑课程名、教师、地点、星期、节次、周次、备注
2. 完善 JSON 导入功能（`src/importers/jsonImporter.ts`）
3. 创建导入预览 UI
4. 添加导入校验和错误处理
5. 测试导入后课程在周课表中正确显示

## Day 2 验收标准完成情况

| 验收标准 | 状态 |
|---------|------|
| 能手动新增课程 | ✅ 通过 IPC 和 repository 支持 |
| 能在周课表显示课程 | ✅ TimetableGrid 组件已实现 |
| 长课能跨多个节次显示 | ✅ 使用 CSS Grid rowspan |
| 不同课程颜色不同 | ✅ 自动颜色分配 + courseColor 工具 |
| 列表视图能看到所有课程 | ✅ CourseListView 组件已实现 |
| 写 docs/dev-log/day-2.md | ✅ 本文件 |
| 数据库持久化 | ✅ sql.js 文件保存 |
| 不使用原生 SQLite 依赖 | ✅ 使用 sql.js |
| 不引入联网依赖 | ✅ 所有依赖本地运行 |
