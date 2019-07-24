import { getId } from '@scipe/jsonld';
import {
  FETCH_ENCODING,
  FETCH_ENCODING_SUCCESS,
  FETCH_ENCODING_ERROR,
  HIGHLIGHT_ENCODING_SUCCESS,
  HIGHLIGHT_ENCODING_ERROR,
  ENCODING_IMAGES_LOADED
} from '../actions/encoding-action-creators';

// store encoding by encodingId
export function contentMap(state = {}, action) {
  if (action.buffered) {
    return action.payload.reduce((state, action) => {
      return contentMap(state, action);
    }, state);
  }

  switch (action.type) {
    case FETCH_ENCODING:
      return Object.assign({}, state, {
        [getId(action.payload) || getId(action.meta.encodingId)]: {}
      });

    case FETCH_ENCODING_SUCCESS:
      return Object.assign({}, state, {
        [getId(action.meta.encodingId)]: action.payload
      });

    case HIGHLIGHT_ENCODING_SUCCESS:
      return Object.assign({}, state, {
        [getId(action.meta.encodingId)]: Object.assign(
          {},
          state[getId(action.meta.encodingId)],
          action.payload
        )
      });

    default:
      return state;
  }
}

export function fetchEncodingStatus(state = {}, action) {
  if (action.buffered) {
    return action.payload.reduce((state, action) => {
      return fetchEncodingStatus(state, action);
    }, state);
  }

  switch (action.type) {
    case FETCH_ENCODING:
      return Object.assign({}, state, {
        [action.meta.encodingId]: {
          active: true,
          error: null
        }
      });

    case FETCH_ENCODING_SUCCESS:
      return Object.assign({}, state, {
        [action.meta.encodingId]: {
          active: action.meta.webWorker || action.meta.images ? true : false, // if webWorker is set termination will be set when the webWorker is done (HIGHLIGHT_ENCODING_SUCCESS etc.)
          error: null
        }
      });

    case ENCODING_IMAGES_LOADED:
    case HIGHLIGHT_ENCODING_SUCCESS:
      return Object.assign({}, state, {
        [action.meta.encodingId]: {
          active: false,
          error: null
        }
      });

    case HIGHLIGHT_ENCODING_ERROR:
    case FETCH_ENCODING_ERROR:
      return Object.assign({}, state, {
        [action.meta.encodingId]: {
          active: false,
          error: action.error
        }
      });

    default:
      return state;
  }
}
