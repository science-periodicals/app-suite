import { POUCH_DATA_DELETED } from '../actions/pouch-action-creators';
import { WORKER_DATA } from '../actions/worker-action-creators';
import {
  FETCH_ENCODING,
  FETCH_ENCODING_SUCCESS,
  FETCH_ENCODING_ERROR
} from '../actions/encoding-action-creators';

// See also `annotation-middleware` for annotation specific logic

/**
 * Batch together action of type `type` by chunk of `delay` ms
 */
class Batcher {
  constructor(type, delay = 200) {
    this.type = type;
    this.delay = delay;
    this.actions = [];
    this.timeoutId = null;
    this.lastCallTime = null;
  }

  /**
   * returns `true` if the action has been batched
   */
  batch(action, next) {
    const now = new Date().getTime();
    const lastCallTime =
      this.timeoutId == null ? now : this.lastCallTime || now;
    this.lastCallTime = now;

    if (now - lastCallTime < this.delay || this.timeoutId == null) {
      this.actions.push(action);
      if (this.timeoutId == null) {
        this.timeoutId = setTimeout(() => {
          next({
            type: this.type,
            payload: this.actions.slice(),
            buffered: true
          });
          this.actions = [];
          this.lastCallTime = null;
          this.timeoutId = null;
        }, this.delay);
      }
      return true;
    }
  }
}

const workerBatcher = new Batcher(WORKER_DATA);
const deletionBatcher = new Batcher(POUCH_DATA_DELETED, 1000);
const fetchEncodingBatcher = new Batcher(FETCH_ENCODING_SUCCESS, 1000);
const fetchEncodingSuccessBatcher = new Batcher(FETCH_ENCODING_SUCCESS, 1000);
const fetchEncodingErrorBatcher = new Batcher(FETCH_ENCODING_ERROR, 1000);

// debugging convenience
if (
  window.location.hostname === 'nightly.sci.pe' ||
  process.env.NODE_ENV === 'development'
) {
  window.workerBatcher = workerBatcher;
  window.deletionBatcher = deletionBatcher;
  window.fetchEncodingSuccessBatcher = fetchEncodingSuccessBatcher;
}

export default function bufferer(store) {
  return function(next) {
    return function(action) {
      if (action && action.type && !action.immediate) {
        if (action.type === POUCH_DATA_DELETED) {
          if (deletionBatcher.batch(action, next)) {
            return;
          }
        } else if (action.type === WORKER_DATA) {
          if (workerBatcher.batch(action, next)) {
            return;
          }
        } else if (action.type === FETCH_ENCODING) {
          if (fetchEncodingBatcher.batch(action, next)) {
            return;
          }
        } else if (action.type === FETCH_ENCODING_SUCCESS) {
          if (fetchEncodingSuccessBatcher.batch(action, next)) {
            return;
          }
        } else if (action.type === FETCH_ENCODING_ERROR) {
          if (fetchEncodingErrorBatcher.batch(action, next)) {
            return;
          }
        }
      }
      return next(action);
    };
  };
}
