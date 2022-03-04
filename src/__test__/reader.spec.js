import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {execa} from 'execa'

import reader from '../reader'

const rootName = 'tmp-reader-test-root'
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), rootName)

describe('Reading package json files', () => {
  beforeEach(async () => {
    await fs.mkdir(root)
  })

  afterEach(async () => {
    await fs.rm(root, {recursive: true})
  })

  it('adds root and explicit workspaces', async () => {
    const rootJson = {
      name: '@root',
      workspaces: [
        './ws1',
        './nested/path/ws2',
      ]
    }

    const ws1Json = {
      name: '@root/ws1',
    }

    const ws2Json = {
      name: '@root/ws2',
    }

    await fs.mkdir(path.join(root, 'ws1'), {recursive: true})
    await fs.mkdir(path.join(root, 'nested', 'path', 'ws2'), {recursive: true})

    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson))
    await fs.writeFile(path.join(root, 'ws1', 'package.json'), JSON.stringify(ws1Json))
    await fs.writeFile(path.join(root, 'nested', 'path', 'ws2', 'package.json'), JSON.stringify(ws2Json))

    const {main, workspaces} = await reader({cwd: root})

    expect(main).toEqual({root: '', pjson: rootJson})
    expect(workspaces).toEqual([
      {root: 'ws1', pjson: ws1Json},
      {root: 'nested/path/ws2', pjson: ws2Json},
    ])
  })

  it('adds root and wildcard workspaces', async () => {
    const rootJson = {
      name: '@root',
      workspaces: [
        './ws/*',
      ]
    }

    const ws1Json = {
      name: '@root/ws1',
    }

    const ws2Json = {
      name: '@root/ws2',
    }

    const ws3Json = {
      name: '@root/ws3',
    }

    await fs.mkdir(path.join(root, 'ws', 'ws1'), {recursive: true})
    await fs.mkdir(path.join(root, 'ws', 'ws2'), {recursive: true})
    await fs.mkdir(path.join(root, 'ws', 'ws3'), {recursive: true})

    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson))
    await fs.writeFile(path.join(root, 'ws', 'ws1', 'package.json'), JSON.stringify(ws1Json))
    await fs.writeFile(path.join(root, 'ws', 'ws2', 'package.json'), JSON.stringify(ws2Json))
    await fs.writeFile(path.join(root, 'ws', 'ws3', 'package.json'), JSON.stringify(ws3Json))

    const {main, workspaces} = await reader({cwd: root})

    expect(main).toEqual({root: '', pjson: rootJson})
    expect(workspaces).toEqual([
      {root: 'ws/ws1', pjson: ws1Json},
      {root: 'ws/ws2', pjson: ws2Json},
      {root: 'ws/ws3', pjson: ws3Json},
    ])
  })

  it('does not add unlisted modules', async () => {
    const rootJson = {
      name: '@root',
      workspaces: [
        './ws/ws1',
      ]
    }

    const ws1Json = {
      name: '@root/ws1',
    }

    const ws2Json = {
      name: '@root/ws2',
    }

    await fs.mkdir(path.join(root, 'ws', 'ws1'), {recursive: true})
    await fs.mkdir(path.join(root, 'ws', 'ws2'), {recursive: true})

    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson))
    await fs.writeFile(path.join(root, 'ws', 'ws1', 'package.json'), JSON.stringify(ws1Json))
    await fs.writeFile(path.join(root, 'ws', 'ws2', 'package.json'), JSON.stringify(ws2Json))

    const {main, workspaces} = await reader({cwd: root})

    expect(main).toEqual({root: '', pjson: rootJson})
    expect(workspaces).toEqual([
      {root: 'ws/ws1', pjson: ws1Json},
    ])
  })

  it('works with packages without workspaces', async () => {
    const rootJson = {
      name: '@root',
    }

    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson))
    const {main, workspaces} = await reader({cwd: root})

    expect(main).toEqual({root: '', pjson: rootJson})
    expect(workspaces).toEqual([])
  })

  it('throws an error when workspace package json not found', async () => {
    const rootJson = {
      name: '@root',
      workspaces: [
        'ws1',
      ],
    }

    await fs.mkdir(path.join(root, 'ws1'), {recursive: true})
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson))

    await expect(async () => await reader({cwd: root})).rejects.toThrow()
  })

  it('throws an error when root package json not found', async () => {
    await expect(async () => await reader({cwd: root})).rejects.toThrow()
  })
})
