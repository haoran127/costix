/**
 * i18n 翻译完整性检查脚本
 * 用法: node scripts/check-i18n.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '../src/i18n/locales');
const baseLocale = 'en-US.json';

// 递归获取所有键
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// 检查键是否存在于对象中
function hasKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null || !(part in current)) {
      return false;
    }
    current = current[part];
  }
  return true;
}

// 主函数
function checkTranslations() {
  // 读取基准文件
  const basePath = path.join(localesDir, baseLocale);
  const baseContent = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
  const baseKeys = getAllKeys(baseContent);
  
  console.log(`\n📋 基准文件: ${baseLocale}`);
  console.log(`   总键数: ${baseKeys.length}\n`);
  console.log('='.repeat(60));
  
  // 获取所有语言文件
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== baseLocale);
  
  let totalMissing = 0;
  const missingByFile = {};
  
  for (const file of files) {
    const filePath = path.join(localesDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const fileKeys = getAllKeys(content);
    
    // 查找缺失的键
    const missingKeys = baseKeys.filter(key => !hasKey(content, key));
    // 查找多余的键（在其他语言中有但基准没有的）
    const extraKeys = fileKeys.filter(key => !hasKey(baseContent, key));
    
    missingByFile[file] = missingKeys;
    totalMissing += missingKeys.length;
    
    const status = missingKeys.length === 0 ? '✅' : '❌';
    console.log(`\n${status} ${file}`);
    console.log(`   键数: ${fileKeys.length}/${baseKeys.length}`);
    
    if (missingKeys.length > 0) {
      console.log(`   缺失 ${missingKeys.length} 个键:`);
      missingKeys.forEach(key => {
        console.log(`     - ${key}`);
      });
    }
    
    if (extraKeys.length > 0) {
      console.log(`   多余 ${extraKeys.length} 个键:`);
      extraKeys.slice(0, 5).forEach(key => {
        console.log(`     + ${key}`);
      });
      if (extraKeys.length > 5) {
        console.log(`     ... 还有 ${extraKeys.length - 5} 个`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 总结:`);
  console.log(`   检查了 ${files.length} 个语言文件`);
  console.log(`   基准键数: ${baseKeys.length}`);
  console.log(`   总缺失键数: ${totalMissing}`);
  
  if (totalMissing === 0) {
    console.log('\n🎉 所有翻译文件完整！\n');
  } else {
    console.log('\n⚠️  发现缺失的翻译键，请补充！\n');
  }
  
  return { baseKeys, missingByFile, totalMissing };
}

checkTranslations();
