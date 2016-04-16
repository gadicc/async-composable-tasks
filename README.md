# composable-async-tasks

Composable, async tasks built for await/async and arrow functions, with progress and parallelism.  Realtime views for React.

[![Circle CI](https://circleci.com/gh/gadicc/composable-async-tasks.svg?style=shield)](https://circleci.com/gh/gadicc/composable-async-tasks) [![Coverage Status](https://coveralls.io/repos/github/gadicc/composable-async-tasks/badge.svg?branch=master)](https://coveralls.io/github/gadicc/composable-async-tasks?branch=master) ![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

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

startServer 45/60 [=====================                ]
  forEachServer 2/3 [=========================          ]
    downloadDockerImage

function startApp(task) {
  task.addParallel(startServer, servers);  
}

function startServer(task, data) {
  task.add(downloadDockerImage, data);
  task.add(buildDockerContainer, data);
  task.add(launchContainer, data);
}

new Task('startApp', startApp)
  .on('status', updateStatus)
  .on('complete', doSomething)
  .run();


what about cases where we want stuff run in parallel and want another task to depend on a previous instance?  as opposed to currently where we can run a single task multiple times in parallel, wait for all of those to finish, and then move on.

e.g. wasn't relevant, so far no need for this.