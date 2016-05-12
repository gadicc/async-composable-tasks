# async-composable-tasks

Asynchronous, composable tasks built for await/async and arrow functions, with progress and parallelism.  Realtime views for React.

[![Circle CI](https://circleci.com/gh/gadicc/async-composable-tasks.svg?style=shield)](https://circleci.com/gh/gadicc/async-composable-tasks) [![Coverage Status](https://coveralls.io/repos/github/gadicc/async-composable-tasks/badge.svg?branch=master)](https://coveralls.io/github/gadicc/async-composable-tasks?branch=master) ![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

Copyright (c) 2016 Gadi Cohen &lt;dragon@wastelands.net&gt;, released under the MIT license.

## Design Goals

1. Composable - tasks can themselves adds tasks, that are executed in serial or parallel.
1. Async - tasks return Promises that can be used with async/wait.
1. Data - tasks can run a single func with multiple data contexts in parallel.

## Example

```js
var task = new Task();

task.add({
  
});

task.on('status', ...);

task.run();
```

```
startServer 45/60 [=====================                ]
  forEachServer 2/3 [=========================          ]
    downloadDockerImage
```

```js
await new Task(startApp).run(appData);

// We could use inline arrow functions, but declaring our functions just once
// in the root scope is more efficient, and Task() makes use of the function
// name.  This convention is better for commonly run functions.

function startApp(task, appData) {
  const servers = await db.fetch(...);

  // servers is an array, so this will run startServer() with each of the
  // values in the array in parallel.
  task.add(startServer, servers);

  // this task will only be run when all the parallel tasks have finished
  task.add(updateAppStatus, appData);
}

function startServer(task, data) {
  task.add(downloadDockerImage, data);
  task.add(buildDockerContainer, data);
  task.add(launchContainer, data);
}
```

what about cases where we want stuff run in parallel and want another task to depend on a previous instance?  as opposed to currently where we can run a single task multiple times in parallel, wait for all of those to finish, and then move on.

e.g. wasn't relevant, so far no need for this.

TODO

run taskA after taskB
run taskC after taskB in parallel
i.e. on taskB complete check children for 'after' field