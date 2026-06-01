我要开发一个完全本地运行的东北农业大学个人课表管理桌面软件。本人不会软件开发，需要你作为 Claude Code 从零创建项目、设计架构、实现代码、运行测试、写日志，并且按 6 天压缩计划完成 MVP。

# 一、硬性环境要求

1. 所有项目文件必须放在：

D:\coding_relative\neau-local-schedule

2. 开始前必须先确认当前路径。如果路径不对，先切换到目标路径，不要在其他目录创建文件。

3. 我使用 Windows 系统。所有终端命令优先使用 PowerShell 语法，不要使用 Linux 专用命令。

4. 不要使用 rg。需要搜索文件时优先使用 PowerShell 命令，例如：

Get-ChildItem -Recurse
Select-String
Get-Content
Test-Path

5. 多条 PowerShell 命令需要连接时，使用单个 & 连接，不要使用 &&。

6. 每次检查错误、构建项目、运行测试、启动项目时，都必须给出真实返回结果。如果返回值是 None、空输出、被截断或看不出结果，必须重新执行更明确的命令确认。

7. 第一版只做电脑端 Windows 桌面软件。手机端以后再做。

8. 软件主程序必须纯本地运行：

   * 不联网
   * 不接云服务
   * 不接账号系统
   * 不接遥测/统计
   * 不使用在线 CDN
   * 不上传课表数据
   * 不保存学校账号、密码、cookie、token

9. 不允许绕过验证码、反爬、登录保护。

10. 不允许批量抓取他人数据。

11. 课表导入采用“主软件离线导入 + 独立导出器生成 JSON”的架构：

* 主软件只导入 JSON / HTML / 剪贴板 / Excel 或 CSV
* 主软件不负责登录学校系统
* 独立导出器可以后续一学期运行一次，由用户手动登录学校系统后导出 JSON

12. 无人值守开发时：

* 禁止修改项目目录外文件
* 禁止删除已有用户数据
* 禁止做计划外大重构
* 遇到不确定的架构问题，写进 dev log，不要擅自扩大范围
* 每完成一个阶段必须运行测试或写明无法测试的原因

13. 不要使用 any。TypeScript 类型必须显式设计。确实无法避免时，必须在注释中说明原因，并优先改成 unknown + 类型收窄。

14. 不要写“临时凑合”的代码。MVP 可以功能简单，但结构要清晰、可维护。

# 二、Claude Code 使用规则

1. 请创建并维护项目根目录下的 CLAUDE.md。

2. CLAUDE.md 是本项目的长期规则文件。每次重要架构规则、运行命令、测试方式、目录结构发生变化，都要同步更新。

3. 请创建 .claude/skills 目录，并把专项工作说明放到各自的 SKILL.md 中。

4. 如果需要使用 Claude Code 的权限，请遵守以下原则：

   * 不使用 bypassPermissions
   * 不使用 dangerously-skip-permissions
   * 不主动请求项目目录外写权限
   * 不主动请求联网权限
   * 不修改 C 盘、系统目录、用户私人目录
   * 只在 D:\coding_relative\neau-local-schedule 内创建和修改文件

5. 如果运行命令需要确认权限，而当前是无人值守模式，请不要绕过安全限制；把问题写进 docs/dev-log，并继续做不需要该权限的任务。

6. 每天结束前输出：

   * 完成了什么
   * 修改了哪些文件
   * 测试结果
   * 当前风险
   * 下一步建议

# 三、推荐技术栈

请使用以下技术栈，除非有明确理由不要改：

* Electron
* React
* TypeScript
* Vite
* SQLite
* CSS Grid
* cheerio，用于 HTML 解析
* xlsx，用于 Excel 导入
* electron-builder，用于打包
* vitest，用于测试

# 四、软件 MVP 功能

6 天内只完成以下 MVP，不做更多功能。

## 1. 学期管理

支持：

* 新建学期
* 编辑学期
* 删除学期
* 归档学期
* 查看历史学期
* 设置学期名称
* 设置学期开始日期
* 设置总周数

## 2. 节次时间管理

支持默认节次时间表。

每节课需要有：

* 第几节
* 开始时间
* 结束时间

## 3. 课程数据管理

每条课程安排需要支持：

* 课程名
* 教师
* 上课地点
* 星期几
* 开始节次
* 结束节次
* 开始周
* 结束周
* 单双周规则：all / odd / even
* 备注 note
* 是否手动修改 updated_manually
* 来源哈希 source_hash

## 4. 课表展示

需要实现两个视图：

### 周课表视图

要求：

* 表头显示年月日和星期几
* 左侧显示第几节、上下课时间
* 不同课程颜色不同
* 长课可以跨多个节次显示
* 今天高亮
* 当前周可切换
* 点击课程块可以编辑课程

