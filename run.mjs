#!/usr/bin/env node
// ============================================================
// Cordis Tutorial Runner
// ============================================================
// 用法：
//   node run.mjs <步骤号或目录名>
//   node run.mjs 01          # 运行步骤 01-hello
//   node run.mjs 05          # 运行步骤 05-waterfall
//   node run.mjs all         # 依次运行所有步骤
//
// 原理：调用 Harness 仓库自带的 vendor/cordis/bin.js 启动器，
//   切换工作目录到对应步骤目录后运行。
// ============================================================

import { spawn } from 'node:child_process'
import { resolve, join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// run.mjs 在 tmp/cordis-tutorial/ 下，harness 根目录要上跳两层
const harnessRoot = resolve(__dirname, '..', '..')
const binPath = join(harnessRoot, 'vendor', 'cordis', 'bin.js')

if (!existsSync(binPath)) {
  console.error(`错误：找不到 vendor/cordis/bin.js`)
  console.error(`期望路径：${binPath}`)
  console.error(`请确保本教程目录位于 deepseek-harness 仓库内。`)
  process.exit(1)
}

const stepsDir = join(__dirname, 'steps')

function findStepDir(arg) {
  if (arg === 'all') return 'all'
  // 数字：匹配 01-xxx
  const padded = arg.padStart(2, '0')
  const dirs = readdirSync(stepsDir).filter(d => d.startsWith(padded + '-'))
  if (dirs.length === 0) {
    console.error(`找不到步骤 "${arg}"，可用步骤：`)
    listSteps()
    process.exit(1)
  }
  return dirs[0]
}

function listSteps() {
  const dirs = readdirSync(stepsDir).filter(d => existsSync(join(stepsDir, d, 'cordis.yml')))
  dirs.forEach(d => console.error(`  ${d}`))
}

function runStep(stepDir) {
  const cwd = join(stepsDir, stepDir)
  const ymlPath = join(cwd, 'cordis.yml')
  if (!existsSync(ymlPath)) {
    console.error(`步骤目录 ${stepDir} 中没有 cordis.yml`)
    return
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`  运行步骤：${stepDir}`)
  console.log(`${'='.repeat(60)}\n`)

  const child = spawn('node', ['--import', 'tsx', binPath], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env },
  })

  return new Promise((resolve, reject) => {
    child.on('close', code => {
      if (code !== 0 && code !== null) {
        console.error(`\n步骤 ${stepDir} 以退出码 ${code} 结束`)
      }
      resolve(code)
    })
    child.on('error', reject)
  })
}

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.log('用法：node run.mjs <步骤号 | all>')
    console.log('\n可用步骤：')
    listSteps()
    return
  }

  if (arg === 'all') {
    const dirs = readdirSync(stepsDir).filter(d => existsSync(join(stepsDir, d, 'cordis.yml')))
    for (const d of dirs) {
      await runStep(d)
    }
  } else {
    const stepDir = findStepDir(arg)
    await runStep(stepDir)
  }
}

main().catch(console.error)
