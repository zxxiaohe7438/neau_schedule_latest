# NEAU Local Schedule - 当前状态

更新日期：2026-08-03

## 项目概述

东北农业大学个人日程安排管理桌面软件。**默认纯本地运行**：课表数据通过 JSON 文件导入（智能粘贴支持文本识别）；唯一允许的联网行为是**用户主动触发**的学校官网课表抓取（"官网获取"按钮）——仅连接 `*.neau.edu.cn` 官方域名、仅调用课表数据接口，登录在独立浏览器窗口内由用户完成（密码不经过应用代码），不保存密码，不接入任何第三方服务。

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
| 2026-08-03 重构 | ✅ 完成 | 全项目结构优化：死代码清理、重复收敛、App.tsx 拆 hooks、文档归档 |
| 2026-08-03 官网获取 | ✅ 完成（离线部分） | 内嵌登录窗口 + 会话接管 + 课表抓取 + 解析 + 复用导入管道；导入管道缺陷修复（keep_local 重复创建、同格重叠检测） |
| 2026-08-03 UI 优化 | ✅ 完成 | ui-ux-pro-max skill 驱动：设计令牌补齐（间距/字号/z-index/焦点环/语义浅色）、定义缺失的 `.btn-secondary`、对话框三套统一为 Modal 标准、暗色模式硬编码色修复、emoji→内联 SVG 图标（零依赖）、tooltip 淡入 + reduced-motion 支持 |
| 2026-08-03 UI 视觉升级 | ✅ 完成 | GLM 视觉审计定位（亮/暗均 5/10：无 Elevation 分层、控件无层级、网格线过浅、排印混乱）→ P0+P1：暗色 bg/surface/border 重新分层、新增 `--color-border-strong` 网格线令牌、`.btn-ghost` 统一 header 按钮、标题去渐变、字号层级统一、间距节奏、课程格微投影 |

> **开学后实机联调清单**（本环境无法访问学校域名，代码已离线验证）：
> 1. `npm run dev` → "官网获取" → 登录窗口弹出、扫码/账号登录正常
> 2. 登录成功后自动检测（探测课表接口）→ 点击"获取课表"成功
> 3. 若接口 JSON 结构与解析器不一致：抓取一份响应（登录窗口 DevTools Network 或对话框报错信息）校准 `schoolIndexImporter.ts` 字段即可，架构无需改动
> 4. **WebVPN 校外接入**（2026-08-03 已实现，待实测）：
>    - WebVPN 为深信服格式（登录页 302 到 `authserver-443.webvpn.neau.edu.cn`，内网系统映射为 `{内网主机}-{端口}.webvpn.neau.edu.cn`），映射域属 `*.neau.edu.cn` 白名单，课表接口相对路径自动兼容
>    - 对话框选"WebVPN 入口（校外）"→ 窗口内登录 WebVPN → 门户中点击"教务处-学生系统"→ 自动检测/抓取
>    - 登录窗口与抓取请求统一使用 **Edge 风格 UA**（学校 WebVPN 对 Chromium 内核 UA 敏感：Edge 可登录、Chrome 风格可能被拒）
>    - 需实测确认：教务系统映射域名实际格式（zhjwxs-443 还是 zhjwjs-443 等）、Edge UA 能否通过 WebVPN 登录
> 5. 会话过期场景：清除登录 → 重新登录

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
- 任何联网相关依赖（axios、playwright 等）——官网抓取使用 Electron 内置 net/session，不新增网络依赖

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

- JSON 导入（完整实现，前端唯一导入入口）
- 智能粘贴（考试时间等文本自动识别）
- **官网获取**（2026-08-03 新增）：登录窗口扫码/账号登录 → 自动检测 → 抓取课表 → 学期信息确认 → 导入预览
- 导入预览
- 去重检测（source_hash）
- 冲突处理（保留本地/覆盖/跳过；skip 与 keep_local 均正确保留本地，仅 overwrite 更新既有事件）
- 同格重叠检测（调课/换地点后哈希变化但格子相同 → 提示冲突由用户裁决）
- HTML / 剪贴板 / XLSX 导入器源码保留（有测试覆盖），但无 UI 入口、未暴露 IPC 通道

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

### 学校官网课表获取（2026-08-03 新增）

- 内嵌登录窗口（独立 BrowserWindow）：扫码/账号/微信登录均可，密码不经过应用代码
- 专用 session 分区（persist:school）+ safeStorage 加密会话备份（可选"记住登录"）
- 登录自动检测：窗口导航监听 → 候选域探测课表接口（返回含 xkxx 即确认）
- 只连接 `*.neau.edu.cn` 官方域名，域名白名单校验
- 课表接口：`/student/courseSelect/thisSemesterCurriculum/ajaxStudentSchedule/callback`（真实接口，来自历史抓取页面）
- **WebVPN 校外接入**：深信服 WebVPN（`{内网主机}-{端口}.webvpn.neau.edu.cn` 映射格式）——"WebVPN 入口"按钮、登录窗口与抓取统一 Edge 风格 UA、认证映射域（authserver-443 等）排除出候选域
- 开发模式"模拟数据"按钮：离线演示完整流程（学校系统不可达时）
- 校外 WebVPN：候选域自适应（映射域属白名单，相对路径接口自动兼容），待实机验证

