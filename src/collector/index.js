const {execa} = require('execa')

module.exports = async ({cwd}) => {
  const {stdout} = await execa('git', ['diff', '--name-only', '--cached'], {cwd})
  return !stdout ? [] : stdout.split('\n')
}
