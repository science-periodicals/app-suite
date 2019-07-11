import { getId } from '@scipe/jsonld';
import { UPLOAD_PROGRESS } from '../actions/encoding-action-creators';
import { WORKER_DATA } from '../actions/worker-action-creators';

export function progressEventMapByActionId(
  state = {} /* {[actionId]: {[eventId]: PrgressEvent}} */,
  action
) {
  if (action.buffered) {
    return action.payload.reduce((state, action) => {
      return progressEventMapByActionId(state, action);
    }, state);
  }

  switch (action.type) {
    case UPLOAD_PROGRESS:
    case WORKER_DATA: {
      const event = action.payload;
      const actionId = getId(event.about);
      if (!actionId || event['@type'] !== 'ProgressEvent') {
        return state;
      }
      return Object.assign({}, state, {
        [actionId]: Object.assign({}, state[actionId], {
          [getId(event)]: event
        })
      });
    }

    default:
      return state;
  }
}
