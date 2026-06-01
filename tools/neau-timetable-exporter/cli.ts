/**
 * CLI for NEAU Timetable Exporter
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractFromHtml } from './src/extractFromHtml';
import { normalizeToTimetableJson } from './src/normalizeToTimetableJson';

interface CliArgs {
  input?: string;
  output?: string;
  help?: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
      result.input = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
NEAU Timetable Exporter - 东北农业大学课表导出器

用法:
  npm run exporter:from-html -- --input <html文件> --output <输出json>

参数:
  --input, -i   输入的 HTML 文件路径
  --output, -o  输出的 JSON 文件路径 (默认: output/timetable.json)
  --help, -h    显示帮助信息

示例:
  npm run exporter:from-html -- --input fixtures/sample-neau-page.html --output output/timetable.json

说明:
  本工具用于将保存的东北农业大学课表 HTML 页面转换为主软件可导入的 JSON 格式。
  主软件纯本地运行，不联网。本工具也不保存任何账号密码。
`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.input) {
    console.error('错误: 请指定输入文件 (--input)');
    showHelp();
    process.exit(1);
  }

  const inputPath = path.resolve(args.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`错误: 输入文件不存在: ${inputPath}`);
    process.exit(1);
  }

  const outputPath = path.resolve(args.output ?? 'output/timetable.json');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`读取 HTML: ${inputPath}`);
  const html = fs.readFileSync(inputPath, 'utf-8');

  console.log('解析课表...');
  const { courses, errors } = extractFromHtml(html);

  if (errors.length > 0) {
    console.warn('解析警告:');
    errors.forEach((err) => {
      console.warn(`  - ${err.field}: ${err.message}`);
    });
  }

  if (courses.length === 0) {
    console.error('错误: 没有找到任何课程');
    process.exit(1);
  }

  console.log(`找到 ${courses.length} 门课程`);

  console.log('生成 timetable.json...');
  const result = normalizeToTimetableJson(courses, html);

  if (!result.success || !result.data) {
    console.error('错误: 生成失败');
    result.errors.forEach((err) => {
      console.error(`  - ${err.field}: ${err.message}`);
    });
    process.exit(1);
  }

  fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2), 'utf-8');
  console.log(`输出文件: ${outputPath}`);
  console.log('完成!');
}

main();
