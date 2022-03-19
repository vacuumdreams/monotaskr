import chalk from 'chalk';
import toRegExp from 'glob-to-regexp';

const ROOT_STAGE = 'root';
const WORKSPACES_STAGE = 'ws';

const getDefaultTasks = (stage, packageJson) => {
	const tasks = [];

	if (packageJson.scripts?.lint) {
		tasks.push({
			title: 'Lint',
			command: 'npm run lint -- {files}',
			match: '*.{js,jsx,ts,tsx}',
			stage,
		});
	}

	if (packageJson.scripts?.typecheck) {
		tasks.push({
			title: 'Typecheck',
			command: 'npm run typecheck',
			match: '*.{ts,tsx}',
			stage,
		});
	}

	if (packageJson.scripts?.test) {
		tasks.push({
			title: 'Test',
			command: 'npm run test',
			stage,
		});
	}

	return tasks;
};

const getDefaultMainConfig = packageJson => ({
	stages: [
		{
			id: ROOT_STAGE,
			title: 'Root tasks',
		},
		{
			id: WORKSPACES_STAGE,
			title: 'Workspace tasks',
		},
	],
	tasks: (packageJson.workspaces?.length || Boolean(packageJson.monotaskr?.stages)) ? [] : getDefaultTasks(ROOT_STAGE, packageJson),
	...packageJson.monotaskr,
});

const getScopedFiles = (root, files) => files
	.filter(file => file.startsWith(root))
	.map(file => file.replace(`${root}/`, ''));

const addTask = ({tasksConfig, task, packageName, root, files, stage}) => {
	if (!tasksConfig[task.stage ?? stage]) {
		throw new Error(`The stage ${chalk.bold(`"${task.stage}"`)} does not exist. Make sure you provide a configuration for it in your root.`);
	}

	const pattern = task.match && toRegExp(task.match, {extended: true});

	tasksConfig[task.stage ?? stage].tasks.push({
		root,
		files: pattern ? files.filter(file => file.match(pattern)) : files,
		packageName,
		command: task.command,
		title: `${chalk.italic.gray(packageName)}: ${chalk.bold(task.title)}`,
	});

	return tasksConfig;
};

const getWsTasks = (hasCustomStages, packageJson) => {
	if (hasCustomStages) {
		return packageJson.monotaskr?.tasks ?? [];
	}

	return getDefaultTasks(WORKSPACES_STAGE, packageJson);
};

export default async function transformer({config, files: allFiles}) {
	const {stages, tasks} = getDefaultMainConfig(config.main.pjson);

	const defaultTasks = stages.reduce((acc, item) => {
		const stage = item.id;
		if (stage === WORKSPACES_STAGE && !config.workspaces?.length) {
			return acc;
		}

		acc[stage] = {
			title: item.title ?? item,
			tasks: [],
		};
		return acc;
	}, {});

	const mainTasks = tasks.reduce((acc, task) => addTask({
		task,
		packageName: config.main.pjson.name,
		tasksConfig: acc,
		files: allFiles,
		root: config.main.root,
		stage: ROOT_STAGE,
	}), defaultTasks);

	const allTasks = (config.workspaces ?? []).reduce((tasksConfig, wsConfig) => {
		const {tasks} = {
			tasks: getWsTasks(Boolean(config.main.pjson.monotaskr?.stages), wsConfig.pjson),
			...wsConfig.pjson.monotaskr,
		};
		const files = getScopedFiles(wsConfig.root, allFiles);
		const packageName = wsConfig.pjson.name;
		return tasks.reduce((acc, task) => addTask({
			task,
			files,
			packageName,
			tasksConfig,
			root: wsConfig.root,
			stage: WORKSPACES_STAGE,
		}), tasksConfig);
	}, mainTasks);

	return Object.values(allTasks);
}
