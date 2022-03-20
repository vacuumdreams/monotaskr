const process = require('node:process')
const fs = require('node:fs')
const path = require('node:path')
const monotaskr = require('./src')

const args = process.argv.slice(2)

const lastArg = args.slice(-1)[0]
const isLastArgPath =
  lastArg && fs.lstatSync(path.resolve(lastArg)).isDirectory()

const cwd = isLastArgPath ? lastArg : process.cwd()
const options = isLastArgPath ? args.slice(0, -1) : args

monotaskr({cwd, options})
