import isClient from 'is-client';

export default class RpcWorker {
  constructor(workerUrl, opts = {}) {
    this.worker = isClient() ? new Worker(workerUrl) : {};
    this.callbacks = {};
    this.worker.onmessage = e => {
      if (e.error) return console.error(e.error);
      const res = e.data;
      if (res['@id'] in this.callbacks) {
        if (res.error) {
          this.callbacks[res['@id']](new Error(res.error));
        } else {
          this.callbacks[res['@id']](null, res);
        }
        delete this.callbacks[res['@id']];
      }
    };
  }

  dispatch(data, callback) {
    this.callbacks[data['@id']] = callback;
    this.worker.postMessage(data);
  }

  abort(data) {
    delete this.callbacks[data['@id']];
  }
}
