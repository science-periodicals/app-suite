import { arrayify } from '@scipe/jsonld';
import omit from 'lodash/omit';

import {
  SET_SCREEN_DIM,
  OPEN_SHELL,
  CLOSE_SHELL,
  HIGHLIGHT_RESOURCE,
  HIGHLIGHT_WORKFLOW_ACTION,
  OPEN_WORKFLOW_ACTION,
  OPEN_PRINT_PROGRESS_MODAL,
  CLOSE_PRINT_PROGRESS_MODAL,
  UPDATE_IS_OFFLINE,
  OPEN_READER_PREVIEW,
  CLOSE_READER_PREVIEW,
  SCROLL_TO_HASH,
  QUEUE_SCROLL_TO_HASH
} from '../actions/ui-action-creators';
import {
  POST_WORKFLOW_ACTION,
  POST_WORKFLOW_ACTION_SUCCESS,
  POST_WORKFLOW_ACTION_ERROR,
  DELETE_WORKFLOW_ACTION,
  DELETE_WORKFLOW_ACTION_SUCCESS,
  DELETE_WORKFLOW_ACTION_ERROR
} from '../actions/workflow-action-creators';
import {
  CREATE_TAG,
  CREATE_TAG_SUCCESS,
  CREATE_TAG_ERROR
} from '../actions/graph-action-creators';

export function screenWidth(state = null, action) {
  switch (action.type) {
    case SET_SCREEN_DIM:
      return action.payload.screenWidth;

    default:
      return state;
  }
}

export function screenHeight(state = null, action) {
  switch (action.type) {
    case SET_SCREEN_DIM:
      return action.payload.screenHeight;

    default:
      return state;
  }
}

export function readerPreviewData(state = {}, action) {
  switch (action.type) {
    case OPEN_READER_PREVIEW:
      return action.payload;
    case CLOSE_READER_PREVIEW:
      return {};
    default:
      return state;
  }
}

export function highlightedResource(state = null, action) {
  switch (action.type) {
    case HIGHLIGHT_RESOURCE:
      return action.payload;
    default:
      return state;
  }
}

// TODO rename this should be plural as we arrayify it...
export function highlightedWorkflowAction(state = {}, action) {
  switch (action.type) {
    case HIGHLIGHT_WORKFLOW_ACTION: {
      const { graphId } = action.meta;
      if (graphId) {
        return Object.assign({}, state, {
          [graphId]: arrayify(action.payload)
        });
      }
      return state;
    }
    default:
      return state;
  }
}

export function openedWorkflowAction(state = {}, action) {
  switch (action.type) {
    case OPEN_WORKFLOW_ACTION: {
      const { graphId } = action.meta;
      if (graphId) {
        return Object.assign({}, state, {
          [graphId]: arrayify(action.payload)
        });
      }
      return state;
    }
    default:
      return state;
  }
}

export function workflowActionStatus(state = {}, action) {
  switch (action.type) {
    case DELETE_WORKFLOW_ACTION:
    case POST_WORKFLOW_ACTION:
    case CREATE_TAG:
      return Object.assign({}, state, {
        [action.meta.workflowActionStatusId]: {
          status: 'active',
          error: null,
          payload: action.payload
        }
      });

    case CREATE_TAG_SUCCESS:
    case DELETE_WORKFLOW_ACTION_SUCCESS:
    case POST_WORKFLOW_ACTION_SUCCESS:
      // TODO special case CreateReleaseAction as we need to wait for the doc transformation action to be completed...
      return omit(state, [action.meta.workflowActionStatusId]);

    case DELETE_WORKFLOW_ACTION_ERROR:
    case POST_WORKFLOW_ACTION_ERROR:
    case CREATE_TAG_ERROR:
      return Object.assign({}, state, {
        [action.meta.workflowActionStatusId]: {
          status: 'error',
          error: action.error
        }
      });

    default:
      return state;
  }
}

export function isOffline(state = false, action) {
  switch (action.type) {
    case UPDATE_IS_OFFLINE:
      return action.payload;
    default:
      return state;
  }
}

export function shell(
  state = {
    isOpen: false,
    type: null,
    id: null,
    selector: null,
    disabled: false,
    readOnly: false,
    hash: null,
    connectedComponent: null,
    params: null
  },
  action
) {
  switch (action.type) {
    case OPEN_SHELL:
      return {
        isOpen: true,
        type: action.payload.type,
        id: action.payload.id,
        selector: action.payload.selector,
        disabled: action.payload.disabled,
        readOnly: action.payload.readOnly,
        hash: action.payload.hash,
        connectedComponent: action.payload.connectedComponent,
        params: action.payload.params
      };

    case CLOSE_SHELL:
      return {
        isOpen: false,
        type: null,
        id: null,
        selector: null,
        disabled: false,
        readOnly: false,
        hash: null,
        connectedComponent: null,
        params: null
      };

    default:
      return state;
  }
}

export function isPrintProgessModalOpen(state = false, action) {
  switch (action.type) {
    case OPEN_PRINT_PROGRESS_MODAL:
      return true;

    case CLOSE_PRINT_PROGRESS_MODAL:
      return false;

    default:
      return state;
  }
}

const defaultQueuedScrollHash = {
  timeoutId: null,
  intervalId: null,
  queuedHash: null
};
export function queuedScrollHash(state = defaultQueuedScrollHash, action) {
  switch (action.type) {
    case SCROLL_TO_HASH:
      return defaultQueuedScrollHash;

    case QUEUE_SCROLL_TO_HASH: {
      const { timeoutId, intervalId, queuedHash } = action.payload;

      return {
        timeoutId,
        intervalId,
        queuedHash
      };
    }

    default:
      return state;
  }
}
