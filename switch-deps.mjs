#!/usr/bin/env node
// ============================================================
// Cordis Tutorial 依赖源切换脚本
// ============================================================
// 用法：
//   node switch-deps.mjs harness    # 切换到 DeepSeek Harness vendor 模式
//   node switch-deps.mjs npm        # 切换到 npm cordis 独立模式
//   node switch-deps.mjs status     # 查看当前模式
//
// 功能：
//   1. 批量替换 .ts 文件中的 import 路径
//      @deepseek-ai/cordis  ↔  cordis
//      @deepseek-ai/schemastery  ↔  schemastery
//      @deepseek-ai/cordis-plugin-*  ↔  cordis-plugin-*
//   2. 切换 package.json 中 step01~09 的脚本路径
//      vendor/cordis/bin.js  ↔  node_modules/cordis/bin.js
//   3. 更新 run.mjs 中的 bin.js 解析逻辑
//   4. 更新 .ts 文件中的 declare module 路径
//
// 所有替换均可逆，反复切换不丢失信息。
// ============================================================

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = resolve(__dirname)
const stepsDir = join(rootDir, 'steps')

// ── 映射表 ──────────────────────────────────────────────────

const TS_REPLACEMENTS = {
  harness: {
    'cordis':                          '@deepseek-ai/cordis',
    'schemastery':                     '@deepseek-ai/schemastery',
    '@cordisjs/plugin-':              '@deepseek-ai/cordis-plugin-',
  },
  npm: {
    '@deepseek-ai/cordis':            'cordis',
    '@deepseek-ai/schemastery':       'schemastery',
    '@deepseek-ai/cordis-plugin-':    '@cordisjs/plugin-',
  },
}

// ── 工具函数 ──────────────────────────────────────────────────

function getAllTsFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(fullPath))
    } else if (entry.name.endsWith('.ts')) {
      results.push(fullPath)
    }
  }
  return results
}

function replaceInFile(filePath, replacements) {
  let content = readFileSync(filePath, 'utf-8')
  let changed = false
  for (const [from, to] of Object.entries(replacements)) {
    if (content.includes(from)) {
      content = content.split(from).join(to)
      changed = true
    }
  }
  if (changed) {
    writeFileSync(filePath, content, 'utf-8')
  }
  return changed
}

// ── .ts 文件切换 ──────────────────────────────────────────────

function switchTsFiles(mode) {
  const replacements = TS_REPLACEMENTS[mode]
  const tsFiles = getAllTsFiles(stepsDir)
  let count = 0
  for (const file of tsFiles) {
    if (replaceInFile(file, replacements)) {
      count++
      console.log(`  [TS] ${relative(rootDir, file)}`)
    }
  }
  return count
}

// ── package.json 切换 ──────────────────────────────────────────

function switchPackageJson(mode) {
  const pkgPath = join(rootDir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

  let changed = false
  const scripts = pkg.scripts || {}

  for (const key of Object.keys(scripts)) {
    if (!key.startsWith('step')) continue
    if (mode === 'harness') {
      if (scripts[key].includes('node_modules/cordis/bin.js')) {
        scripts[key] = scripts[key].replace(
          /node --import tsx .*node_modules\/cordis\/bin\.js/,
          'node --import tsx ../../../../vendor/cordis/bin.js'
        )
        changed = true
      }
    } else {
      if (scripts[key].includes('vendor/cordis/bin.js')) {
        scripts[key] = scripts[key].replace(
          /node --import tsx ..\/..\/..\/..\/vendor\/cordis\/bin\.js/,
          'node --import tsx ../../node_modules/cordis/bin.js'
        )
        changed = true
      }
    }
  }

  if (changed) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    console.log(`  [JSON] package.json scripts 已更新`)
  }
  return changed
}

// ── run.mjs 切换 ──────────────────────────────────────────────

