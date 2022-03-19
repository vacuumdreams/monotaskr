const chalk = require('chalk')
const transformer = require('../transformer')

describe('Transforms configuration into tasks', () => {
  describe('without workspaces', () => {
    it('creates default stage with empty tasks when no matching scripts are defined', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
            },
          },
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [],
        }
      ])
    })

    it('creates a lint task when it finds a matching script definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              scripts: {
                lint: 'do-lint',
              },
            },
          },
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [
            {
              root: '',
              files: [],
              packageName: 'root',
              command: 'npm run lint -- {files}',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Lint')}`,
            },
          ],
        }
      ])
    })

    it('creates a typecheck task when it finds a matching script definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              scripts: {
                typecheck: 'do-typecheck',
              },
            },
          },
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [
            {
              root: '',
              files: [],
              packageName: 'root',
              command: 'npm run typecheck',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Typecheck')}`,
            },
          ],
        }
      ])
    })

    it('creates a test task when it finds a matching script definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              scripts: {
                test: 'do-test',
              },
            },
          },
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [
            {
              root: '',
              files: [],
              packageName: 'root',
              command: 'npm run test',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Test')}`,
            },
          ],
        }
      ])
    })

    it('applies custom task definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              monotaskr: {
                tasks: [
                  {
                    title: 'Custom',
                    command: 'do-something',
                  },
                  {
                    title: 'Custom two',
                    command: 'do-something-else',
                  },
                ],
              },
            },
          },
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [
            {
              root: '',
              files: [],
              packageName: 'root',
              command: 'do-something',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Custom')}`,
            },
            {
              root: '',
              files: [],
              packageName: 'root',
              command: 'do-something-else',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Custom two')}`,
            },
          ],
        }
      ])
    })

    it('throws an error when a task does not match the stage definitions', async () => {
      const arg = {
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              monotaskr: {
                tasks: [
                  {
                    title: 'Custom',
                    command: 'do-something',
                    stage: 'invalid',
                  },
                ],
              },
            },
          },
        }
      }

      await expect(async () => await transformer(arg)).rejects.toThrow()
    })

    it('applies custom stage definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              monotaskr: {
                stages: [
                  {
                    id: 'stage-1',
                    title: 'Stage one'
                  },
                  {
                    id: 'stage-2',
                    title: 'Stage two',
                  },
                ],
                tasks: [
                  {
                    title: 'Custom',
                    command: 'do-something',
                    stage: 'stage-1',
                  },
                  {
                    title: 'Custom two',
                    command: 'do-something-else',
                    stage: 'stage-2'
                  },
                ],
              },
            },
          },
        }
      })
      expect(result).toEqual([
        {
          title: 'Stage one',
          tasks: [
            {
              root: '',
              files: [],
              packageName: 'root',
              command: 'do-something',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Custom')}`,
            },
          ],
        },
        {
          title: 'Stage two',
          tasks: [
            {
              root: '',
              files: [],
              packageName: 'root',
              command: 'do-something-else',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Custom two')}`,
            },
          ]
        }
      ])
    })

    it('does not add default tasks when there is custom stage definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              scripts: {
                lint: 'do-lint',
                test: 'do-test',
              },
              monotaskr: {
                stages: [
                  {
                    id: 'stage-1',
                    title: 'Stage one'
                  },
                  {
                    id: 'stage-2',
                    title: 'Stage two',
                  },
                ],
              },
            },
          },
        }
      })

      expect(result).toEqual([
        {
          title: 'Stage one',
          tasks: [],
        },
        {
          title: 'Stage two',
          tasks: []
        }
      ])
    })

    it('throws an error when custom stages are defined and a task does not match the stage definitions', async () => {
      const arg = {
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              monotaskr: {
                stages: [
                  {
                    id: 'stage-1',
                    title: 'Stage one'
                  },
                  {
                    id: 'stage-2',
                    title: 'Stage two',
                  },
                ],
                tasks: [
                  {
                    title: 'Custom',
                    command: 'do-something',
                  },
                ],
              },
            },
          },
        }
      }

      await expect(async () => await transformer(arg)).rejects.toThrow()
    })

    it('adds all files for default root stage', async () => {
      const result = await transformer({
        files: [
          'file-1.js',
          'file-2.js',
        ],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              scripts: {
                test: 'do-test',
              },
            },
          },
        }
      })

      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [
            {
              command: 'npm run test',
              files: ['file-1.js', 'file-2.js'],
              packageName: 'root',
              root: '',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Test')}`,
            }
          ],
        },
      ])
    })

    it('adds all files for a custom stage task in the root', async () => {
      const result = await transformer({
        files: [
          'file-1.js',
          'file-2.js',
        ],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              monotaskr: {
                stages: [
                  {
                    title: 'Custom tasks',
                    id: 'custom',
                  },
                ],
                tasks: [
                  {
                    title: 'Task one',
                    command: 'do-this',
                    stage: 'custom',
                  },
                ],
              },
            },
          },
        }
      })

      expect(result).toEqual([
        {
          title: 'Custom tasks',
          tasks: [
            {
              command: 'do-this',
              files: ['file-1.js', 'file-2.js'],
              packageName: 'root',
              root: '',
              title: `${chalk.italic.gray('root')}: ${chalk.bold('Task one')}`,
            },
          ],
        },
      ])
    })
  })

  describe('with workspaces', () => {
    it('creates default stages with empty tasks when no matching scripts are defined', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
              },
            },
          ],
        },
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [],
        },
        {
          title: 'Workspace tasks',
          tasks: [],
        },
      ])
    })

    it('creates a lint task when it finds a matching script definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                scripts: {
                  lint: 'do-lint',
                },
              },
            },
          ],
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [],
        },
        {
          title: 'Workspace tasks',
          tasks: [
            {
              root: 'ws1',
              files: [],
              packageName: 'ws1',
              command: 'npm run lint -- {files}',
              title: `${chalk.italic.gray('ws1')}: ${chalk.bold('Lint')}`,
            },
          ],
        }
      ])
    })

    it('creates a typecheck task when it finds a matching script definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                scripts: {
                  typecheck: 'do-typecheck',
                },
              },
            },
          ],
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [],
        },
        {
          title: 'Workspace tasks',
          tasks: [
            {
              root: 'ws1',
              files: [],
              packageName: 'ws1',
              command: 'npm run typecheck',
              title: `${chalk.italic.gray('ws1')}: ${chalk.bold('Typecheck')}`,
            },
          ],
        }
      ])
    })

    it('creates a test task when it finds a matching script definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                scripts: {
                  test: 'do-test',
                },
              },
            },
          ],
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [],
        },
        {
          title: 'Workspace tasks',
          tasks: [
            {
              root: 'ws1',
              files: [],
              packageName: 'ws1',
              command: 'npm run test',
              title: `${chalk.italic.gray('ws1')}: ${chalk.bold('Test')}`,
            },
          ],
        }
      ])
    })

    it('applies custom task definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                monotaskr: {
                  tasks: [
                    {
                      title: 'Task one',
                      command: 'do-something',
                    },
                  ],
                },
              },
            },
          ],
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [],
        },
        {
          title: 'Workspace tasks',
          tasks: [
            {
              root: 'ws1',
              files: [],
              packageName: 'ws1',
              command: 'do-something',
              title: `${chalk.italic.gray('ws1')}: ${chalk.bold('Task one')}`,
            },
          ],
        }
      ])
    })

    it('throws an error when a task does not match the stage definitions', async () => {
      const arg = {
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                monotaskr: {
                  tasks: [
                    {
                      title: 'Task one',
                      command: 'do-something',
                      stage: 'invalid',
                    },
                  ],
                },
              },
            },
          ],
        }
      }
      await expect(async () => await transformer(arg)).rejects.toThrow()
    })

    it('applies custom stage definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
              monotaskr: {
                stages: [
                  {
                    id: 'custom',
                    title: 'Custom tasks',
                  },
                ],
              },
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                monotaskr: {
                  tasks: [
                    {
                      title: 'Task one',
                      command: 'do-something',
                      stage: 'custom',
                    },
                  ],
                },
              },
            },
          ],
        }
      })
      expect(result).toEqual([
        {
          title: 'Custom tasks',
          tasks: [
            {
              root: 'ws1',
              files: [],
              packageName: 'ws1',
              command: 'do-something',
              title: `${chalk.italic.gray('ws1')}: ${chalk.bold('Task one')}`,
            },
          ],
        }
      ])
    })

    it('does not add default tasks when there is custom stage definition', async () => {
      const result = await transformer({
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
              monotaskr: {
                stages: [
                  {
                    id: 'custom',
                    title: 'Custom tasks',
                  },
                ],
              },
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                scripts: {
                  lint: 'do-lint',
                  test: 'do-test',
                }
              },
            },
          ],
        }
      })
      expect(result).toEqual([
        {
          title: 'Custom tasks',
          tasks: [],
        }
      ])
    })

    it('throws an error when custom stages are defined and a task does not match the stage definitions', async () => {
      const arg = {
        files: [],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
              monotaskr: {
                stages: [
                  {
                    id: 'custom',
                    title: 'Custom tasks',
                  },
                ],
              },
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                monotaskr: {
                  tasks: {
                    title: 'Invalid task',
                    command: 'the-attempt',
                    stage: 'invalid',
                  }
                },
                scripts: {
                  lint: 'do-lint',
                  test: 'do-test',
                }
              },
            },
          ],
        }
      }

      await expect(async () => await transform(arg)).rejects.toThrow()
    })

    it('adds only scoped files for default workspace stage', async () => {
      const result = await transformer({
        files: [
          'file-1.js',
          'ws1/file-2.js',
        ],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                scripts: {
                  test: 'do-test',
                }
              },
            },
          ],
        }
      })
      expect(result).toEqual([
        {
          title: 'Root tasks',
          tasks: [],
        },
        {
          title: 'Workspace tasks',
          tasks: [
            {
              root: 'ws1',
              files: ['file-2.js'],
              packageName: 'ws1',
              command: 'npm run test',
              title: `${chalk.italic.gray('ws1')}: ${chalk.bold('Test')}`,
            }
          ],
        }
      ])
    })

    it('adds only scoped files for a custom stage task in a workspace', async () => {
      const result = await transformer({
        files: [
          'file-1.js',
          'ws1/file-2.js',
        ],
        config: {
          main: {
            root: '',
            pjson: {
              name: 'root',
              workspaces: ['ws1'],
              monotaskr: {
                stages: [
                  {
                    id: 'custom',
                    title: 'Custom stage',
                  },
                ],
              },
            },
          },
          workspaces: [
            {
              root: 'ws1',
              pjson: {
                name: 'ws1',
                monotaskr: {
                  tasks: [
                    {
                      title: 'Custom task',
                      command: 'do-something',
                      stage: 'custom',
                    },
                  ],
                },
                scripts: {
                  test: 'do-test',
                }
              },
            },
          ],
        }
      })
      expect(result).toEqual([
        {
          title: 'Custom stage',
          tasks: [
            {
              root: 'ws1',
              files: ['file-2.js'],
              packageName: 'ws1',
              command: 'do-something',
              title: `${chalk.italic.gray('ws1')}: ${chalk.bold('Custom task')}`,
            }
          ],
        }
      ])
    })
  })
})
