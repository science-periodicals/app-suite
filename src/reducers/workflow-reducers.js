import omit from 'lodash/omit';
import { arrayify, getNodeMap, getId } from '@scipe/jsonld';
import {
  FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS,
  FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_SUCCESS,
  FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_ERROR,
  CREATE_WORKFLOW_SPECIFICATION,
  CREATE_WORKFLOW_SPECIFICATION_SUCCESS,
  CREATE_WORKFLOW_SPECIFICATION_ERROR,
  UPDATE_WORKFLOW_SPECIFICATION,
  UPDATE_WORKFLOW_SPECIFICATION_SUCCESS,
  UPDATE_WORKFLOW_SPECIFICATION_ERROR,
  ARCHIVE_WORKFLOW_SPECIFICATION,
  ARCHIVE_WORKFLOW_SPECIFICATION_SUCCESS,
  ARCHIVE_WORKFLOW_SPECIFICATION_ERROR,
  TOGGLE_WORKFLOW_SPECIFICATION_STATUS,
  TOGGLE_WORKFLOW_SPECIFICATION_STATUS_SUCCESS,
  TOGGLE_WORKFLOW_SPECIFICATION_STATUS_ERROR
} from '../actions/workflow-action-creators';

export function fetchPeriodicalWorkflowSpecificationsStatus(
  state = { status: null, xhr: null },
  action
) {
  switch (action.type) {
    case FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS:
      return Object.assign({}, state, {
        status: 'active',
        error: null,
        xhr: action.payload
      });

    case FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_SUCCESS: {
      return Object.assign({}, state, {
        status: 'success',
        error: null,
        xhr: null
      });
    }

    case FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_ERROR:
      return Object.assign({}, state, {
        status: 'error',
        error: action.error,
        xhr: null
      });

    default:
      return state;
  }
}

export function workflowSpecificationMap(state = {}, action) {
  switch (action.type) {
    case CREATE_WORKFLOW_SPECIFICATION_SUCCESS:
    case TOGGLE_WORKFLOW_SPECIFICATION_STATUS_SUCCESS:
    case UPDATE_WORKFLOW_SPECIFICATION_SUCCESS:
      return Object.assign({}, state, {
        [getId(action.payload.result)]: action.payload.result
      });

    case ARCHIVE_WORKFLOW_SPECIFICATION_SUCCESS:
      return omit(state, [action.meta.workflowId]);

    case FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      const workflows = arrayify(mainEntity.itemListElement).map(
        itemListElement => itemListElement.item
      );
      return getNodeMap(workflows);
    }

    default:
      return state;
  }
}

export function crudWorkflowSpecificationStatus(state = {}, action) {
  switch (action.type) {
    case CREATE_WORKFLOW_SPECIFICATION:
    case UPDATE_WORKFLOW_SPECIFICATION:
    case ARCHIVE_WORKFLOW_SPECIFICATION:
    case TOGGLE_WORKFLOW_SPECIFICATION_STATUS:
      return Object.assign({}, state, {
        [action.meta.workflowId]: {
          status: 'active',
          error: null,
          xhr: action.meta.xhr
        }
      });

    case CREATE_WORKFLOW_SPECIFICATION_SUCCESS:
    case UPDATE_WORKFLOW_SPECIFICATION_SUCCESS:
    case ARCHIVE_WORKFLOW_SPECIFICATION_SUCCESS:
    case TOGGLE_WORKFLOW_SPECIFICATION_STATUS_SUCCESS:
      // TODO remove instead ?
      return Object.assign({}, state, {
        [action.meta.workflowId]: {
          status: 'success',
          error: null,
          xhr: null
        }
      });

    case CREATE_WORKFLOW_SPECIFICATION_ERROR:
    case UPDATE_WORKFLOW_SPECIFICATION_ERROR:
    case ARCHIVE_WORKFLOW_SPECIFICATION_ERROR:
    case TOGGLE_WORKFLOW_SPECIFICATION_STATUS_ERROR:
      return Object.assign({}, state, {
        [action.meta.workflowId]: {
          status: 'error',
          error: action.error,
          xhr: null
        }
      });

    default:
      return state;
  }
}