### 列表视图

要求：

* 用表格列出所有课程安排
* 可以快速编辑课程名、教师、地点、星期、节次、周次、备注
* 可以删除课程安排

## 5. 导入功能

导入优先级如下：

### 第一优先级：JSON 导入

必须完成。

JSON 格式为统一格式，示例：

{
"version": 1,
"school": "东北农业大学",
"source": "neau-student-system",
"semester": {
"name": "2025-2026-2",
"startDate": "2026-03-02",
"weeksCount": 18
},
"sectionTimes": [
{
"section": 1,
"startTime": "08:00",
"endTime": "08:45"
},
{
"section": 2,
"startTime": "08:55",
"endTime": "09:40"
}
],
"courses": [
{
"courseName": "数据库原理与应用",
"teacher": "张老师",
"location": "成栋楼A101",
"weekday": 1,
"startSection": 1,
"endSection": 2,
"startWeek": 1,
"endWeek": 16,
"weekPattern": "all",
"note": "",
"rawText": "数据库原理与应用 张老师 成栋楼A101 1-16周 周一 1-2节"
}
]
}

校验规则：

* courseName 必须存在
* weekday 必须是 1-7
* startSection <= endSection
* startWeek <= endWeek
* weekPattern 只能是 all / odd / even
* 缺字段时给出清晰错误，不要崩溃

### 第二优先级：HTML 文件导入

完成基础版本即可。

要求：

* 支持导入保存下来的课表 HTML
* 如果真实东北农业大学 HTML 不可用，先用 mock fixture 实现解析器框架
* 解析失败时显示原始片段和错误原因

### 第三优先级：剪贴板导入

完成基础版本即可。

要求：

* 支持从剪贴板粘贴课表文本或 HTML
* 转成统一 CourseEvent 结构
* 失败时显示可读错误

### 第四优先级：Excel / CSV 导入

如果时间不足，只做简单导入和字段映射框架。

## 6. 导入预览

导入任何格式前，都需要进入预览页面。

预览页面需要显示：

* 将要导入的学期
* 将要导入的课程数量
* 每条课程的课程名、星期、节次、周次、地点、教师
* 错误项
* 重复项
* 是否会覆盖已有数据

导入确认后才写入 SQLite。

## 7. 重新导入保护

重新导入时：

* 不要重复创建同一节课
* 不要直接覆盖用户手动修改过的备注、地点、时间
* 如果需要覆盖，必须在 UI 中显示冲突，让用户确认
* 使用 source_hash 判断重复来源

## 8. 备份和恢复

需要支持：

* 导出 JSON 备份
* 从 JSON 备份恢复
* 删除学期前自动提示备份
* 原始导入文件快照保存到 data/raw-imports

# 五、数据库设计

使用 SQLite。

至少创建以下表：

## semesters

字段：

* id
* name
* start_date
* weeks_count
* is_archived
* created_at
* updated_at

## courses

字段：

* id
* semester_id
* name
* teacher
* color
* created_at
* updated_at

## course_events

字段：

* id
* course_id
* weekday
* start_section
* end_section
* start_week
* end_week
* week_pattern
* location
* note
* source_hash
* updated_manually
* created_at
* updated_at

## section_times

字段：

* id
* semester_id
* section_no
* start_time
* end_time

## import_batches

字段：

* id
* semester_id
* source_type
* imported_at
* raw_snapshot_path
* result_summary

# 六、项目目录结构

请按以下结构创建：

neau-local-schedule
├─ CLAUDE.md
├─ CLAUDE_6_DAY_PLAN.md
├─ package.json
├─ electron
│  ├─ main.ts
│  ├─ preload.ts
│  └─ ipc
├─ src
│  ├─ app
│  ├─ components
│  │  ├─ TimetableGrid.tsx
│  │  ├─ CourseEditor.tsx
│  │  ├─ ImportWizard.tsx
│  │  ├─ SemesterSwitcher.tsx
│  │  └─ CourseListView.tsx
│  ├─ db
│  │  ├─ schema.sql
│  │  ├─ migrations
│  │  └─ repositories
│  ├─ importers
│  │  ├─ jsonImporter.ts
│  │  ├─ htmlImporter.ts
│  │  ├─ clipboardImporter.ts
│  │  ├─ xlsxImporter.ts
│  │  └─ normalizer.ts
│  ├─ domain
│  │  ├─ Course.ts
│  │  ├─ Semester.ts
│  │  └─ SectionTime.ts
│  ├─ utils
│  └─ styles
├─ tools
│  └─ neau-timetable-exporter
│     ├─ README.md
│     └─ placeholder.md
├─ data
│  ├─ backups
│  └─ raw-imports
├─ docs
│  ├─ requirements.md
│  ├─ architecture.md
│  ├─ import-format.md
│  ├─ test-plan.md
│  └─ dev-log
├─ .claude
│  └─ skills
│     ├─ schedule-architecture
│     │  └─ SKILL.md
│     ├─ schedule-importer
│     │  └─ SKILL.md
│     ├─ timetable-ui
│     │  └─ SKILL.md
│     ├─ sqlite-data-layer
│     │  └─ SKILL.md
│     └─ local-app-qa
│        └─ SKILL.md
└─ tests
└─ fixtures

