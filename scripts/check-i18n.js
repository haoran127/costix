/**
 * i18n 翻译完整性检查脚本
 * 检测代码中硬编码的中文/英文文本，确保使用翻译键
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 中文字符正则（包括常见标点）
const CHINESE_REGEX = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]+/g;
// 常见英文短语（需要翻译的）
const ENGLISH_PHRASES = [
  /API\s+Key/i,
  /API\s+Keys/i,
  /Add\s+API/i,
  /Create\s+API/i,
  /Import/i,
  /Export/i,
  /Delete/i,
  /Edit/i,
  /Save/i,
  /Cancel/i,
  /Success/i,
  /Error/i,
  /Failed/i,
  /Loading/i,
  /Please\s+enter/i,
  /Please\s+fill/i,
  /Click\s+to/i,
];

// 需要检查的文件扩展名
const FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// 排除的目录和文件
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /dist/,
  /build/,
  /\.d\.ts$/,
  /\.config\./,
  /scripts\//,
  /i18n\/locales\//, // 翻译文件本身
];

// 排除的模式（注释、console.log、变量名等）
const EXCLUDE_PATTERNS_IN_CODE = [
  /^[\s]*\/\//, // 注释
  /^[\s]*\/\*/, // 多行注释开始
  /console\.(log|warn|error)/, // console 语句
  /import\s+.*from/, // import 语句
  /export\s+.*from/, // export 语句
  /^\s*const\s+\w+\s*=/, // 变量声明
  /^\s*let\s+\w+\s*=/, // let 声明
  /^\s*var\s+\w+\s*=/, // var 声明
  /^\s*function\s+\w+/, // 函数声明
  /^\s*interface\s+\w+/, // interface 声明
  /^\s*type\s+\w+/, // type 声明
  /^\s*enum\s+\w+/, // enum 声明
  /className=/, // className 属性
  /icon=/, // icon 属性
  /width=/, // width 属性
  /height=/, // height 属性
  /href=/, // href 属性
  /src=/, // src 属性
  /alt=/, // alt 属性
  /aria-label=/, // aria-label
  /title=/, // title 属性
  /mdi:/, // iconify 图标名
  /@iconify/, // iconify 导入
  /:\s*['"]success['"]/, // TypeScript 类型中的 'success'
  /:\s*['"]error['"]/, // TypeScript 类型中的 'error'
  /type:\s*['"]success['"]/, // 对象属性 type: 'success'
  /type:\s*['"]error['"]/, // 对象属性 type: 'error'
  /'success'\s*\|\s*'error'/, // 联合类型 'success' | 'error'
  /'error'\s*\|\s*'success'/, // 联合类型 'error' | 'success'
  /import\s+/, // import 关键字
  /export\s+/, // export 关键字
  /const\s+\w+\s*=\s*['"]import['"]/, // const mode = 'import'
  /setState<.*['"]import['"]/, // useState<'import'>
  /useState<.*['"]import['"]/, // useState<'import'>
];

// 需要检查的字符串模式
const STRING_PATTERNS = [
  /['"`]([^'"`]+)['"`]/g, // 单引号、双引号、反引号字符串
];

// 已发现的硬编码文本
const foundHardcodedTexts = new Map(); // file -> [lines]

/**
 * 检查文件是否应该被排除
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * 检查行是否应该被排除
 */
function shouldExcludeLine(line) {
  return EXCLUDE_PATTERNS_IN_CODE.some(pattern => pattern.test(line.trim()));
}

/**
 * 检查字符串是否包含需要翻译的内容
 */
function containsTranslatableText(text) {
  // 移除引号
  const cleanText = text.replace(/^['"`]|['"`]$/g, '');
  
  // 检查是否包含中文
  if (CHINESE_REGEX.test(cleanText)) {
    return true;
  }
  
  // 检查是否包含需要翻译的英文短语
  if (ENGLISH_PHRASES.some(regex => regex.test(cleanText))) {
    return true;
  }
  
  return false;
}

/**
 * 检查单个文件
 */
function checkFile(filePath) {
  if (shouldExcludeFile(filePath)) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues = [];

    lines.forEach((line, index) => {
      // 跳过排除的行
      if (shouldExcludeLine(line)) {
        return;
      }

      // 查找字符串
      const matches = line.matchAll(STRING_PATTERNS[0]);
      for (const match of matches) {
        const text = match[0];
        const fullText = match[1];
        
        // 跳过太短的字符串（可能是变量名）
        if (fullText.length < 2) {
          continue;
        }
        
        // 跳过纯数字、布尔值、null、undefined
        if (/^(true|false|null|undefined|\d+)$/.test(fullText)) {
          continue;
        }
        
        // 跳过 URL、路径、类名等
        if (/^(https?:\/\/|\.\/|\/|\.css|\.js|\.ts|\.tsx|\.json|bg-|text-|border-|flex|grid|px-|py-|w-|h-)/.test(fullText)) {
          continue;
        }
        
        // 跳过单个单词的英文（可能是变量名或类型）
        if (/^[a-zA-Z]+$/.test(fullText) && fullText.length < 8 && !CHINESE_REGEX.test(fullText)) {
          continue;
        }
        
        // 跳过测试数据中的中文（mock data）
        if (line.includes('mock') || line.includes('test') || line.includes('demo') || line.includes('示例')) {
          continue;
        }
        
        // 检查是否包含需要翻译的内容
        if (containsTranslatableText(text)) {
          // 检查是否已经使用了 t() 函数
          if (!/t\(/.test(line) && !/useTranslation/.test(line)) {
            issues.push({
              line: index + 1,
              text: fullText.trim(),
              code: line.trim(),
            });
          }
        }
      }
    });

    if (issues.length > 0) {
      foundHardcodedTexts.set(filePath, issues);
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
}

/**
 * 递归查找所有需要检查的文件
 */
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (FILE_EXTENSIONS.some(ext => filePath.endsWith(ext))) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始检查 i18n 翻译完整性...\n');
  
  const srcDir = path.join(projectRoot, 'src');
  const files = findFiles(srcDir);
  
  console.log(`📁 找到 ${files.length} 个文件需要检查\n`);
  
  files.forEach(file => {
    checkFile(file);
  });

  // 输出结果
  if (foundHardcodedTexts.size === 0) {
    console.log('✅ 未发现硬编码的文本，所有文本都已使用翻译键！\n');
    process.exit(0);
  } else {
    console.log(`❌ 发现 ${foundHardcodedTexts.size} 个文件包含硬编码文本：\n`);
    
    foundHardcodedTexts.forEach((issues, filePath) => {
      const relativePath = path.relative(projectRoot, filePath);
      console.log(`📄 ${relativePath}`);
      console.log('─'.repeat(80));
      
      issues.forEach(issue => {
        console.log(`  行 ${issue.line}: ${issue.text}`);
        console.log(`  ${issue.code}`);
        console.log('');
      });
    });
    
    console.log('\n💡 提示：请将这些硬编码文本替换为翻译键，例如：');
    console.log('  硬编码: "API Key"');
    console.log('  应改为: {t(\'apiKeys.apiKeyLabel\')}');
    console.log('\n');
    
    process.exit(1);
  }
}

main();

