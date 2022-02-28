import {execa} from 'execa'

export default async ({cwd}) => {
  const {stdout} = await execa('git', ['diff', '--name-only', '--cached'], {cwd})
  return stdout.split('\n')
}
