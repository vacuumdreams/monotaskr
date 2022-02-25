import {execa} from 'execa'

export default async () => {
  const {stdout} = await execa('git', ['diff', '--name-only', '--cached'])
  return stdout.split('\n')
}
