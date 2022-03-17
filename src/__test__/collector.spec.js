const fs = require('node:fs/promises')
const path = require('node:path')
const {execa} = require('execa')

const collector = require('../collector')

const rootName = 'tmp-collector-test-root'
const root = path.join(__dirname, rootName)

describe('Collecting staged files', () => {
  beforeEach(async () => {
    await fs.mkdir(root)
  })

  afterEach(async () => {
    await execa('git', ['reset', '.'], {cwd: root})
    await fs.rm(root, {recursive: true})
  })

  it('returns the list of staged files', async () => {
    await fs.writeFile(path.join(root, 'file1.json'), 'content')
    await fs.writeFile(path.join(root, 'file2.json'), 'content')
    await execa('git', ['add', '.'], {cwd: root})

    const results = await collector({cwd: root})
    expect(results).toEqual([
      path.join('src', '__test__', rootName, 'file1.json'),
      path.join('src', '__test__', rootName, 'file2.json'),
    ])
  })

  it('ignores unstaged files', async () => {
    await fs.writeFile(path.join(root, 'file1.json'), 'content')
    await fs.writeFile(path.join(root, 'file2.json'), 'content')
    await execa('git', ['add', 'file1.json'], {cwd: root})

    const results = await collector({cwd: root})
    expect(results).toEqual([
      path.join('src', '__test__', rootName, 'file1.json'),
    ])
  })
})
