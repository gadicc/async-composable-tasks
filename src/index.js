// XXX make a peer dep and add to docs
import 'babel-polyfill';

import { EventEmitter2 } from 'eventemitter2';

class Task extends EventEmitter2 {

  constructor(funcOrName, parent) {
    super();

    this._state = 'declared';
    this._status = '';
    this._progress = 0;
    this._children = [];
    this._childIndex = 0;

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
  }

  /**
   * Runs the task, first by evaluating it's func (if it has one), and then by
   * running it's children (which may have been added by the func also).
   */
  async run(data) {
    if (this._func) {
      if (!Array.isArray(data)) {
        try {
          await this._func(this, data);
        } catch (err) {
          this._state = 'failed';
          this._status = '';
          // getParentChain, etc.
          // for now, probably on('err') in future
          throw err;
        }
      } else {
        let promises = data.map(data => this._func(this, data));
        for (let promise of promises)
          try {
            await promise;
          } catch (err) {
            throw err;
          }
      }
    }

    for (let i = 0; i < this._children.length; i++) {
      let child = this._children[i];
      if (child.func instanceof Task)
        await child.func.run(child.data, child);
      else
        await new Task(child.func, this).run(child.data);
    }

  }

  add(func, data) {
    this._children.push({
      func: func,
      data: data
    });

    return this;
  }

  updateProgress(progress) {
    this._progress = progress;
    this.emit('progress', progress);
  }

  setStatus(status) {
    this._status = status;
    this.emit('status', status);
  }

}

export default Task;