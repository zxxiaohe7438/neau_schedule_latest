# NEAU Timetable Exporter

东北农业大学课表导出器 — 将教务系统课表转换为主软件可导入的 JSON 格式。

## 重要说明

- **主软件纯本地运行**，不联网、不保存账号密码
- **导出器是独立工具**，需要用户手动登录学校系统
- **不保存任何账号、密码、cookie、token**
- **不绕过验证码**
- **不批量抓取他人数据**

## 使用方法

### 方法一：从保存的 HTML 文件导出

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

### 方法二：使用 Playwright 浏览器导出（需要安装）

> ⚠️ 需要先安装 Playwright：`npm install playwright`

```powershell
npm run exporter:browser
```

流程：
1. 导出器打开浏览器
2. 用户手动登录教务系统
3. 用户手动进入课表页面
4. 在终端按 Enter 确认
5. 导出器自动提取课表并生成 JSON

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
│  ├─ extractFromNetwork.ts — 网络响应解析（占位）
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
2. 或接口响应 JSON（脱敏后）

**不要提供**：
- 账号密码
- Cookie / Token
- 包含个人信息的原始数据

## 测试

```powershell
npm run exporter:test
```

## 注意事项

- 导出器不会自动登录学校系统
- 不保存任何敏感信息
- output 和 snapshots 目录中的文件不会被 git 跟踪
- 如果解析失败，请提供脱敏后的样本以便改进
