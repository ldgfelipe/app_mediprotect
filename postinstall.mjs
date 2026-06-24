import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const oxcWalkerPath = resolve(__dirname, 'node_modules', 'oxc-walker', 'dist', 'index.mjs')
if (!existsSync(oxcWalkerPath)) {
  console.log('oxc-walker not found, skipping patch')
  process.exit(0)
}

let content = readFileSync(oxcWalkerPath, 'utf8')

// Check if already patched
if (content.includes('await _ensureOxc()')) {
  console.log('oxc-walker already patched')
  process.exit(0)
}

// Replace createRequire import
content = content.replace(
  `import { createRequire } from 'node:module';`,
  ''
)

// Replace resolveParseSync function
const oldFunction = `let cachedParseSync;
function resolveParseSync() {
  if (cachedParseSync) return cachedParseSync;
  const require = createRequire(import.meta.url);
  const candidates = ["oxc-parser", "rolldown/utils"];
  for (const id of candidates) {
    try {
      const mod = require(id);
      if (typeof mod.parseSync === "function") {
        cachedParseSync = mod.parseSync;
        return cachedParseSync;
      }
    } catch {
    }
  }
  throw new Error(
    "oxc-walker: could not resolve a \\`parseSync\\` implementation. Install \\`oxc-parser\\` or \\`rolldown\\` (and use \\`rolldown/utils\\`), or pass a \\`parseSync\\` function via the \\`parseAndWalk\\` options."
  );
}`

const newFunction = `let _oxc;
let cachedParseSync;
function resolveParseSync() {
  if (cachedParseSync) return cachedParseSync;
  throw new Error("oxc-walker: parseSync not loaded yet.");
}
if (!_oxc) {
  _oxc = (async () => {
    const mod = await import('oxc-parser');
    if (typeof mod.parseSync === "function") cachedParseSync = mod.parseSync;
  })();
  await _oxc;
}`

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction)
  writeFileSync(oxcWalkerPath, content, 'utf8')
  console.log('oxc-walker patched successfully')
} else {
  console.log('Could not find the resolveParseSync function in oxc-walker')
  process.exit(1)
}
