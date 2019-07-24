import { POUCH_DATA_DELETED } from '../actions/pouch-action-creators';
import { WORKER_DATA } from '../actions/worker-action-creators';
import {
  FETCH_ENCODING,
  FETCH_ENCODING_SUCCESS,
  FETCH_ENCODING_ERROR
} from '../actions/encoding-action-creators';

/**
 * Batch together action of type `type` by chunk of `delay` ms
 */
class Bufferer {
  constructor(type, delay = 200) {
    this.type = type;
    this.delay = delay;
    this.lastCallTime = new Date().getTime();
    this.actions = [];
    this.timeoutId = null;
  }

  buffer(action, next) {
    const now = new Date().getTime();
    const lastCallTime = this.lastCallTime;
    this.lastCallTime = now;

    if (now - lastCallTime < this.delay) {
      this.actions = this.actions.concat(action);
      if (this.timeoutId == null) {
        this.timeoutId = setTimeout(() => {
          next({
            type: this.type,
            payload: this.actions,
            buffered: true
          });
          this.actions = [];
          this.timeoutId = null;
        }, this.delay);
      }
      return true;
    } else if (this.actions.length) {
      clearTimeout(this.timeoutId);
      next({
        type: this.type,
        payload: this.actions.concat(action),
        buffered: true
      });
      this.actions = [];
      this.timeoutId = null;
      return true;
    }
  }
}

const workerBufferer = new Bufferer(WORKER_DATA);
const deletionBufferer = new Bufferer(POUCH_DATA_DELETED, 1000);
const fetchEncodingBufferer = new Bufferer(FETCH_ENCODING_SUCCESS, 200);
const fetchEncodingSuccessBufferer = new Bufferer(FETCH_ENCODING_SUCCESS, 1000);
const fetchEncodingErrorBufferer = new Bufferer(FETCH_ENCODING_ERROR, 1000);

// debugging convenience
if (
  window.location.hostname === 'nightly.sci.pe' ||
  process.env.NODE_ENV === 'development'
) {
  window.workerBufferer = workerBufferer;
  window.deletionBufferer = deletionBufferer;
  window.fetchEncodingSuccessBufferer = fetchEncodingSuccessBufferer;
}

export default function(store) {
  return function(next) {
    return function(action) {
      if (action && action.type) {
        if (action.type === POUCH_DATA_DELETED) {
          if (deletionBufferer.buffer(action, next)) {
            return;
          }
        } else if (action.type === WORKER_DATA) {
          if (workerBufferer.buffer(action, next)) {
            return;
          }
        } else if (action.type === FETCH_ENCODING) {
          if (fetchEncodingBufferer.buffer(action, next)) {
            return;
          }
        } else if (action.type === FETCH_ENCODING_SUCCESS) {
          if (fetchEncodingSuccessBufferer.buffer(action, next)) {
            return;
          }
        } else if (action.type === FETCH_ENCODING_ERROR) {
          if (fetchEncodingErrorBufferer.buffer(action, next)) {
            return;
          }
        }
      }
      return next(action);
    };
  };
}
