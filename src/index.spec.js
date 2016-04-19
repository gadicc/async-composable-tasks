// Thanks
// http://staxmanade.com/2015/11/testing-asyncronous-code-with-mochajs-and-es7-async-await/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import Task from './index';

chai.use(chaiAsPromised);
chai.use(sinonChai);

var should = chai.should();

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
    (() => new Task({})).should.throw();
  });

});

describe('Task - run() and add()', () => {

  it('runs a single func', async () => {
    let completed = false;
    await new Task(() => {
      completed = true;
    }).run();
    completed.should.be.true;
  });

  it('runs a single func with data(run)', async () => {
    let result;
    await new Task((task, data) => {
      result = data;
    }).run(5);
    result.should.equal(5);
  });

  it('runs a single func with data from constructor and run()', async ()=> {
    let result;
    await new Task((task, data) => {
      result = data;
    }, 5).run();
    result.should.equal(5);
  });

  it('catches ~~and rethrows~~ an error on a single func #2', async () => {
    let task = new Task(async () => {
      throw new Error("fake");
    });

    // Can't seem to catch this any other way
    task.run().should.eventually.throw();

    // Difficult to wait until after eventually....
    task = new Task(async () => {
      throw new Error("fake");
    });

    // We asserted above that this throws an error, now we ignore it.
    try { await task.run(); } catch (err) {
      task._err.should.equal(err);
    }

    task._state.should.equal('failed');
    task._status.should.equal('The task has failed due to an error.');
  });

  it('runs a single, added child', async () => {
    let completed = false;
    let task = new Task();

    task.add(() => {
      completed = true;
    });

    await task.run();
    completed.should.be.true;
  });

  it('runs a single, added Task', async() => {
    let completed = false;
    let task = new Task();

    task.add(new Task(() => {
      completed = true;
    }));

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

  describe('setStatus', () => {

    it('throws on a non-string', () => {
      let task = new Task();
      (() => task.setStatus(1)).should.throw();
    });

    it('sets and emits status', () => {
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

  describe('updateProgress', () => {

    it('throws on a non-number or number < 0 or > 1', () => {
      let task = new Task();
      (() => task.updateProgress(1.1)).should.throw();
      (() => task.updateProgress(-1.1)).should.throw();
      (() => task.updateProgress('1')).should.throw();
    });

    it('updates and emits progress', () => {
      let task = new Task();
      let progress = 0;

      task.on('progress', (_progress) => {
        progress = _progress;
      });

      task.updateProgress(.5);
      progress.should.be.equal(.5);
    });

    it('updates multiple times', () => {
      let task = new Task();

      task.updateProgress(.2);
      task._progress.should.be.equal(.2);

      task.updateProgress(.5);
      task._progress.should.be.equal(.5);
    });

  });

  describe('cascading updates', () => {

    it('calls parent\'s _childSetState', () => {
      let parent = new Task();
      let child = new Task();
      parent.add(child);

      let spy = sinon.spy();
      parent.on('childUpdated', spy);
      child._setState('complete');
      spy.should.have.been.called;
    });

    it('emits root\'s _childSetState', () => {
      let parent = new Task();
      let child = new Task();
      parent.add(child);

      let spy = sinon.spy();
      parent.on('treeUpdated', spy);
      child._setState('complete');
      spy.should.have.been.called;
    });

  });

});

describe('exportState', () => {

  let inittedState = {
    name: 'anonymous',
    state: 'declared',
    status: '',
    progress: 0    
  };

  it('exports a task', async () => {
    const task = new Task(() => {});
    task.exportStateTree().should.deep.equal({
      ...inittedState,
      id: task._id
    });
  });

  it('exports a task with a child', () => {
    const task = new Task(() => {});
    task.add(() => {});
    task.exportStateTree().should.deep.equal({
      ...inittedState,
      id: task._id,
      children: [ {
        id: task._children[0]._id,
        ...inittedState
      }]
    });
  });

  it('exports a task running in parallel', async () => {
    const task = new Task(() => {}, [ 1 ]);
    await task.run();
    task.exportStateTree().should.deep.equal({
      id: task._id,
      name: 'anonymous',
      state: 'completed',
      status: '1/1 tasks completed.',
      progress: 1,
      parallel: [ {
        id: task._parallel[0]._id,
        name: 'anonymous',
        state: 'completed',
        status: '',
        progress: 1
      } ]
    });
  });

});