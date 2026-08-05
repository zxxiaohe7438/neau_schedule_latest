# Day 1 开发日志

日期：2026-06-01

## 完成内容

### 1. 项目初始化
- 创建项目目录结构
- 创建 package.json（Electron + React + TypeScript + Vite + SQLite + vitest）
- 创建 tsconfig.json / tsconfig.node.json
- 创建 vite.config.ts（含 vite-plugin-electron）
- 创建 index.html 入口
- 创建 .gitignore

### 2. CLAUDE.md
- 创建项目规则文件，包含所有 15 条核心规则

### 3. 领域类型定义
- `src/domain/Semester.ts` — 学期类型
- `src/domain/SectionTime.ts` — 节次时间类型 + NEAU 默认时间表（11 节）
- `src/domain/Course.ts` — 课程类型 + 预定义颜色
- `src/domain/CourseEvent.ts` — 课程安排类型
- `src/domain/ImportResult.ts` — 导入结果类型
- `src/domain/BackupData.ts` — 备份数据类型

### 4. SQLite 数据库层
- `src/db/schema.sql` — 5 张表：semesters, section_times, courses, course_events, import_batches
- `src/db/connection.ts` — 数据库连接管理（WAL 模式，foreign keys）
- `src/db/repositories/semesterRepo.ts` — 学期 CRUD
- `src/db/repositories/sectionTimeRepo.ts` — 节次时间 CRUD（含 upsertBatch）
- `src/db/repositories/courseRepo.ts` — 课程 CRUD
- `src/db/repositories/courseEventRepo.ts` — 课程安排 CRUD（含 source_hash 查询）

### 5. Electron 主进程
- `electron/main.ts` — 窗口创建、数据库初始化、IPC 注册
- `electron/preload.ts` — contextBridge 暴露完整 API
- `electron/ipc/semesterIpc.ts` — 学期 IPC handlers
- `electron/ipc/sectionTimeIpc.ts` — 节次时间 IPC handlers
- `electron/ipc/courseIpc.ts` — 课程 IPC handlers（含自动颜色分配）
- `electron/ipc/courseEventIpc.ts` — 课程安排 IPC handlers
- `electron/ipc/importIpc.ts` — 导入 IPC handlers（桩）
- `electron/ipc/backupIpc.ts` — 备份 IPC handlers（完整实现）

### 6. React UI（Day 1 范围）
- `src/app/main.tsx` — React 入口
- `src/app/App.tsx` — 主应用（学期切换、视图路由）
- `src/components/SemesterManager.tsx` — 学期管理组件（新建、归档、删除）
- `src/styles/global.css` — 全局样式
- `src/electron.d.ts` — Window API 类型声明

### 7. 导入器
- `src/importers/normalizer.ts` — JSON 导入规范化和校验（完整实现）
- `src/importers/jsonImporter.ts` — JSON 导入入口
- `src/importers/htmlImporter.ts` — HTML 导入桩
- `src/importers/clipboardImporter.ts` — 剪贴板导入桩
- `src/importers/xlsxImporter.ts` — Excel 导入桩

### 8. 测试
- `tests/jsonImporter.test.ts` — JSON 导入器单元测试（7 个测试用例）
- `tests/fixtures/sample-timetable.json` — 示例课表 JSON
- `tests/fixtures/sample-timetable.html` — 示例课表 HTML

### 9. 文档
- `docs/architecture.md` — 架构设计文档
- `docs/import-format.md` — 导入格式说明
- `docs/requirements.md` — 需求说明
- `docs/test-plan.md` — 测试计划
- `tools/neau-timetable-exporter/README.md` — 导出器说明

## 受限项

### npm install 未执行
沙箱环境阻止了 npm 命令。需要用户手动执行：
```powershell
cd D:\coding_relative\neau-local-schedule
npm install
```

### .claude/skills 未创建
.claude 目录有写保护限制。需要用户手动创建以下 5 个 skill 文件：
- `.claude/skills/schedule-architecture/SKILL.md`
- `.claude/skills/schedule-importer/SKILL.md`
- `.claude/skills/timetable-ui/SKILL.md`
- `.claude/skills/sqlite-data-layer/SKILL.md`
- `.claude/skills/local-app-qa/SKILL.md`

## 测试结果

- 单元测试文件已创建（tests/jsonImporter.test.ts）
- 由于 npm install 未执行，无法运行测试
- 用户安装依赖后可执行 `npm run test`

## 当前风险

1. npm install 需要用户手动执行
2. .claude/skills 需要用户手动创建
3. Electron 应用未经实际启动验证

## 下一步建议

1. 用户执行 `npm install` 安装依赖
2. 执行 `npm run test` 验证单元测试
3. 执行 `npm run dev` 验证应用启动
4. 进入 Day 2：课程数据层 + 基础 UI（TimetableGrid、CourseListView）