### 备份恢复

- JSON 备份导出（手动选择位置）
- JSON 备份恢复（恢复前自动备份）

### 数据保护

- 手动修改标记 updated_manually
- 重新导入不静默覆盖手动修改
- source_hash 去重

## 测试状态

- TypeScript 类型检查：✅ 通过
- 单元测试：✅ 全部通过（8 个测试文件，71 个用例）
  - 剪贴板导入器：6 个
  - 导出器（tools/neau-timetable-exporter）：16 个
  - HTML 导入器：5 个
  - JSON 规范化：7 个
  - CSV/Excel 导入器：5 个
  - 学校课表解析器（schoolIndexImporter）：14 个
  - 学校会话文件（schoolSessionFile）：8 个
  - 学校抓取服务（schoolFetchService）：10 个

## 文件结构

```
src/
  app/App.tsx              — 主应用组件（视图组装）
  hooks/
    useScheduleData.ts     — 学期/课程/事件/备注数据加载与变更
    useImportFlow.ts       — 导入状态机（JSON/智能粘贴/预览/确认）
    useCourseEditing.ts    — 课程/事件编辑状态管理
    useSchoolFetch.ts      — 官网抓取状态机（登录轮询/抓取/学期确认）
    useReminderScheduler.ts — 提醒调度
    useMouseDownOutside.ts — 遮罩点击关闭模式
  components/
    TimetableGrid.tsx      — 周课表视图
    CourseListView.tsx     — 课程列表视图
    CourseEditor.tsx       — 课程编辑器
    SemesterManager.tsx    — 学期管理（含备份/恢复）
    SemesterSwitcher.tsx   — 学期切换器
    ImportPreview.tsx      — 导入预览
    CellNoteEditor.tsx     — 格子备注编辑器
    SmartPasteDialog.tsx   — 智能粘贴对话框
    SchoolFetchDialog.tsx  — 官网获取对话框（登录引导/抓取/学期确认）
    ReminderForm.tsx       — 提醒设置表单（CellNoteEditor/CustomReminderDialog 共用）
    ReminderSettings.tsx   — 提醒设置面板
    CustomReminderDialog.tsx — 自定义提醒对话框
    ReminderToast.tsx      — 提醒 Toast 组件
    Modal.tsx              — 弹窗组件
  config/
    schoolConstants.ts     — 学校域名白名单/接口路径/UA 常量
  db/
    connection.ts          — sql.js 连接管理
    schema.sql             — 数据库 schema
    seed.ts                — 开发模式种子数据
    updateHelper.ts        — 动态字段 UPDATE 拼接工具
    repositories/          — 各实体数据访问
  importers/
    common.ts              — 导入器公共工具（节次/周次解析、buildImportItem）
    jsonImporter.ts        — JSON 导入
    htmlImporter.ts        — HTML 导入（无 IPC 暴露，源码保留）
    clipboardImporter.ts   — 剪贴板导入（无 IPC 暴露，源码保留）
    xlsxImporter.ts        — CSV/Excel 导入（无 IPC 暴露，源码保留）
    textRecognizer.ts      — 智能文本识别
    normalizer.ts          — 数据规范化
    schoolIndexImporter.ts — 学校课表接口 JSON 解析（官网抓取）
  domain/                  — 类型定义（含 School.ts）
  utils/                   — 工具函数（含 weekday 共享映射）
  styles/                  — global.css / reminder.css
electron/
  main.ts                  — Electron 主进程
  preload.ts               — 预加载脚本（window.api 定义）
  ipc/                     — 各模块 IPC handlers（含 semesterHelper 共享逻辑）
  services/
    schoolSessionService.ts — 登录窗口/会话 Cookie 接管/加密备份
    schoolFetchService.ts   — 课表接口抓取（可注入 fetch）
    schoolSessionFile.ts    — 会话备份文件纯逻辑（可单测）
```

## 下一步

1. 用户运行 `npm run dev` 冒烟验证 UI（本环境无法人工验收 GUI）
2. **开学后实机联调**：登录 → 抓取 → 解析校准（见顶部联调清单）
3. 真实数据导入测试（JSON / 智能粘贴）
4. 提醒功能验证（设置提醒 → 到点触发 Toast/系统通知）
5. 备份导出/恢复验证
6. `npm run build` 打包验收
