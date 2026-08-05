# Day: Browser-Act 官网登录集成

日期：2026-06-03

## 完成内容

### 新增文件

1. `src/config/schoolSystemConfig.ts` — 学校系统配置（URL、字段候选、关键字）
2. `src/importers/schoolCallbackImporter.ts` — 通用 callback JSON 解析器
3. `electron/services/browserActSchoolService.ts` — browser-act 适配层
4. `electron/ipc/schoolOnlineIpc.ts` — 在线获取 IPC handlers
5. `tests/fixtures/sample-school-callback-success.json` — 成功 callback 测试数据
6. `tests/fixtures/sample-school-callback-nested.json` — 嵌套 callback 测试数据
7. `tests/fixtures/sample-school-callback-invalid.json` — 无效 callback 测试数据
8. `tests/schoolCallbackImporter.test.ts` — callback 解析器测试（19 个）

### 修改文件

1. `electron/main.ts` — 注册 schoolOnlineIpc
2. `electron/preload.ts` — 暴露 schoolAuth/schoolSchedule API
3. `src/components/LoginPanel.tsx` — 对接新的在线登录和课表获取流程
4. `src/app/App.tsx` — 传递 onImportReady 给 LoginPanel
5. `.gitignore` — 添加 school-callbacks、credentials 等忽略规则
6. `docs/CURRENT_STATUS.md` — 更新浏览器自动化方案说明
7. `docs/architecture.md` — 添加 browser-act 数据流图

### 技术方案

- **不使用 Playwright**，使用 browser-act CLI 进行浏览器自动化
- browser-act 通过 child_process.execFile 调用
- 学校入口页：https://jwc.neau.edu.cn/xsfw1/xsxt.htm
- 登录流程：打开入口页 → 查找学生系统链接 → 填写账号密码 → 提交 → 判断结果
- 课表获取：进入课表页面 → 监听 network 请求 → 捕获 callback JSON → 解析

### 测试结果

- typecheck: ✅ 通过
- 测试: ✅ 79 个通过，8 个跳过
- 新增 19 个 schoolCallbackImporter 测试全部通过

## 真实系统验证状态

**未验证，不得宣称已完成真实系统适配。**

代码框架与 mock 测试完成，真实学校系统待用户测试。

### 用户回来后测试步骤

1. 确保 browser-act 已安装：`uv tool install browser-act-cli --python 3.12`
2. 运行 `npm run dev`
3. 点击"连接学校系统"
4. 输入学校账号密码
5. 点击"登录并获取课表"
6. 观察状态变化和错误信息
7. 如果遇到验证码，软件会提示"需要人工处理"
8. 如果登录成功但未捕获到 callback，可以使用"从文件导入"功能

### 需要用户反馈的信息

- 登录是否成功
- 如果失败，页面上显示的错误提示
- 如果需要验证码，是什么类型的验证码
- 登录成功后，Network 面板中 callback URL 的关键字
- 脱敏后的 callback response（不含个人信息）

## 风险

1. 真实学校页面结构可能与配置不匹配
2. browser-act 的 network request 捕获可能不完整
3. 验证码类型未知，当前方案是返回 captcha-required
4. 学校系统可能有反自动化检测

## 下一步建议

1. 用户手动测试真实学校系统
2. 根据真实页面结构调整 schoolSystemConfig
3. 如果 browser-act 无法捕获 callback，考虑让用户手动导出
4. 考虑添加"从剪贴板粘贴 callback JSON"的快捷方式
