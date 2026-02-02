/**
 * i18n 翻译覆盖率检查脚本
 * 检查所有语言文件是否包含相同的翻译键
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const localesDir = path.join(projectRoot, 'src', 'i18n', 'locales');

/**
 * 递归获取对象的所有键（支持嵌套）
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  
  return keys;
}

/**
 * 加载语言文件
 */
function loadLocaleFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 无法加载文件 ${filePath}:`, error.message);
    return null;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始检查 i18n 翻译覆盖率...\n');
  
  // 读取所有语言文件
  const localeFiles = fs.readdirSync(localesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      code: file.replace('.json', ''),
      path: path.join(localesDir, file),
      name: file,
    }));

  if (localeFiles.length === 0) {
    console.error('❌ 未找到语言文件！');
    process.exit(1);
  }

  console.log(`📁 找到 ${localeFiles.length} 个语言文件\n`);

  // 加载所有语言文件
  const locales = new Map();
  localeFiles.forEach(({ code, path: filePath, name }) => {
    const data = loadLocaleFile(filePath);
    if (data) {
      locales.set(code, {
        name,
        data,
        keys: getAllKeys(data),
      });
    }
  });

  // 使用 en-US.json 作为基准（与 check-i18n.js 保持一致）
  const baseLocale = locales.get('en-US');
  if (!baseLocale) {
    console.error('❌ 未找到基准语言文件 en-US.json！');
    process.exit(1);
  }
  const baseKeys = new Set(baseLocale.keys);
  
  console.log(`📊 基准语言: ${baseLocale.name} (${baseKeys.size} 个翻译键)\n`);

  // 检查每个语言文件
  let hasMissingKeys = false;
  let hasExtraKeys = false;
  const issues = new Map();

  locales.forEach((locale, code) => {
    if (code === 'en-US') {
      return; // 跳过基准语言
    }

    const localeKeys = new Set(locale.keys);
    const missing = Array.from(baseKeys).filter(key => !localeKeys.has(key));
    const extra = Array.from(localeKeys).filter(key => !baseKeys.has(key));

    if (missing.length > 0) {
      hasMissingKeys = true;
    }
    if (extra.length > 0) {
      hasExtraKeys = true;
    }
    if (missing.length > 0 || extra.length > 0) {
      issues.set(code, { missing, extra, name: locale.name });
    }
  });

  // 输出结果
  if (issues.size === 0) {
    console.log('✅ 所有语言文件的翻译键完全一致！\n');
    process.exit(0);
  } else {
    if (hasMissingKeys) {
      console.log('❌ 发现缺失的翻译键（构建将失败）：\n');
    } else {
      console.log('ℹ️  发现多余的翻译键（仅警告，不影响构建）：\n');
    }
    
    issues.forEach(({ missing, extra, name }, code) => {
      console.log(`📄 ${name} (${code})`);
      console.log('─'.repeat(80));
      
      if (missing.length > 0) {
        console.log(`\n  ❌ 缺失的翻译键 (${missing.length} 个):`);
        missing.forEach(key => {
          console.log(`    - ${key}`);
        });
      }
      
      if (extra.length > 0) {
        console.log(`\n  ℹ️  多余的翻译键 (${extra.length} 个) - 可选清理:`);
        extra.slice(0, 5).forEach(key => {
          console.log(`    + ${key}`);
        });
        if (extra.length > 5) {
          console.log(`    ... 还有 ${extra.length - 5} 个`);
        }
      }
      
      console.log('');
    });
    
    // 只对缺失键报错，多余键只是警告
    if (hasMissingKeys) {
      console.log('\n💡 提示：请补充缺失的翻译键\n');
      process.exit(1);
    } else {
      console.log('\n💡 提示：多余的键不影响功能，可以稍后清理\n');
      process.exit(0); // 多余键不阻止构建
    }
  }
}

main();

