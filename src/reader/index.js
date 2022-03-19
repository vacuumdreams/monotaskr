import fs from 'node:fs/promises';
import path from 'node:path';
import glob from 'glob-promise';

const readContent = async (root, ws = '') => {
	const rawContent = await fs.readFile(path.join(root, ws, 'package.json'));
	return {
		root: ws,
		pjson: JSON.parse(rawContent),
	};
};

export default async function reader({cwd}) {
	const main = await readContent(cwd);
	const wsroots = await Promise.all((main.pjson.workspaces ?? []).map(wspath => glob(path.join(cwd, wspath))));
	const workspaces = await Promise.all(wsroots.flat().map(wsroot => readContent(cwd, wsroot.replace(`${cwd}/`, ''))));

	return {main, workspaces};
}
