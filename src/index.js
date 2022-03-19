const path = require('node:path')
const {execa} = require('execa')
const Listr = require('listr')

const collect = require('./collector/index.js')
const read = require('./reader/index.js')
const transform = require('./transformer/index.js')

const toTask = ({title, packageName, command, files, root}) => ({
  title,
  task: context => {
    const [cmd, ...args] = command.replace(new RegExp('{files}', 'g'), files.join(' ')).split(' ')
    return execa(cmd, args, {cwd: path.join(context.cwd, root)})
  },
  skip: context => {
    return files.length ? false : `No staged files in package "${packageName}".`
  }
})

const getSkipMessage = ({title, files, tasks}) => {
  if (tasks.length === 0) {
    return `No tasks found for the "${title}" stage.`
  }
  if (files.lenght === 0) {
    return `No staged files for the "${title}" stage`
  }
  return false
}

module.exports = async ({cwd, options}) => {
  const files = await collect({cwd})
  const config = await read({cwd})
  const stages = await transform({cwd, options, config, files})

  const taskr = new Listr(stages.map(({title, tasks = []}) => ({
    title,
    skip: () => getSkipMessage({title, files, tasks}),
    task: () => new Listr(tasks.map(toTask), {concurrent: true, collapse: false})
  })), {
    concurrent: false,
    collapse: false,
    renderer: process.env.NODE_ENV === 'test' ? 'silent' : 'main',
  })

  return taskr.run({cwd, options, config, files})
}
