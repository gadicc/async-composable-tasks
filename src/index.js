// XXX make a peer dep and add to docs
import 'babel-polyfill';
import crypto from 'crypto';

import { EventEmitter2 } from 'eventemitter2';

class Task extends EventEmitter2 {

  constructor(funcOrName, data, parent) {
    super();

    this._state = 'declared';
    this._status = '';
    this._progress = 0;
    this._children = [];
    this._childIndex = 0;
    this._data = data;
    this._id = crypto.randomBytes(3).toString('hex');

    this.parent = parent;

    if (typeof funcOrName === 'string') {
      this.name = funcOrName;
    } else if (typeof funcOrName === 'function') {
      this._func = funcOrName;
      this.name = funcOrName.name || 'anonymous';
    } else if (typeof funcOrName === 'undefined') {
      this.name = 'anonymous';
    } else {
      throw new Error("new Task(funcOrName) expects a string or func");
    }

    this._idPath = parent ? parent._idPath : '' + '/' + this._id;
    this._namedPath = parent ? parent._namedPath : '' + '/' + this._name;
  }

  /**
   * Runs the task, first by evaluating it's func (if it has one), and then by
   * running it's children (which may have been added by the func also).
   */
  async run(data) {
    if (!data && this._data) data = this._data;
    else if (!this._data && data) this._data = data;

    if (this._func) {
      if (!Array.isArray(data)) {
        try {
          await this._func(this, data);
          this.updateProgress(1);
          this._setState('completed');
        } catch (err) {
          this._err = err; // <-- set before callbacks are run
          this.setStatus('The task has failed due to an error.');
          this._setState('failed');

          console.log(this._idPath);
          console.log(this._namedPath);
          console.log(err);
          // for now, maybe on('err') in future
          throw err;
        }
      } else {
        this._parallel = data.map(data => new Task(this._func, data, this));
        let promises = this._parallel.map(task => task.run());
        let errors = [], completes = 0;
        for (let promise of promises)
          try {
            await promise;
            this.updateProgress(++completes/data.length);
            this.setStatus(`${completes}/${data.length} tasks completed.`);
            if (completes === data.length)
              this._setState('completed');
          } catch (err) {
            errors.push(err);
          }
        if (errors.length) {
          this._setState('failed');
          this.setStatus (`${errors.length}/${data.length} tasks failed, the `
            + 'rest completed.');
        }
      }
    }

    // if (this._state === 'completed')
      for (let child of this._children)
        await child.run();
  }

  add(funcOrTask, data) {
    if (funcOrTask instanceof Task) {
      if (!funcOrTask.parent)
        funcOrTask.parent = this;
      else if (funcOrTask.parent !== this)
        throw new Error("Trying to add a task with wrong parent");
      this._children.push(funcOrTask);
    } else {
      this._children.push(new Task(funcOrTask, data, this));
    }
    return this;
  }

  /* --- */

  _childWasUpdated(child) {
    this.emit('childUpdated', child);

    if (this.parent)
      this.parent._childWasUpdated(child);
    else
      this.emit('treeUpdated');
  }

  _setState(state) {
    this._state = state;
    this.emit('state', state);
    if (this.parent)
      this.parent._childSetState(this, state);
    else
      this.emit('treeUpdated');
  }

  _childSetState(child, state) {
    this._childWasUpdated(child);
  }

  updateProgress(progress) {
    if (typeof progress !== 'number' || progress < 0 || progress > 1)
      throw new Error("updateProgress(number) expects a number from 0 to 1 "
        + "(inclusive)");
    this._progress = progress;
    this.emit('progress', progress);
    if (this.parent)
      this.parent._childUpdateProgress(this, progress);
    else
      this.emit('treeUpdated');
  }

  _childUpdateProgress(child, progress) {
    this._childWasUpdated(child);
  }

  setStatus(status) {
    if (typeof status !== 'string')
      throw new Error("setStatus(string) expects a string, not "
        + typeof status);
    this._status = status;
    this.emit('status', status);
    if (this.parent)
      this.parent._childSetStatus(this, status);
    else
      this.emit('treeUpdated');
  }

  _childSetStatus(child, status) {
    this._childWasUpdated(child);
  }

  /* --- */

  /*
   * This generates a new tree from scratch.  Ideally we'd want to
   * patch updates in place, but maybe not worth the effort for a likely
   * small tree.
   */
  exportStateTree() {
    let result = {
      id: this._id,
      name: this.name,
      state: this._state,
      status: this._status,
      progress: this._progress
    };

    if (this._parallel)
      result.parallel = this._parallel.map(task => task.exportStateTree());

    if (this._children.length)
      result.children = this._children.map(task => task.exportStateTree());

    return result;
  }

}

export default Task;