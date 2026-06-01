# 导入格式说明

## JSON 格式（第一优先级）

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
  "sectionTimes": [
    {
      "section": 1,
      "startTime": "08:00",
      "endTime": "08:45"
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
```

## 校验规则

- `courseName` 必须存在
- `weekday` 必须是 1-7
- `startSection` <= `endSection`
- `startWeek` <= `endWeek`
- `weekPattern` 只能是 all / odd / even

## HTML 格式（第二优先级）

支持导入保存下来的课表 HTML 文件。如果真实 HTML 不可用，先用 mock fixture 实现解析器框架。

## 剪贴板格式（第三优先级）

支持从剪贴板粘贴课表文本或 HTML。

## Excel/CSV 格式（第四优先级）

如果时间不足，只做简单导入和字段映射框架。
