# monotaskr

A configurable task runner for npm packages and workspaces.

## Install

```
npm install monotaskr
```

## Usage

The recommended way for using `monotaskr` is with [husky](https://github.com/typicode/husky). You can call it as a hook from your `.husky/pre-commit` file as:

```
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

./node_modules/.bin/monotaskr
```

## Configuration

The library provides an opinionated default configuration, when you don't define anything custom (see examples below), then it will try to run the following three npm scripts (if they exist): `npm run test`, `npm run lint`, `npm run typecheck` for your root and for the npm workspaces if any.


You can create your custom configuration. The configuration needs to be in your package json under the `monotaskr` key, following this structure:

```
"monotaskr": {
  stages?: [...],
  tasks: [...],
}
```

The library runs tasks in stages, which follow each other, the tasks within each stage are run concurrently.

#### Stages

You can define stages only in your root package json. The tasks picked up from the directory tree will then be assigned to a stage before being executed to determine the desired timing. A stages definition takes a title and an id.

The default stage configuration (if you don't define custom stages) is the following:

```
"monotaskr": {
  "stages": [
    {
      "title": "Root tasks",
      "id": "root"
    },
    {
      "title": "Workspace tasks",
      "id": "ws"
    }
  ]
}
```

Stages are executed in the order of definition. By default, tasks found in your root package json will be assigned to the `root` stage (they run first), and tasks in your workspaces will get the `ws` stage id.

#### Tasks

You can define tasks in your root package json, or in a workspace package json. Tasks within a stage always run concurrently. These are the default tasks assigned to all the packages without custom configuration:

```
"monotaskr": {
  "tasks": [
    {
      "title": "Test",
      "command": "npm run test",
      "stage": "ws" // assuming this is a workspace package, otherwise the stage value will be "root"
    },
    {
      "title": "Lint",
      "command": "npm run lint -- {files}",
      "match": "*.{js|jsx|ts|tsx}",
      "stage": "ws" // assuming this is a workspace package, otherwise the stage value will be "root"
    },
    {
      "title": "Typecheck",
      "command": "npm run typecheck",
      "match": "*.{ts|tsx}",
      "stage": "ws" // assuming this is a workspace package, otherwise the stage value will be "root"  
    }
  ]
}
```

The task definition is composed of the following fields:

- _title_: will be used to display the task in the CLI.
- _command_: an executable; you can use the `{files}` as a template string, it will be replaced with the currently staged files in the package, separated by a space.
- _stage_: optional, it will be assigned automatically `root` or `ws` depending on whether your package is the root or a workspace.
- _match_: optional, takes a [glob](https://en.wikipedia.org/wiki/Glob_%28programming%29) as a value to be able to target specific commands to execute only when they qualify the pattern.
