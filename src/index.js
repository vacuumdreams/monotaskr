import process from 'node:process';
import path from 'node:path';
import {execa} from 'execa';
import Listr from 'listr';

import collect from './collector/index.js';
import read from './reader/index.js';
import transform from './transformer/index.js';

const toTask = ({title, packageName, command, files, root}) => ({
	title,
	task(context) {
		const [cmd, ...args] = command.replace(/{files}/g, files.join(' ')).split(' ');
		return execa(cmd, args, {cwd: path.join(context.cwd, root)});
	},
	skip: () => files.length > 0 ? false : `No staged files in package "${packageName}".`,
});

const getSkipMessage = ({title, files, tasks}) => {
	if (tasks.length === 0) {
		return `No tasks found for the "${title}" stage.`;
	}

	if (files.lenght === 0) {
		return `No staged files for the "${title}" stage`;
	}

	return false;
};

export default async function monotaskr({cwd, options}) {
	const files = await collect({cwd});
	const config = await read({cwd});
	const stages = await transform({config, files});

	const taskr = new Listr(stages.map(({title, tasks = []}) => ({
		title,
		skip: () => getSkipMessage({title, files, tasks}),
		task: () => new Listr(tasks.map(task => toTask(task)), {concurrent: true, collapse: false}),
	})), {
		concurrent: false,
		collapse: false,
		renderer: process.env.NODE_ENV === 'test' ? 'silent' : 'main',
	});

	return taskr.run({cwd, options, config, files});
}
