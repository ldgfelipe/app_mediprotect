import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Step 1: Patch oxc-walker (debe ejecutarse ANTES de nuxt prepare, que lo importa)
const oxcWalkerPath = resolve(__dirname, 'node_modules', 'oxc-walker', 'dist', 'index.mjs')
if (existsSync(oxcWalkerPath)) {
  let content = readFileSync(oxcWalkerPath, 'utf8')

  // Heal: repara la duplicacion de "let cachedParseSync;" dejada por un patch intermedio.
  const dupLet = `let cachedParseSync;\nlet _oxcInit;\nlet cachedParseSync;`
  if (content.includes(dupLet)) {
    content = content.replace(dupLet, `let _oxcInit;\nlet cachedParseSync;`)
    writeFileSync(oxcWalkerPath, content, 'utf8')
    console.log('oxc-walker healed (duplicate cachedParseSync removed)')
  }

  if (content.includes('await _ensureOxc()') || content.includes('await _oxc')) {
    console.log('oxc-walker already patched')
  } else {
    content = content.replace("import { createRequire } from 'node:module';", '')

    const newFn = String.raw`let _oxcInit;
let cachedParseSync;
function resolveParseSync() {
  if (cachedParseSync) return cachedParseSync;
  throw new Error("oxc-walker: parseSync not loaded yet.");
}
if (!_oxcInit) {
  _oxcInit = (async () => {
    const mod = await import('oxc-parser');
    if (typeof mod.parseSync === "function") cachedParseSync = mod.parseSync;
  })();
  await _oxcInit;
}`

    const re = /let cachedParseSync;\s*\n\s*function resolveParseSync\(\) \{[\s\S]*?throw new Error\([\s\S]*?\);\s*\n\}/
    if (re.test(content)) {
      content = content.replace(re, newFn)
      writeFileSync(oxcWalkerPath, content, 'utf8')
      console.log('oxc-walker patched successfully')
    } else {
      console.log('Warning: Could not patch oxc-walker (function not found)')
    }
  }
} else {
  console.log('oxc-walker not found, skipping patch')
}

// Step 2: nuxt prepare
console.log('Running nuxt prepare...')
execSync('npx nuxt prepare', { stdio: 'inherit', cwd: __dirname })