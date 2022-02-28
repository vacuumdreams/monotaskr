import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {execa} from 'execa'

import collector from '../collector'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp')

describe('Collecting staged files', () => {
  beforeEach(async () => {
    await fs.mkdir(root)
  })

  afterEach(async () => {
    await execa('git', ['reset', '.'], {cwd: root})
    await fs.rmdir(root, {recursive: true})
  })

  it('returns the list of staged files', async () => {
    await fs.writeFile(path.join(root, 'file1.json'), 'content')
    await fs.writeFile(path.join(root, 'file2.json'), 'content')
    await execa('git', ['add', '.'], {cwd: root})

    const results = await collector({cwd: root})
    expect(results).toEqual([
      path.join('src', '__test__', 'tmp', 'file1.json'),
      path.join('src', '__test__', 'tmp', 'file2.json'),
    ])
  })

  it('ignores unstaged files', async () => {
    await fs.writeFile(path.join(root, 'file1.json'), 'content')
    await fs.writeFile(path.join(root, 'file2.json'), 'content')
    await execa('git', ['add', 'file1.json'], {cwd: root})

    const results = await collector({cwd: root})
    expect(results).toEqual([
      path.join('src', '__test__', 'tmp', 'file1.json'),
    ])
  })
})
