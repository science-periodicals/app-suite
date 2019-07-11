import isEmpty from 'lodash/isEmpty';
import {
  BULK_ANNOTATIONS,
  POSITION_ANNOTATIONS,
  repositionAnnotations,
  reLayoutAnnotations
} from '../actions/annotation-action-creators';
import { isSelectorEqual } from '../utils/annotations';

/**
 * This class helps to minimize the CPU burden associated with positioning
 * the annotation.
 *
 * Problem: each `<Annotable />` instance (a lot of them) fire
 * POSITION_ANNOTATIONS action so that the annotation are positioned. The
 * `AnnotableManager` class batch those and allow the caller to re-issue a
 * batched POSITION_ANNOTATIONS that will reposition several annotation at once
 */
class AnnotableManager {
  constructor(delay = 2000) {
    this.delay = delay;
    this.lastCallTime = new Date().getTime();
    this.positions = {};
    this.focusedId = null;
    this.timeoutId = null;
  }

  position({ positions, focusedId }) {
    const now = new Date().getTime();
    const lastCallTime = this.lastCallTime;
    this.lastCallTime = now;

    Object.assign(this.positions, positions);
    if (focusedId) {
      this.focusedId = focusedId;
    }

    return new Promise((resolve, reject) => {
      if (isEmpty(this.positions)) {
        return resolve(null);
      }

      // Note: here we buffer based on time, another strategy would be to keep
      // track of the number of <Annotable /> instances and only dispatch when
      // _every_ instance has called `position()`
      if (now - lastCallTime < this.delay && this.timeoutId == null) {
        this.timeoutId = setTimeout(() => {
          resolve({
            payload: Object.assign(
              { focusedId },
              { positions: this.positions }
            ),
            consolidated: true
          });
          this.positions = {};
          this.focusedId = null;
          this.timeoutId = null;
        }, this.delay);
      } else if (this.timeoutId == null) {
        resolve({
          payload: Object.assign({ focusedId }, { positions: this.positions }),
          consolidated: false
        });
        this.positions = {};
        this.focusedId = null;
      } else {
        resolve(null);
      }
    });
  }
}

class Batcher {
  constructor(delay = 200) {
    this.delay = delay;
    this.lastCallTime = new Date().getTime();
    this.init();
  }

  init() {
    this.reset();
  }

  reset() {
    this.consolidatedAction = {
      type: BULK_ANNOTATIONS,
      payload: {
        bulkDelete: new Set(),
        bulkCreate: []
      },
      consolidated: true
    };
    this.timeoutId = null;
  }

  batch(action) {
    const now = new Date().getTime();
    const lastCallTime = this.lastCallTime;
    this.lastCallTime = now;

    if (action.payload.bulkDelete) {
      for (const id of action.payload.bulkDelete) {
        this.consolidatedAction.payload.bulkDelete.add(id);
      }
    }

    if (action.payload.bulkCreate) {
      this.consolidatedAction.payload.bulkCreate.push(
        ...action.payload.bulkCreate.filter(a => {
          // !! we take care to dedup as given re-render Annotable can create several annotations (given the delay of the batcher)
          return !this.consolidatedAction.payload.bulkCreate.some(_a => {
            return (
              a.type === _a.type &&
              a.object === _a.object &&
              isSelectorEqual(a.selector, _a.selector)
            );
          });
        })
      );
    }

    return new Promise((resolve, reject) => {
      if (
        this.consolidatedAction.payload.bulkDelete.size === 0 &&
        this.consolidatedAction.payload.bulkCreate.length === 0
      ) {
        return resolve(null);
      }

      // We buffer based on time
      if (now - lastCallTime < this.delay && this.timeoutId == null) {
        this.timeoutId = setTimeout(() => {
          resolve(this.consolidatedAction);
          this.reset();
        }, this.delay);
      } else if (this.timeoutId == null) {
        resolve(this.consolidatedAction);
        this.reset();
      } else {
        resolve(null);
      }
    });
  }
}

/**
 * This middleware allow to:
 * - batch annotation positioning
 * - batch BULK_ANNOTATIONS (fired by each annotable on componentWillUnmount => a lot of them)
 * - reposition the annotation in response to any action that can change the _height_ of the page
 */
export default function annotationMiddleware(store) {
  const manager = new AnnotableManager();
  const batcher = new Batcher();

  let timeoutId;

  return function(next) {
    return function(action) {
      // Batch POSTION_ANNOTATIONS
      if (action.type === POSITION_ANNOTATIONS) {
        if (action.immediate) {
          return next(action);
        }

        return manager
          .position(action.payload)
          .then(data => {
            if (data) {
              next({
                type: POSITION_ANNOTATIONS,
                payload: data.payload,
                consolidated: data.consolidated
              });

              // Note: for some reasons sometimes Annotable measure before the DOM node is there => height is 0 and some annotations are overlapping. this fixes that by triggering a force layout once everything has been positioned
              const annotations = store.getState().annotations.annotations;
              const hasZeroHeight =
                annotations.every(annotation => annotation.position) &&
                annotations.some(
                  annotation =>
                    annotation.position && annotation.position.height === 0
                );

              if (hasZeroHeight) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(
                  () => store.dispatch(reLayoutAnnotations()),
                  10
                );
              }
            }
          })
          .catch(console.error.bind(console));
      }

      // Batch BULK_ANNOTATIONS
      if (action.type === 'BULK_ANNOTATIONS') {
        if (action.immediate) {
          return next(action);
        }

        return batcher
          .batch(action)
          .then(consolidatedAction => {
            if (consolidatedAction) {
              next(consolidatedAction);

              const annotations = store.getState().annotations.annotations;
              const hasZeroHeight =
                annotations.every(annotation => annotation.position) &&
                annotations.some(
                  annotation =>
                    annotation.position && annotation.position.height === 0
                );

              if (hasZeroHeight) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(
                  () => store.dispatch(reLayoutAnnotations()),
                  10
                );
              }
            }
          })
          .catch(console.error.bind(console));
      }

      const prevState = store.getState();
      const prevHeight =
        prevState.$measurable && prevState.$measurable.scrollHeight;

      const ret = next(action);

      const state = store.getState();

      const height = state.$measurable && state.$measurable.scrollHeight;

      if (
        height != null &&
        prevHeight != null &&
        Math.abs(height - prevHeight) > 10
      ) {
        store.dispatch(
          repositionAnnotations(null, {
            caller: `annotationMiddleware on ${
              action.type
            } (${prevHeight} => ${height})`
          })
        );
      }

      return ret;
    };
  };
}
