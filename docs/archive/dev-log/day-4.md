# Day 3.5 + Day 4 开发日志

日期：2026-06-01

## Part A: Day 3.5 验收补齐

### 验收结果

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 双击打开 CourseEditor | ✅ | TimetableGrid onDoubleClick → Modal |
| 修改备注后保存 | ✅ | 通过 Modal 编辑并保存 |
| 修改地点后保存 | ✅ | 通过 Modal 编辑并保存 |
| updated_manually 自动设置 | ✅ | courseEventRepo.ts:92 |
| sql.js 持久化 | ✅ | connection.ts execute() 后自动保存 |
| CourseListView 编辑入口 | ✅ | App.tsx handleEditEvent/handleEditCourse |

**结论**：Day 3 的双击编辑功能已完整实现，无需修改。

---

## Part B: Day 4 完成内容

### 1. 实现 htmlImporter.ts

创建 `src/importers/htmlImporter.ts`：
- 使用 cheerio 解析 HTML 表格
- 支持 `<br>` 分隔的课程信息
- 解析星期、节次、周次、单双周
- 返回标准 ImportResult 结构

### 2. 实现 clipboardImporter.ts

创建 `src/importers/clipboardImporter.ts`：
- 解析简单文本格式："课程名 教师 地点 星期 节次 周次 [单/双周]"
- 支持多种星期写法（周一/星期一/Monday）
- 支持单双周识别（单周/双周/单/双）

### 3. 完善 source_hash

更新 `src/importers/normalizer.ts`：
- source_hash 现在包含：semesterName, courseName, teacher, location, weekday, section, week, weekPattern
- note 不参与 hash（因为是用户手动编辑字段）

### 4. 完善去重逻辑

更新 `electron/ipc/importIpc.ts`：
- 导入时检查数据库中是否已有相同 source_hash
- 如果有且未手动修改：标记为 duplicate
- 如果有且手动修改过：标记为 conflict

### 5. 实现手动修改保护

- updated_manually = true 的记录不会被静默覆盖
- 冲突记录在 ImportPreview 中显示

### 6. ImportPreview 冲突处理 UI

更新 `src/components/ImportPreview.tsx`：
- 显示新增、重复、冲突、错误数量
- 冲突项显示本地数据 vs 导入数据
- 提供三种处理选项：
  - 保留本地（默认）
  - 覆盖为导入
  - 跳过

### 7. 测试

添加新测试文件：
- `tests/htmlImporter.test.ts` — 5 个测试
- `tests/clipboardImporter.test.ts` — 6 个测试

## 修改文件列表

```
src/importers/htmlImporter.ts                  (重写)
src/importers/clipboardImporter.ts             (重写)
src/importers/normalizer.ts                    (修改)
src/domain/ImportResult.ts                     (修改)
electron/ipc/importIpc.ts                      (重写)
src/components/ImportPreview.tsx                (重写)
src/app/App.tsx                                (修改)
src/styles/global.css                          (修改)
tests/htmlImporter.test.ts                     (新建)
tests/clipboardImporter.test.ts                (新建)
docs/dev-log/day-4.md                          (新建)
```

## 实际运行命令

```powershell
npm run typecheck
npm run test
```

## 命令输出摘要

### npm run typecheck
```
> tsc --noEmit
(无错误输出，成功)
```

### npm run test
```
✓ tests/jsonImporter.test.ts (7 tests) 3ms
✓ tests/clipboardImporter.test.ts (6 tests) 4ms
✓ tests/htmlImporter.test.ts (5 tests) 15ms

Test Files  3 passed (3)
     Tests  18 passed (18)
  Duration  1.30s
```

## 测试结果

- ✅ TypeScript 类型检查通过
- ✅ 18 个单元测试全部通过
- ✅ HTML 导入器测试通过
- ✅ 剪贴板导入器测试通过

## 功能验证

| 功能 | 状态 |
|------|------|
| 双击编辑持久化 | ✅ |
| updated_manually 正确设置 | ✅ |
| HTML 导入 | ✅ |
| 剪贴板导入 | ✅ |
| 去重 | ✅ |
| 手动修改保护 | ✅ |
| 冲突处理 UI | ✅ |

## 未完成内容

1. Excel/CSV 导入 — Day 5 实现
2. 备份恢复功能完善 — Day 5 实现
3. 真实学校 HTML 样本 — 需要用户提供

## 依赖兼容性修复

### 问题描述

启动应用时出现错误：
```
Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
```

### 根因分析

- `cheerio@1.2.0` 依赖 `undici@7.26.0`
- `undici` 的 `sqlite-cache-store.js` 引用了 `node:sqlite`
- `node:sqlite` 是 Node.js v22+ 的实验性模块，Electron v33 的 Node.js 不支持
- Rollup 打包时将 `node:sqlite` 包含进 `dist-electron/main.js`

### 解决方案

1. 降级 cheerio 从 `1.2.0` 到 `1.0.0-rc.12`（不依赖 undici）
2. **cheerio 必须精确固定为 `1.0.0-rc.12`**（不能使用 `^1.0.0-rc.12` 或 `~1.0.0-rc.12`）
3. 在 `vite.config.ts` 中配置 `rollupOptions.external` 排除 `node:*` 模块
4. 在 `CLAUDE.md` 中记录依赖兼容性注意事项

### 修改文件

- `package.json` — cheerio 版本降级
- `package-lock.json` — 重新生成
- `vite.config.ts` — 添加 external 配置
- `CLAUDE.md` — 添加 Dependency Compatibility Notes
- `.gitignore` — 添加 `.claude/settings.local.json`

## 当前风险

1. **HTML 解析器**：目前只支持简单表格结构，真实学校 HTML 可能需要调整
2. **剪贴板格式**：只支持特定格式，其他格式需要扩展
3. **cheerio 版本**：固定在 1.0.0-rc.12，不能升级

## Day 5 建议

1. 实现 Excel/CSV 导入
2. 完善备份恢复功能
3. 学期归档和删除
4. 历史学期查看
