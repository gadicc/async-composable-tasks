import chai from 'chai';
import Task from './index';

const should = chai.should(); 

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('Task - constructor()', () => {

  it('accepts a named func', () => {
    var func = function func() {};
    var task = new Task(func);
    task._func.should.equal(func);
    task.name.should.equal('func');
  });

  it('accepts an anonymous func', () => {
    var func = function() {};
    var task = new Task(func);
    task._func.should.equal(func);
    // should be anonymous but hard in babel env to do a real anon func
    task.name.should.equal('func');
  });

  it('accepts no func', () => {
    var task = new Task();
    should.not.exist(task._func);
    task.name.should.equal('anonymous');
  });

  it('accepts a string name', () => {
    var task = new Task('name');
    should.not.exist(task._func);
    task.name.should.equal('name');
  });

  it('throws on any other arguments', () => {
    (function() {
      new Task({});
    }).should.throw();
  });


});

describe('Task - run()', () => {

  it('runs a single func', async () => {
    let completed = false;
    await new Task(() => {
      completed = true;
    }).run();
    completed.should.be.true;
  });

  it('runs a single child', async () => {
    let completed = false;
    let task = new Task();

    task.add(() => {
      completed = true;
    });

    await task.run();
    completed.should.be.true;
  });

  it('runs multiple children in sequence', async () => {
    let result = [];
    let task = new Task();

    task.add(() => {
      result.push(1);
    }).add(() => {
      result.push(2);
    }).add(() => {
      result.push(3);
    });

    await task.run();
    result.should.deep.equal([1,2,3]);
  });

  it('runs children with multiple data contexts', async () => {
    let result = [];
    let task = new Task();

    task.add(async (task, data) => {
      result.push(data);
    }, [ 1, 2, 3 ]);

    await task.run();
    result.should.deep.equal([1,2,3]);
  });

  it('runs children with multiple data contexts in parallel', async () => {
    let result = [];
    let task = new Task();

    task.add(async (task, data) => {
      await sleep(data);
      result.push(data);
    }, [ 30, 10, 20 ]);

    await task.run();
    result.should.deep.equal([10,20,30]);
  });

});

describe('Task - setters and events', () => {

  it('updates and emits progress', () => {
    let task = new Task();
    let progress = 0;

    task.on('progress', (_progress) => {
      progress = _progress;

    });

    task.updateProgress(50);
    progress.should.be.equal(50);
  });

  it('sets and emits progress', () => {
    let task = new Task();
    let status;
    let desiredStatus = 'Building docker container';

    task.on('status', (_status) => {
      status = _status;

    });

    task.setStatus(desiredStatus);
    status.should.be.equal(desiredStatus);
  });

});
