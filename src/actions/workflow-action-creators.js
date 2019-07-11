import isClient from 'is-client';
import querystring from 'querystring';
import {
  createId,
  getObjectId,
  xhr,
  escapeLucene,
  getDefaultGraphDigitalDocumentPermissions,
  DEFAULT_CREATE_WORKFLOW_STAGE_ACTION,
  ALL_AUDIENCES
} from '@scipe/librarian';
import { getId, unprefix } from '@scipe/jsonld';
import {
  createGraphAclSelector,
  createActionMapSelector
} from '../selectors/graph-selectors';
import {
  stopReplicationFromPouchToCouch,
  stopReplicationFromCouchToPouch
} from '../actions/pouch-action-creators';

export const SAVE_WORKFLOW_ACTION = 'SAVE_WORKFLOW_ACTION';
export const SAVE_WORKFLOW_ACTION_SUCCESS = 'SAVE_WORKFLOW_ACTION_SUCCESS';
export const SAVE_WORKFLOW_ACTION_ERROR = 'SAVE_WORKFLOW_ACTION_ERROR';

/**
 * Save action on PouchDB
 * Note: The PouchDB changes feed will dispatch the success (see
 * pouch-action-creators.js)
 */
export function saveWorkflowAction(graphId, updateTree) {
  return (dispatch, getState) => {
    const {
      pouch: { db }
    } = getState();

    dispatch({
      type: SAVE_WORKFLOW_ACTION,
      meta: { graphId, updateTree }
    });

    return db
      .upsert(createId('action', getId(updateTree), graphId)._id, node => {
        return Object.assign({}, node, updateTree);
      })
      .then(res => {
        dispatch({
          type: SAVE_WORKFLOW_ACTION_SUCCESS,
          payload: res,
          meta: { graphId, updateTree }
        });
      })
      .catch(err => {
        dispatch({
          type: SAVE_WORKFLOW_ACTION_ERROR,
          error: err,
          meta: { graphId, updateTree }
        });
      });
  };
}

export const POST_WORKFLOW_ACTION = 'POST_WORKFLOW_ACTION';
export const POST_WORKFLOW_ACTION_SUCCESS = 'POST_WORKFLOW_ACTION_SUCCESS';
export const POST_WORKFLOW_ACTION_ERROR = 'POST_WORKFLOW_ACTION_ERROR';

/**
 * Send action to API
 */
export function postWorkflowAction(
  graphId,
  action,
  {
    postAs, // a role
    actionStatus,
    parentAction,
    workflowActionStatusId,
    paymentToken,
    forceReloadOnSuccess = false // this is typically used for `JoinAction`
  } = {}
) {
  if (!action['@id']) {
    action = Object.assign(
      { '@id': createId('action', null, graphId)['@id'] },
      action
    );
  }

  if (!workflowActionStatusId) {
    if (
      action['@type'] === 'AcceptAction' ||
      action['@type'] === 'RejectAction' ||
      action['@type'] === 'AssignAction' ||
      action['@type'] === 'UnassignAction' ||
      action['@type'] === 'ScheduleAction' ||
      action['@type'] === 'EndorseAction'
    ) {
      workflowActionStatusId = getObjectId(action);
    } else if (action['@type'] === 'ReplyAction') {
      workflowActionStatusId = getId(parentAction);
    } else {
      workflowActionStatusId = getId(action);
    }
  }

  return (dispatch, getState) => {
    const state = getState();
    const actionMapSelector = createActionMapSelector();
    const actionMap = actionMapSelector(getState(), { graphId });

    action = Object.assign({}, action);

    if (actionStatus) {
      action.actionStatus = actionStatus;
    }

    // set  agent
    if (postAs) {
      const agentId = getId(action.agent);
      if (!agentId || !agentId.startsWith('role:')) {
        if (
          !action.agent ||
          !action.agent.name ||
          action.agent.name === postAs.name
        ) {
          action.agent = getId(postAs);
        } else {
          // find the first matching role and use it
          const { user } = state;
          const acl = createGraphAclSelector(state, { graphId });
          const userRoles = acl.getActiveRoles(user);
          action.agent = getId(
            userRoles.find(
              role =>
                role.roleName === action.agent.roleName &&
                role.name === action.agent.name
            )
          );
        }
      }
    }

    if (paymentToken) {
      action.paymentToken = paymentToken;
    }

    // Stage / Complete TypesettingAction
    if (action['@type'] === 'TypesettingAction') {
      if (
        action.actionStatus === 'StagedActionStatus' ||
        action.actionStatus === 'CompletedActionStatus'
      ) {
        // we set the last completed uploadAction as result
        const uploadAction = Object.values(actionMap)
          .filter(
            _action =>
              _action['@type'] === 'UploadAction' &&
              getId(_action.instrumentOf) === getId(action) &&
              _action.actionStatus === 'CompletedActionStatus'
          )
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )[0];

        if (getId(uploadAction)) {
          action.result = getId(uploadAction);
        }

        if (action.actionStatus === 'CompletedActionStatus') {
          action.autoUpdate = true;
        }
      }
    }

    dispatch({
      type: POST_WORKFLOW_ACTION,
      payload: action,
      meta: { graphId, workflowActionStatusId }
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    })
      .then(({ body: action }) => {
        dispatch({
          type: POST_WORKFLOW_ACTION_SUCCESS,
          payload: action,
          meta: { graphId, workflowActionStatusId }
        });

        if (forceReloadOnSuccess) {
          // we stop replication first to avoid the window before unload prompt
          dispatch(stopReplicationFromPouchToCouch());
          dispatch(stopReplicationFromCouchToPouch());
          window.location.reload(true);
        }
      })
      .catch(err => {
        dispatch({
          type: POST_WORKFLOW_ACTION_ERROR,
          payload: action,
          meta: { graphId, workflowActionStatusId },
          error: err
        });
      });
  };
}

