import fs from 'node:fs'
import path from 'node:path'
import monotaskr from './src/index.js'
const args = process.argv.slice(2)

const lastArg = args.slice(-1)[0]
const isLastArgPath = lastArg && fs.lstatSync(path.resolve(lastArg)).isDirectory()

const cwd = isLastArgPath ? lastArg : process.cwd()
const cmds = isLastArgPath ? args.slice(0, -1) : args

monotaskr({ cmds, cwd })
