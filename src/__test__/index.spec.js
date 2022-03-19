const fs = require('node:fs/promises');
const path = require('node:path');
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

jest.mock('execa', () => ({
	execa: jest.fn().mockReturnValue(Promise.resolve({
		stdout: '',
	})),
}));

const {execa} = require('execa');
const monotaskr = require('../');

const rootName = 'tmp-test-root';
const root = path.join(__dirname, rootName);

describe('monotaskr', () => {
	beforeEach(async () => {
		await fs.mkdir(root);
	});

	afterEach(async () => {
		await exec('git reset .', {cwd: root});
		await fs.rm(root, {recursive: true});
		execa.mockClear();
	});

	describe('for packages without workspaces', () => {
		describe('without configuration', () => {
			it('does not run any commands when there are no staged files', async () => {
				const rootJson = {
					name: '@root',
					scripts: {
						test: 'do the test',
					},
				};

				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(1);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
			});

			it('does not run any commands when there is no test/lint/typecheck command or custom config', async () => {
				const rootJson = {
					name: '@root',
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: 'package.json',
				}));

				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(1);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
			});

			it('runs the scripts for test/lint/typecheck when they are defined', async () => {
				const rootJson = {
					name: '@root',
					scripts: {
						something: 'do stuff',
						lint: 'do the lint',
						test: 'do the test',
						typecheck: 'do the typecheck',
					},
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: ['package.json', 'index.ts'].join('\n'),
				}));

				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'index.ts'), 'export default {}');
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(4);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'lint', '--', 'index.ts'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'test'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'typecheck'], {cwd: root});
			});

			it('skips typecheck when there are no matching files staged', async () => {
				const rootJson = {
					name: '@root',
					scripts: {
						something: 'do stuff',
						lint: 'do the lint',
						test: 'do the test',
						typecheck: 'do the typecheck',
					},
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: ['package.json', 'index.js'].join('\n'),
				}));

				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'index.js'), 'module.exports = {}');
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(3);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'lint', '--', 'index.js'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'test'], {cwd: root});
			});
		});

		describe('with configuration', () => {
			it('runs the specified tasks', async () => {
				const rootJson = {
					name: '@root',
					monotaskr: {
						tasks: [
							{
								title: 'task 1',
								command: 'do this',
							},
							{
								title: 'task 2',
								command: 'do that',
							},
						],
					},
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: 'package.json',
				}));

				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(3);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('do', ['this'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('do', ['that'], {cwd: root});
			});

			it('uses custom stages in the specified order', async () => {
				const rootJson = {
					monotaskr: {
						stages: [
							{
								title: 'stage one',
								id: '1',
							},
							{
								title: 'stage two',
								id: '2',
							},
						],
						tasks: [
							{
								title: 'task 1',
								command: 'do this',
								stage: '2',
							},
							{
								title: 'task 2',
								command: 'do that first',
								stage: '1',
							},
						],
					},
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: 'package.json',
				}));

				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(3);
				expect(execa.mock.calls[0]).toEqual(['git', ['diff', '--name-only', '--cached'], {cwd: root}]);
				expect(execa.mock.calls[1]).toEqual(['do', ['that', 'first'], {cwd: root}]);
				expect(execa.mock.calls[2]).toEqual(['do', ['this'], {cwd: root}]);
			});

			it('matches patterns in file names to custom task criteria', async () => {
				const rootJson = {
					monotaskr: {
						tasks: [
							{
								title: 'task 1',
								command: 'do this {files}',
								match: '*.xy',
							},
							{
								title: 'task 2',
								command: 'do that {files}',
								match: '*.{xx,yy}',
							},
							{
								title: 'task 3',
								command: 'do all {files}',
							},
							{
								title: 'task 4',
								command: 'do something',
								match: 'unmatched',
							},
						],
					},
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: ['this.xy', 'that.xx', 'that.yy', 'other.js'].join('\n'),
				}));

				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'this.xy'), '');
				await fs.writeFile(path.join(root, 'that.xx'), '');
				await fs.writeFile(path.join(root, 'that.yy'), '');
				await fs.writeFile(path.join(root, 'other.js'), '');
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(4);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('do', ['this', 'this.xy'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('do', ['that', 'that.xx', 'that.yy'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('do', ['all', 'this.xy', 'that.xx', 'that.yy', 'other.js'], {cwd: root});
			});
		});
	});

	describe('for packages with workspaces', () => {
		describe('without configuration', () => {
			it('does not run any commands when the workspace does not have staged files', async () => {
				const rootJson = {
					name: '@root',
					workspaces: ['w1', 'w2'],
				};
				const w1Json = {
					name: '@root/w1',
					scripts: {
						test: 'do the test',
					},
				};
				const w2Json = {
					name: '@root/w2',
					scripts: {
						test: 'do the test',
					},
				};

				await fs.mkdir(path.join(root, 'w1'));
				await fs.mkdir(path.join(root, 'w2'));
				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'w1', 'package.json'), JSON.stringify(w1Json));
				await fs.writeFile(path.join(root, 'w2', 'package.json'), JSON.stringify(w2Json));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(1);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
			});

			it('does not run any commands when there is no test/lint/typecheck command or custom config', async () => {
				const rootJson = {
					name: '@root',
					workspaces: ['w1', 'w2'],
				};
				const w1Json = {
					name: '@root/w1',
				};
				const w2Json = {
					name: '@root/w2',
				};

				await fs.mkdir(path.join(root, 'w1'));
				await fs.mkdir(path.join(root, 'w2'));
				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'w1', 'package.json'), JSON.stringify(w1Json));
				await fs.writeFile(path.join(root, 'w2', 'package.json'), JSON.stringify(w2Json));
				await exec('git add .', {cwd: root});
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(1);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
			});

			it('runs the scripts for test/lint/typecheck when they are defined', async () => {
				const rootJson = {
					name: '@root',
					workspaces: ['w1', 'w2'],
				};
				const w1Json = {
					name: '@root/w1',
					scripts: {
						something: 'do stuff',
						lint: 'do the lint',
						test: 'do the test',
						typecheck: 'do the typecheck',
					},
				};
				const w2Json = {
					name: '@root/w2',
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: [
						'package.json',
						'w1/package.json',
						'w1/index.ts',
						'w2/package.json',
					].join('\n'),
				}));

				await fs.mkdir(path.join(root, 'w1'));
				await fs.mkdir(path.join(root, 'w2'));
				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'w1', 'package.json'), JSON.stringify(w1Json));
				await fs.writeFile(path.join(root, 'w2', 'package.json'), JSON.stringify(w2Json));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(4);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'lint', '--', 'index.ts'], {cwd: path.join(root, 'w1')});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'test'], {cwd: path.join(root, 'w1')});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'typecheck'], {cwd: path.join(root, 'w1')});
			});

			it('skips lint when there are not matching staged files', async () => {
				const rootJson = {
					name: '@root',
					workspaces: ['w1', 'w2'],
				};
				const w1Json = {
					name: '@root/w1',
					scripts: {
						something: 'do stuff',
						lint: 'do the lint',
						test: 'do the test',
						typecheck: 'do the typecheck',
					},
				};
				const w2Json = {
					name: '@root/w2',
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: ['package.json', 'w1/package.json', 'w2/package.json'].join('\n'),
				}));

				await fs.mkdir(path.join(root, 'w1'));
				await fs.mkdir(path.join(root, 'w2'));
				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'w1', 'package.json'), JSON.stringify(w1Json));
				await fs.writeFile(path.join(root, 'w2', 'package.json'), JSON.stringify(w2Json));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(2);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'test'], {cwd: path.join(root, 'w1')});
			});

			it('skips typecheck when there are not matching staged files', async () => {
				const rootJson = {
					name: '@root',
					workspaces: ['w1', 'w2'],
				};
				const w1Json = {
					name: '@root/w1',
					scripts: {
						something: 'do stuff',
						lint: 'do the lint',
						test: 'do the test',
						typecheck: 'do the typecheck',
					},
				};
				const w2Json = {
					name: '@root/w2',
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: ['package.json', 'w1/package.json', 'w1/index.js', 'w2/package.json'].join('\n'),
				}));

				await fs.mkdir(path.join(root, 'w1'));
				await fs.mkdir(path.join(root, 'w2'));
				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'w1', 'package.json'), JSON.stringify(w1Json));
				await fs.writeFile(path.join(root, 'w2', 'package.json'), JSON.stringify(w2Json));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(3);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'lint', '--', 'index.js'], {cwd: path.join(root, 'w1')});
				expect(execa).toHaveBeenCalledWith('npm', ['run', 'test'], {cwd: path.join(root, 'w1')});
			});
		});

		describe('with configuration', () => {
			it('runs the specified tasks', async () => {
				const rootJson = {
					name: '@root',
					workspaces: ['w1', 'w2'],
				};
				const w1Json = {
					name: '@root/w1',
					monotaskr: {
						tasks: [
							{
								title: 'task one',
								command: 'do this',
							},
							{
								title: 'task two',
								command: 'do that',
							},
						],
					},
				};
				const w2Json = {
					name: '@root/w2',
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: ['package.json', 'w1/package.json', 'w1/index.js', 'w2/package.json'].join('\n'),
				}));

				await fs.mkdir(path.join(root, 'w1'));
				await fs.mkdir(path.join(root, 'w2'));
				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'w1', 'package.json'), JSON.stringify(w1Json));
				await fs.writeFile(path.join(root, 'w1', 'index.js'), 'module.exports = {}');
				await fs.writeFile(path.join(root, 'w2', 'package.json'), JSON.stringify(w2Json));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(3);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('do', ['this'], {cwd: path.join(root, 'w1')});
				expect(execa).toHaveBeenCalledWith('do', ['that'], {cwd: path.join(root, 'w1')});
			});

			it('uses custom stages in the specified order', async () => {
				const rootJson = {
					name: '@root',
					workspaces: ['w1', 'w2'],
					monotaskr: {
						stages: [
							{
								title: 'stage one',
								id: '1',
							},
							{
								title: 'stage two',
								id: '2',
							},
							{
								title: 'stage three',
								id: '3',
							},
						],
						tasks: [
							{
								title: 'root task',
								command: 'rooting',
								stage: '2',
							},
						],
					},
				};

				const w1Json = {
					name: '@root/w1',
					monotaskr: {
						tasks: [
							{
								title: 'task one',
								command: 'do this',
								stage: '3',
							},
							{
								title: 'task two',
								command: 'do that with {files}',
								stage: '1',
							},
						],
					},
				};
				const w2Json = {
					name: '@root/w2',
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: [
						'package.json',
						'w1/package.json',
						'w1/index.js',
						'w2/package.json',
					].join('\n'),
				}));

				await fs.mkdir(path.join(root, 'w1'));
				await fs.mkdir(path.join(root, 'w2'));
				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'w1', 'index.js'), 'module.exports = {}');
				await fs.writeFile(path.join(root, 'w1', 'package.json'), JSON.stringify(w1Json));
				await fs.writeFile(path.join(root, 'w2', 'package.json'), JSON.stringify(w2Json));
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(4);
				expect(execa.mock.calls[0]).toEqual(['git', ['diff', '--name-only', '--cached'], {cwd: root}]);
				expect(execa.mock.calls[1]).toEqual(['do', ['that', 'with', 'package.json', 'index.js'], {cwd: path.join(root, 'w1')}]);
				expect(execa.mock.calls[2]).toEqual(['rooting', [], {cwd: root}]);
				expect(execa.mock.calls[3]).toEqual(['do', ['this'], {cwd: path.join(root, 'w1')}]);
			});

			it('matches patterns in file names to custom task criteria', async () => {
				const rootJson = {
					name: '@root',
					workspaces: ['w1', 'w2'],
					monotaskr: {
						tasks: [
							{
								title: 'root task',
								command: 'do w1 json {files}',
								match: 'w1/*.json',
							},
						],
					},
				};

				const w1Json = {
					name: '@root/w1',
					monotaskr: {
						tasks: [
							{
								title: 'task one/1',
								command: 'do all w1 {files}',
							},
							{
								title: 'task one/2',
								command: 'do w1 js {files}',
								match: '*.js',
							},
							{
								title: 'task one/3',
								command: 'do skip',
								match: 'nothing',
							},
						],
					},
				};

				const w2Json = {
					name: '@root/w2',
					monotaskr: {
						tasks: [
							{
								title: 'task two/1',
								command: 'do w2 ts {files}',
								match: '*.ts',
							},
						],
					},
				};

				execa.mockReturnValueOnce(Promise.resolve({
					stdout: [
						'package.json',
						'w1/package.json',
						'w1/index.js',
						'w1/other.file',
						'w2/package.json',
						'w2/index.ts',
					].join('\n'),
				}));

				await fs.mkdir(path.join(root, 'w1'));
				await fs.mkdir(path.join(root, 'w2'));
				await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(rootJson));
				await fs.writeFile(path.join(root, 'w1', 'index.js'), 'module.exports = {}');
				await fs.writeFile(path.join(root, 'w1', 'other.file'), '');
				await fs.writeFile(path.join(root, 'w1', 'package.json'), JSON.stringify(w1Json));
				await fs.writeFile(path.join(root, 'w2', 'package.json'), JSON.stringify(w2Json));
				await fs.writeFile(path.join(root, 'w2', 'index.ts'), 'export default {}');
				await monotaskr({cwd: root});

				expect(execa).toHaveBeenCalledTimes(5);
				expect(execa).toHaveBeenCalledWith('git', ['diff', '--name-only', '--cached'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('do', ['w1', 'json', 'w1/package.json'], {cwd: root});
				expect(execa).toHaveBeenCalledWith('do', ['all', 'w1', 'package.json', 'index.js', 'other.file'], {cwd: path.join(root, 'w1')});
				expect(execa).toHaveBeenCalledWith('do', ['w1', 'js', 'index.js'], {cwd: path.join(root, 'w1')});
				expect(execa).toHaveBeenCalledWith('do', ['w2', 'ts', 'index.ts'], {cwd: path.join(root, 'w2')});
			});
		});
	});
});
