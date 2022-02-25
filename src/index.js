import path from 'path'
import {execa} from 'execa'
import Listr from 'listr'

import collect from './collector/index.js'
import read from './reader/index.js'
import transform from './transformer/index.js'

const toTask = ({title, packageName, command, files, root}) => ({
  title,
  task: context => {
    const [cmd, ...args] = command.replace(new RegExp('${stagedFiles}', 'g'), context.files.join(' ')).split(' ')
    return execa(cmd, args, {cwd: path.join(context.cwd, root)})
  },
  skip: context => {
    return files.length ? false : `No staged files in package "${packageName}".`
  }
})

export default async ({cmds, cwd}) => {
  const files = await collect({cwd})
  const config = await read({cwd})
  const stages = await transform({cwd, cmds, config, files})

  const taskr = new Listr(stages.map(({title, tasks = []}) => ({
    title,
    skip: () => tasks.length === 0 ? `No tasks found for the "${title}" stage.` : false,
    task: () => new Listr(tasks.map(toTask), {concurrent: true, collapse: false})
  })), {concurrent: false, collapse: false})

  return taskr.run({cmds, cwd, config, files})
}