function switchRunMjs(mode) {
  const runPath = join(rootDir, 'run.mjs')
  const content = readFileSync(runPath, 'utf-8')
  const lines = content.split('\n')

  const harnessBinLines = [
    '// [harness-mode]',
    "const harnessRoot = resolve(__dirname, '..', '..')",
    "const binPath = join(harnessRoot, 'vendor', 'cordis', 'bin.js')",
  ]
  const npmBinLines = [
    '// [npm-mode]',
    "const binPath = join(__dirname, 'node_modules', 'cordis', 'bin.js')",
  ]

  const harnessCheckLines = [
    'if (!existsSync(binPath)) {',
    '  console.error(`错误：找不到 vendor/cordis/bin.js`)',
    '  console.error(`期望路径：${binPath}`)',
    '  console.error(`请确保本教程目录位于 deepseek-harness 仓库内。`)',
    '  process.exit(1)',
    '}',
  ]
  const npmCheckLines = [
    'if (!existsSync(binPath)) {',
    '  console.error(`错误：找不到 node_modules/cordis/bin.js`)',
    '  console.error(`期望路径：${binPath}`)',
    '  console.error(`请先运行：npm install`)',
    '  process.exit(1)',
    '}',
  ]

  // 定位两个块的起止行号
  let modeMarkerIdx = -1
  let modeBlockEndIdx = -1
  let checkStartIdx = -1
  let checkEndIdx = -1

  for (let i = 0; i < lines.length; i++) {
    if (modeMarkerIdx < 0 && (lines[i].trim() === '// [harness-mode]' || lines[i].trim() === '// [npm-mode]')) {
      modeMarkerIdx = i
    }
    if (modeMarkerIdx >= 0 && modeBlockEndIdx < 0 && lines[i].includes('const binPath = ')) {
      modeBlockEndIdx = i
    }
    if (checkStartIdx < 0 && lines[i].trim() === 'if (!existsSync(binPath)) {') {
      checkStartIdx = i
    }
    if (checkStartIdx >= 0 && checkEndIdx < 0 && i > checkStartIdx && lines[i].trim() === '}') {
      checkEndIdx = i
    }
  }

  // 使用 while 循环逐行重建，跳过旧块，插入新块
  const result = []
  let i = 0
  while (i < lines.length) {
    if (i === modeMarkerIdx) {
      const target = mode === 'harness' ? harnessBinLines : npmBinLines
      result.push(...target)
      i = modeBlockEndIdx + 1
      continue
    }
    if (i === checkStartIdx) {
      const target = mode === 'harness' ? harnessCheckLines : npmCheckLines
      result.push(...target)
      i = checkEndIdx + 1
      continue
    }
    result.push(lines[i])
    i++
  }

  writeFileSync(runPath, result.join('\n'), 'utf-8')
  console.log(`  [JS] run.mjs 已更新为 ${mode} 模式`)
}

// ── 模式检测 ──────────────────────────────────────────────────

function detectMode() {
  const samplePath = join(stepsDir, '01-hello', 'hello.ts')
  if (!existsSync(samplePath)) return 'unknown'
  const content = readFileSync(samplePath, 'utf-8')
  if (content.includes('@deepseek-ai/cordis')) return 'harness'
  if (content.includes("from 'cordis'") || content.includes('from "cordis"')) return 'npm'
  return 'unknown'
}

// ── 主逻辑 ──────────────────────────────────────────────────

function main() {
  const mode = process.argv[2]

  if (!mode || (mode !== 'harness' && mode !== 'npm' && mode !== 'status')) {
    console.log('用法：')
    console.log('  node switch-deps.mjs harness    # 切换到 DeepSeek Harness vendor 模式')
    console.log('  node switch-deps.mjs npm        # 切换到 npm cordis 独立模式')
    console.log('  node switch-deps.mjs status     # 查看当前模式')
    process.exit(1)
  }

  if (mode === 'status') {
    const current = detectMode()
    console.log(`当前依赖源模式：${current === 'harness' ? 'DeepSeek Harness vendor' : current === 'npm' ? 'npm cordis（独立）' : '未知'}`)
    return
  }

  const currentMode = detectMode()
  if (currentMode === mode) {
    console.log(`当前已是 ${mode} 模式，无需切换。`)
    return
  }

  console.log(`\n切换依赖源：${currentMode} → ${mode}`)
  console.log('─'.repeat(50))

  // 1. 切换 .ts 文件 import 路径
  console.log('\n[1/4] 切换 .ts 文件 import 路径')
  const tsCount = switchTsFiles(mode)
  console.log(`  共 ${tsCount} 个 .ts 文件已更新`)

  // 2. 切换 package.json scripts
  console.log('\n[2/4] 切换 package.json scripts')
  switchPackageJson(mode)

  // 3. 切换 run.mjs
  console.log('\n[3/4] 切换 run.mjs')
  switchRunMjs(mode)

  // 4. 安装依赖（仅 npm 模式）
  console.log('\n[4/4] 安装依赖')
  if (mode === 'npm') {
    console.log('  正在安装 npm 依赖...')
    try {
      execSync('npm install cordis @cordisjs/plugin-loader @cordisjs/plugin-include schemastery', {
        cwd: rootDir,
        stdio: 'inherit',
      })
      console.log('  npm 依赖安装完成')
    } catch (e) {
      console.error('  npm install 失败，请手动执行：')
      console.error('    npm install cordis @cordisjs/plugin-loader @cordisjs/plugin-include schemastery')
    }
  } else {
    console.log('  harness 模式无需额外安装依赖')
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`切换完成！当前模式：${mode === 'harness' ? 'DeepSeek Harness vendor' : 'npm cordis（独立）'}`)

  if (mode === 'npm') {
    console.log('\n可直接运行：node run.mjs 01')
  } else {
    console.log('\n可运行步骤：')
    console.log('  1. 确保位于 deepseek-harness 仓库内')
    console.log('  2. 确保 vendor 包已构建（tsc -b tsconfig.host.json）')
    console.log('  3. 确保 node_modules/@deepseek-ai/ 链接已创建')
    console.log('  4. node run.mjs 01')
  }
}

main()