export const DELETE_WORKFLOW_ACTION = 'DELETE_WORKFLOW_ACTION';
export const DELETE_WORKFLOW_ACTION_SUCCESS = 'DELETE_WORKFLOW_ACTION_SUCCESS';
export const DELETE_WORKFLOW_ACTION_ERROR = 'DELETE_WORKFLOW_ACTION_ERROR';

export function deleteWorkflowAction(graphId, action) {
  return (dispatch, getState) => {
    const workflowActionStatusId = getId(action);
    dispatch({
      type: DELETE_WORKFLOW_ACTION,
      payload: action,
      meta: { graphId, workflowActionStatusId }
    });
    return xhr({
      url: `/action/${unprefix(getId(action))}`,
      method: 'DELETE',
      json: true
    })
      .then(({ body: deleteAction }) => {
        dispatch({
          type: DELETE_WORKFLOW_ACTION_SUCCESS,
          payload: deleteAction,
          meta: { graphId, workflowActionStatusId }
        });
      })
      .catch(err => {
        dispatch({
          type: DELETE_WORKFLOW_ACTION_ERROR,
          payload: action,
          meta: { graphId, workflowActionStatusId },
          error: err
        });
      });
  };
}

export const FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS =
  'FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS';
export const FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_SUCCESS =
  'FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_SUCCESS';
export const FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_ERROR =
  'FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_ERROR';

export function fetchPeriodicalWorkflowSpecifications(
  periodicalId,
  { cookie, baseUrl } = {}
) {
  periodicalId = getId(periodicalId);

  return (dispatch, getState) => {
    const { fetchPeriodicalWorkflowSpecificationsStatus } = getState();

    // cancel previous xhr (if any)
    if (fetchPeriodicalWorkflowSpecificationsStatus.xhr) {
      fetchPeriodicalWorkflowSpecificationsStatus.xhr.abort();
    }

    // we exclude archived workflow specification (treated as deleted in the app-suite)
    const qs = {
      query: `isPotentialWorkflowOf:"${escapeLucene(
        periodicalId
      )}" NOT workflowSpecificationStatus:"ArchivedWorkflowSpecificationStatus"`,
      includeDocs: true
    };

    const url = `/workflow?${querystring.stringify(qs)}`;

    const r = xhr({
      url: isClient() ? url : `${baseUrl}${url}`,
      headers: isClient()
        ? undefined
        : cookie
        ? {
            Cookie: cookie
          }
        : undefined,
      method: 'GET',
      json: true
    });

    dispatch({
      type: FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS,
      payload: r.xhr,
      meta: { periodicalId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_SUCCESS,
          payload: body,
          meta: { periodicalId }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_PERIODICAL_WORKFLOW_SPECIFICATIONS_ERROR,
          error: err,
          meta: { periodicalId }
        });
      });
  };
}

export const CREATE_WORKFLOW_SPECIFICATION = 'CREATE_WORKFLOW_SPECIFICATION';
export const CREATE_WORKFLOW_SPECIFICATION_SUCCESS =
  'CREATE_WORKFLOW_SPECIFICATION_SUCCESS';
export const CREATE_WORKFLOW_SPECIFICATION_ERROR =
  'CREATE_WORKFLOW_SPECIFICATION_ERROR';