# 七、CLAUDE.md 内容要求

请创建 CLAUDE.md，内容必须包括以下规则：

1. 本项目是完全本地运行的东北农业大学个人课表管理软件。
2. 主软件不联网，不保存学校账号密码，不绕过验证码。
3. 所有数据保存在本地 SQLite。
4. 只允许在当前仓库内工作。
5. 禁止加入云同步、遥测、在线 CDN、账号系统。
6. 优先实现 MVP，不擅自扩展功能。
7. 导入器统一输出 CourseEvent 结构。
8. 手动修改过的数据重新导入时不得静默覆盖。
9. 每次完成任务必须运行测试或写明无法测试原因。
10. 每天必须写 docs/dev-log/YYYY-MM-DD.md。
11. 每天结束前输出完成内容、改动文件、测试结果、风险和下一步建议。
12. Windows 命令优先 PowerShell。
13. 不使用 rg。
14. 不使用 any，除非有明确理由并写注释说明。
15. 所有检查命令都必须有真实输出，不允许用 None 或空输出作为成功依据。

# 八、创建 5 个 Claude Code skills

请创建以下 skills：

## schedule-architecture

路径：

.claude/skills/schedule-architecture/SKILL.md

用途：设计或修改架构时使用。

要求：

* 保持主软件本地化
* 不引入服务器
* 不引入云服务
* Electron main process 负责文件、SQLite、导入、备份
* React renderer 负责 UI
* preload 暴露安全 IPC
* domain/importers/db 分层清晰
* 架构变更后更新 docs/architecture.md

## schedule-importer

路径：

.claude/skills/schedule-importer/SKILL.md

用途：实现 JSON、HTML、剪贴板、Excel/CSV 导入。

要求：

* 不保存学校凭证
* 不绕过验证码
* 优先支持手动导入
* 所有导入源统一 normalize
* 保存 raw import snapshot
* 加 tests/fixtures
* 解析失败返回清晰错误

## timetable-ui

路径：

.claude/skills/timetable-ui/SKILL.md

用途：实现课表 UI。

要求：

* 可读性优先
* 使用 CSS Grid
* 长课跨行显示
* 课程颜色稳定
* 空白格保持简洁
* 课程块显示课程名、地点、教师、周次、备注提示
* 提供列表视图方便编辑

## sqlite-data-layer

路径：

.claude/skills/sqlite-data-layer/SKILL.md

用途：实现数据库。

要求：

* SQLite 是唯一事实来源
* schema 变更需要 migration
* 不静默删除用户数据
* 手动修改需要标记 updated_manually
* 重新导入不得静默覆盖手动修改
* 破坏性操作前备份
* 支持 JSON 备份和恢复

## local-app-qa

路径：

.claude/skills/local-app-qa/SKILL.md

用途：验收功能。

要求检查：

* typecheck
* unit tests
* app 是否能启动
* 创建学期
* 导入 sample timetable
* 重启后数据是否保留
* 编辑课程后是否保留
* 是否不依赖联网
* 是否没有远程 API、遥测、在线 CDN
* 输出改动文件、风险、测试结果

# 九、6 天压缩开发计划

请创建 CLAUDE_6_DAY_PLAN.md，并按下面计划执行。

## Day 1：项目初始化 + 架构 + 数据库基础

目标：

1. 创建项目目录。
2. 初始化 Git。
3. 初始化 Electron + React + TypeScript + Vite。
4. 创建 CLAUDE.md。
5. 创建 5 个 skills。
6. 创建 docs 文档。
7. 创建 SQLite schema。
8. 实现基础数据库连接。
9. 实现 semesters、section_times 的基础 CRUD。
10. App 启动后显示 “NEAU Local Schedule”。

验收：

* npm install 成功
* npm run dev 能启动
* 能看到桌面窗口
* 能创建学期
* 重启后学期仍存在
* 写 docs/dev-log/day-1.md

## Day 2：课程数据层 + 基础 UI

目标：

1. 实现 courses、course_events CRUD。
2. 实现默认课程颜色分配。
3. 实现学期切换器。
4. 实现周课表视图 TimetableGrid。
5. 实现长课跨节次显示。
6. 实现课程列表视图 CourseListView。
7. 使用 mock 数据测试 UI。

验收：

