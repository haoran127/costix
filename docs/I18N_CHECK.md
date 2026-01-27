# i18n 翻译完整性检查指南

## 📋 概述

本项目提供了两个自动化脚本来确保 i18n 翻译的完整性：

1. **`check-i18n.js`** - 检测代码中硬编码的中文/英文文本
2. **`check-i18n-coverage.js`** - 检查所有语言文件的翻译键一致性

## 🚀 使用方法

### 1. 检查硬编码文本

```bash
npm run check-i18n
```

这个脚本会：
- 扫描 `src/` 目录下的所有 `.tsx`, `.ts`, `.jsx`, `.js` 文件
- 检测硬编码的中文文本和需要翻译的英文短语
- 排除注释、类型定义、测试数据等
- 输出需要翻译的文件和行号

**示例输出：**
```
❌ 发现 3 个文件包含硬编码文本：

📄 src/components/MyComponent.tsx
────────────────────────────────────────────────────────────────────────────────
  行 25: API Key
  <span>API Key</span>
```

### 2. 检查翻译覆盖率

```bash
npm run check-i18n-coverage
```

这个脚本会：
- 比较所有语言文件的翻译键
- 找出缺失的翻译键
- 找出多余的翻译键
- 确保所有语言文件结构一致

**示例输出：**
```
❌ 发现翻译键不一致：

📄 ja.json (ja)
────────────────────────────────────────────────────────────────────────────────
  ⚠️  缺失的翻译键 (5 个):
    - apiKeys.newKey
    - apiKeys.deleteConfirm
    ...
```

### 3. 构建前自动检查

在 `package.json` 中已配置 `prebuild` hook，构建前会自动运行检查：

```bash
npm run build
```

如果检查失败，构建会中断，需要先修复翻译问题。

## 🔧 配置说明

### 排除规则

脚本会自动排除以下内容：

1. **文件排除：**
   - `node_modules/`
   - `dist/`, `build/`
   - `.d.ts` 类型定义文件
   - 配置文件（`.config.*`）
   - `scripts/` 目录
   - `i18n/locales/` 翻译文件本身

2. **代码排除：**
   - 注释（`//`, `/* */`）
   - `console.log` 语句
   - `import` / `export` 语句
   - TypeScript 类型定义（`type`, `interface`, `enum`）
   - 变量声明
   - CSS 类名、图标名、URL 等
   - 单个英文单词（可能是变量名）

### 需要翻译的文本模式

脚本会检测以下内容：

1. **中文字符：** 所有中文字符和标点
2. **英文短语：**
   - API Key / API Keys
   - Add API / Create API
   - Import / Export
   - Delete / Edit / Save / Cancel
   - Success / Error / Failed
   - Loading / Please enter / Please fill
   - Click to...

## 📝 最佳实践

### 1. 开发时检查

在开发新功能时，定期运行检查：

```bash
npm run check-i18n
```

### 2. 提交前检查

在 Git commit 前运行检查，确保没有遗漏：

```bash
npm run check-i18n && npm run check-i18n-coverage
```

### 3. CI/CD 集成

可以在 CI/CD 流程中添加检查：

```yaml
# .github/workflows/ci.yml
- name: Check i18n
  run: |
    npm run check-i18n
    npm run check-i18n-coverage
```

## 🐛 常见问题

### Q: 脚本报告了误报怎么办？

A: 如果某些文本确实不需要翻译（如测试数据、配置值），可以：
1. 将其放在测试文件中（会被自动排除）
2. 使用注释标记：`// i18n-ignore`
3. 修改脚本的排除规则

### Q: 如何添加新的排除规则？

A: 编辑 `scripts/check-i18n.js`，在 `EXCLUDE_PATTERNS_IN_CODE` 数组中添加新的正则表达式。

### Q: 如何忽略特定文件？

A: 在 `EXCLUDE_PATTERNS` 数组中添加文件路径模式。

## 📊 检查结果解读

### check-i18n 输出

- ✅ **通过：** 未发现硬编码文本
- ❌ **失败：** 发现硬编码文本，需要替换为翻译键

### check-i18n-coverage 输出

- ✅ **通过：** 所有语言文件翻译键一致
- ❌ **失败：** 发现缺失或多余的翻译键

## 🔄 工作流程

1. **开发新功能** → 使用 `t()` 函数添加翻译
2. **运行检查** → `npm run check-i18n`
3. **修复问题** → 将硬编码文本替换为翻译键
4. **检查覆盖率** → `npm run check-i18n-coverage`
5. **补充翻译** → 为所有语言添加缺失的翻译键
6. **构建验证** → `npm run build`（会自动运行检查）

## 💡 提示

- 使用 VS Code 的 i18n 插件可以更方便地管理翻译
- 定期运行检查，避免问题积累
- 在代码审查时检查翻译完整性
- 保持所有语言文件的键结构一致

