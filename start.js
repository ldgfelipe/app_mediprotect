import { fork } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const nuxi = resolve(__dirname, 'node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs')
const args = process.argv.slice(2)

const child = fork(nuxi, args, { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 1))