* 能手动新增课程
* 能在周课表显示课程
* 长课能跨多个节次显示
* 不同课程颜色不同
* 列表视图能看到所有课程
* 写 docs/dev-log/day-2.md

## Day 3：课程编辑 + JSON 导入

目标：

1. 实现 CourseEditor。
2. 支持编辑课程名、教师、地点、星期、节次、周次、备注。
3. 实现 jsonImporter.ts。
4. 创建 docs/import-format.md。
5. 创建 tests/fixtures/sample-timetable.json。
6. 实现 JSON 导入校验。
7. 实现导入预览 UI。
8. 用户确认后写入 SQLite。

验收：

* 可以导入 sample-timetable.json
* 导入前能预览
* 缺字段会显示清晰错误
* 导入后课程能在周课表显示
* 编辑备注后重启仍保存
* 写 docs/dev-log/day-3.md

## Day 4：HTML / 剪贴板导入 + 去重

目标：

1. 实现 htmlImporter.ts 基础版本。
2. 实现 clipboardImporter.ts 基础版本。
3. 如果没有真实东北农业大学课表 HTML，创建 mock HTML fixture。
4. 实现 normalizer.ts。
5. 实现 source_hash。
6. 重复导入时不重复创建课程。
7. 手动修改过的数据不被静默覆盖。
8. 导入冲突在预览页显示。

验收：

* 可以导入 mock HTML
* 可以从剪贴板导入简单课表文本或 HTML
* 重复导入不会重复生成课程
* 手动改过地点/备注后，再导入不会静默覆盖
* 写 docs/dev-log/day-4.md

## Day 5：历史学期 + 备份恢复 + Excel/CSV 简版

目标：

1. 实现学期归档。
2. 实现历史学期查看。
3. 实现删除学期。
4. 删除前提示备份。
5. 实现 JSON 备份导出。
6. 实现 JSON 备份恢复。
7. 实现 Excel/CSV 简版导入。
8. 如果 Excel/CSV 时间不足，只做字段映射框架和示例。

验收：

* 可以查看历史学期
* 可以归档学期
* 可以删除学期
* 可以导出备份
* 可以从备份恢复
* Excel/CSV 至少有基础导入或明确的半成品说明
* 写 docs/dev-log/day-5.md

## Day 6：独立导出器框架 + 打包 + 总验收

目标：

1. 创建 tools/neau-timetable-exporter。
2. 只做导出器说明和框架，不做自动登录。
3. README 说明推荐流程：

   * 用户手动登录学校系统
   * 保存 HTML 或后续使用 Playwright 手动登录导出
   * 生成 timetable.json
   * 主软件导入 JSON
4. 配置 electron-builder。
5. 打包 Windows 可运行版本。
6. 全面测试。
7. 写使用说明。
8. 写最终总结。

验收：

* npm run build 成功
* 能生成 Windows 可运行包
* 双击能启动
* 主软件断网仍能使用
* 能创建学期
* 能导入 JSON
* 能编辑课程
* 能查看历史学期
* 能备份恢复
* 写 docs/dev-log/day-6.md
* 输出最终完成总结

# 十、不要做的事情

6 天内不要做：

1. 手机端。
2. 云同步。
3. 账号登录系统。
4. 自动登录东北农业大学学生系统。
5. 验证码绕过。
6. 高频爬虫。
7. AI 功能。
8. 复杂拖拽排课。
9. 复杂提醒系统。
10. 复杂考试系统。
11. 复杂 UI 动画。
12. 多用户系统。
13. 任何需要服务器的功能。
14. 不要迁移到 Tauri、JavaFX、Qt、Spring Boot、Django、Flask，除非当前 Electron 方案完全不可用并写明理由。

# 十一、无人值守执行规则

如果你在无人值守状态下运行：

1. 每次只执行当前 day plan 中未完成的任务。
2. 不要擅自跳到未来功能。
3. 如果依赖安装失败，先记录错误，不要乱改全局环境。
4. 如果测试失败，允许小范围修复。
5. 如果需要用户提供真实学校课表 HTML/JSON，写入 dev log，先用 mock fixture 完成框架。
6. 不要访问学校系统。
7. 不要保存任何敏感凭证。
8. 不要删除用户数据。
9. 最后必须输出：

   * 完成了什么
   * 修改了哪些文件
   * 测试结果
   * 当前风险
   * 下一步建议

# 十二、立即开始执行

请现在开始：

1. 确认当前目录。
2. 如果目录不存在，创建 D:\coding_relative\neau-local-schedule。
3. 初始化项目。
4. 创建 CLAUDE.md。
5. 创建 CLAUDE_6_DAY_PLAN.md。
6. 创建 docs 和 .claude/skills。
7. 开始 Day 1。
8. 完成后运行测试或启动验证。
9. 写 dev log。
10. 输出 Day 1 完成报告。