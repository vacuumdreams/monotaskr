import {execa} from 'execa';

export default async function collector({cwd}) {
	const {stdout} = await execa('git', ['diff', '--name-only', '--cached'], {cwd});
	return stdout ? stdout.split('\n') : [];
}
