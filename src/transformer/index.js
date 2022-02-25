import chalk from 'chalk'

const ROOT_STAGE = 'root'
const WORKSPACES_STAGE = 'ws'

const defaultMainConfig = {
  stages: [
    {
      id: ROOT_STAGE,
      title: 'Root tasks',
    },
    {
      id: WORKSPACES_STAGE,
      title: 'Workspace Tasks',
    },
  ],
  tasks: [],
}

const defaultWsConfig = {
  tasks: [
    {
      title: 'Lint',
      command: 'npm run lint -- ${stagedFiles}',
    },
    {
      title: 'Typecheck',
      command: 'npm run typecheck',
    },
    {
      title: 'Test',
      command: 'npm run test',
    },
  ]
}

const getScopedFiles = (root, files) => files.filter(file => file.includes(root))

const addTask = ({tasksConfig, task, packageName, root, files, stage}) => {
  if (task.stage && !tasksConfig[task.stage]) {
    throw new Error(`The stage ${chalk.bold(`"${task.stage}"`)} does not exist. Make sure you provide a configuration for it in your root.`)
  }

  tasksConfig[task.stage ?? stage].tasks.push({
    root,
    files,
    packageName,
    command: task.command,
    title: `${chalk.italic.gray(packageName)}: ${chalk.bold(task.title)}`,
  })
  return tasksConfig
}

export default async ({cwd, cmds, config, files: allFiles}) => {
  const {stages, tasks} = {...defaultMainConfig, ...config.main.pjson.monotaskr}

  const defaultTasks = stages.reduce((acc, item) => {
    const stage = item.id ?? item
    if (stage === WORKSPACES_STAGE && config.workspaces.length === 0) {
      return acc
    }
    acc[stage] = {
      title: item.title ?? item,
      tasks: [],
    }
    return acc
  }, {})

  const mainTasks = tasks.reduce((acc, task) => addTask({
    task,
    packageName: config.main.pjson.name,
    tasksConfig: acc,
    files: allFiles,
    root: config.main.root,
    stage: ROOT_STAGE,
  }), defaultTasks)

  const allTasks = config.workspaces.reduce((tasksConfig, wsConfig) => {
    const {tasks = []} = {...defaultWsConfig, ...wsConfig.pjson.monotaskr}
    const files = getScopedFiles(wsConfig.root, allFiles)
    const packageName = wsConfig.pjson.name
    return tasks.reduce((acc, task) => addTask({
      task,
      files,
      packageName,
      tasksConfig,
      root: wsConfig.root,
      stage: WORKSPACES_STAGE,
    }), tasksConfig)
  }, mainTasks)

  return Object.values(allTasks)
}