export function createWorkflowSpecification(periodicalId) {
  return (dispatch, getState) => {
    const action = {
      '@type': 'CreateWorkflowSpecificationAction',
      actionStatus: 'CompletedActionStatus',
      expectedDuration: 'P7D', // used to specify the overall deadline of the submission
      object: periodicalId,
      result: {
        '@id': createId('workflow', null, periodicalId)['@id'],
        '@type': 'WorkflowSpecification',
        expectedDuration: 'P60D',
        potentialAction: {
          '@type': 'CreateGraphAction',
          actionStatus: 'PotentialActionStatus',
          agent: {
            '@type': 'Role',
            roleName: 'author'
          },
          participant: ALL_AUDIENCES,
          result: {
            '@type': 'Graph',
            hasDigitalDocumentPermission: getDefaultGraphDigitalDocumentPermissions(),
            potentialAction: DEFAULT_CREATE_WORKFLOW_STAGE_ACTION
          }
        }
      }
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: CREATE_WORKFLOW_SPECIFICATION,
      payload: action,
      meta: { periodicalId, xhr: r.xhr, workflowId: getId(action.result) }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: CREATE_WORKFLOW_SPECIFICATION_SUCCESS,
          payload: action,
          meta: { periodicalId, workflowId: getId(action.result) }
        });
      })
      .catch(err => {
        dispatch({
          type: CREATE_WORKFLOW_SPECIFICATION_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId, workflowId: getId(action.result) },
          error: err
        });
      });
  };
}

export const ARCHIVE_WORKFLOW_SPECIFICATION = 'ARCHIVE_WORKFLOW_SPECIFICATION';
export const ARCHIVE_WORKFLOW_SPECIFICATION_SUCCESS =
  'ARCHIVE_WORKFLOW_SPECIFICATION_SUCCESS';
export const ARCHIVE_WORKFLOW_SPECIFICATION_ERROR =
  'ARCHIVE_WORKFLOW_SPECIFICATION_ERROR';

export function archiveWorkflowSpecification(periodicalId, workflowId) {
  workflowId = getId(workflowId);

  return (dispatch, getState) => {
    const { user } = getState();

    const r = xhr({
      url: `/action`,
      method: 'POST',
      json: {
        agent: getId(user),
        '@type': 'ArchiveAction',
        actionStatus: 'CompletedActionStatus',
        object: workflowId
      }
    });

    dispatch({
      type: ARCHIVE_WORKFLOW_SPECIFICATION,
      payload: workflowId,
      meta: { periodicalId, workflowId, xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: ARCHIVE_WORKFLOW_SPECIFICATION_SUCCESS,
          payload: action,
          meta: { periodicalId, workflowId }
        });
      })
      .catch(err => {
        dispatch({
          type: ARCHIVE_WORKFLOW_SPECIFICATION_ERROR,
          payload: workflowId,
          meta: { periodicalId, workflowId },
          error: err
        });
      });
  };
}

export const UPDATE_WORKFLOW_SPECIFICATION = 'UPDATE_WORKFLOW_SPECIFICATION';
export const UPDATE_WORKFLOW_SPECIFICATION_SUCCESS =
  'UPDATE_WORKFLOW_SPECIFICATION_SUCCESS';
export const UPDATE_WORKFLOW_SPECIFICATION_ERROR =
  'UPDATE_WORKFLOW_SPECIFICATION_ERROR';

export function updateWorkflowSpecification(
  periodicalId,
  workflowId,
  upd // update payload
) {
  periodicalId = getId(periodicalId);
  workflowId = getId(workflowId);

  return (dispatch, getState) => {
    const { user } = getState();

    const updateAction = {
      '@type': 'UpdateAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: upd,
      targetCollection: workflowId
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: updateAction
    });

    dispatch({
      type: UPDATE_WORKFLOW_SPECIFICATION,
      payload: updateAction,
      meta: {
        periodicalId,
        workflowId,
        xhr: r.xhr
      }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: UPDATE_WORKFLOW_SPECIFICATION_SUCCESS,
          payload: body,
          meta: { periodicalId, workflowId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_WORKFLOW_SPECIFICATION_ERROR,
          payload: Object.assign({}, updateAction, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId, workflowId },
          error: err
        });
      });
  };
}

export const TOGGLE_WORKFLOW_SPECIFICATION_STATUS =
  'TOGGLE_WORKFLOW_SPECIFICATION_STATUS';
export const TOGGLE_WORKFLOW_SPECIFICATION_STATUS_SUCCESS =
  'TOGGLE_WORKFLOW_SPECIFICATION_STATUS_SUCCESS';
export const TOGGLE_WORKFLOW_SPECIFICATION_STATUS_ERROR =
  'TOGGLE_WORKFLOW_SPECIFICATION_STATUS_ERROR';

export function toggleWorkflowSpecificationStatus(
  periodicalId,
  workflowId,
  activate
) {
  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@type': activate ? 'ActivateAction' : 'DeactivateAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: workflowId
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: TOGGLE_WORKFLOW_SPECIFICATION_STATUS,
      payload: action,
      meta: { periodicalId, xhr: r.xhr, workflowId }
    });
    return r
      .then(({ body: action }) => {
        dispatch({
          type: TOGGLE_WORKFLOW_SPECIFICATION_STATUS_SUCCESS,
          payload: action,
          meta: { periodicalId, workflowId }
        });
      })
      .catch(err => {
        dispatch({
          type: TOGGLE_WORKFLOW_SPECIFICATION_STATUS_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId, workflowId },
          error: err
        });
      });
  };
}
