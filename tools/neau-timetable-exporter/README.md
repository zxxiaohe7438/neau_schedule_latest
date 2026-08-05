# NEAU Timetable Exporter

东北农业大学课表导出器 — 将保存的教务系统课表 HTML 转换为主软件可导入的 JSON 格式。

## 重要说明

- **主软件纯本地运行**，不联网、不保存账号密码
- **导出器是独立工具**，只处理用户手动保存的 HTML 文件
- **不保存任何账号、密码、cookie、token**
- **不绕过验证码**
- **不批量抓取他人数据**

## 使用方法

1. 在浏览器中登录东北农业大学教务系统
2. 进入个人课表页面
3. 按 `Ctrl+S` 保存页面为 HTML 文件
4. 运行导出器：

```powershell
npm run exporter:from-html -- --input <html文件路径> --output output/timetable.json
```

示例：

```powershell
npm run exporter:from-html -- --input tools/neau-timetable-exporter/fixtures/sample-neau-page.html --output tools/neau-timetable-exporter/output/timetable.json
```

## 输出格式

导出器生成符合主软件导入格式的 JSON 文件：

```json
{
  "version": 1,
  "school": "东北农业大学",
  "source": "neau-student-system",
  "semester": {
    "name": "2025-2026-2",
    "startDate": "2026-03-02",
    "weeksCount": 18
  },
  "sectionTimes": [...],
  "courses": [...]
}
```

## 导入到主软件

1. 打开主软件 NEAU Local Schedule
2. 点击「导入 JSON」按钮
3. 选择生成的 `timetable.json` 文件
4. 预览并确认导入

## 目录结构

```
tools/neau-timetable-exporter/
├─ README.md              — 本文件
├─ cli.ts                 — CLI 入口
├─ src/
│  ├─ types.ts            — 类型定义
│  ├─ extractFromHtml.ts  — HTML 解析
│  └─ normalizeToTimetableJson.ts — 格式转换
├─ fixtures/
│  └─ sample-neau-page.html — 示例 HTML
├─ output/
│  └─ .gitkeep            — 输出目录（已 gitignore）
└─ snapshots/
   └─ .gitkeep            — 快照目录（已 gitignore）
```

## 真实系统适配

当前解析器基于 mock HTML fixture 实现。如果真实东北农业大学课表页面解析失败，请提供：

1. 保存的 HTML 文件（脱敏后）

**不要提供**：
- 账号密码
- Cookie / Token
- 包含个人信息的原始数据

## 测试

导出器测试包含在整体测试中：

```powershell
npm run test
```

## 注意事项

- 导出器不会自动登录学校系统
- 不保存任何敏感信息
- output 和 snapshots 目录中的文件不会被 git 跟踪
- 如果解析失败，请提供脱敏后的样本以便改进
