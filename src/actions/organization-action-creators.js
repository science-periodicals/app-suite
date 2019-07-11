import { xhr, createId } from '@scipe/librarian';
import { getId, unprefix } from '@scipe/jsonld';
import { createEmailMessage } from '../utils/email-utils';

export const RESET_CREATE_ORGANIZATION_STATUS =
  'RESET_CREATE_ORGANIZATION_STATUS';

export const CREATE_ORGANIZATION = 'CREATE_ORGANIZATION';
export const CREATE_ORGANIZATION_SUCCESS = 'CREATE_ORGANIZATION_SUCCESS';
export const CREATE_ORGANIZATION_ERROR = 'CREATE_ORGANIZATION_ERROR';

export const UPDATE_ORGANIZATION = 'UPDATE_ORGANIZATION';
export const UPDATE_ORGANIZATION_SUCCESS = 'UPDATE_ORGANIZATION_SUCCESS';
export const UPDATE_ORGANIZATION_ERROR = 'UPDATE_ORGANIZATION_ERROR';

export function resetCreateOrganizationStatus() {
  return {
    type: RESET_CREATE_ORGANIZATION_STATUS
  };
}

export function createOrganization(org, history) {
  return (dispatch, getState) => {
    const { user } = getState();

    const createOrganizationAction = {
      '@type': 'CreateOrganizationAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      result: Object.assign({ '@type': 'Organization' }, org)
    };

    dispatch({
      type: CREATE_ORGANIZATION,
      payload: createOrganizationAction
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: createOrganizationAction
    })
      .then(({ body: createOrganizationAction }) => {
        dispatch({
          type: CREATE_ORGANIZATION_SUCCESS,
          payload: createOrganizationAction
        });
        history.replace(
          `/settings/organization/${unprefix(
            getId(createOrganizationAction.result)
          )}`
        );
      })
      .catch(err => {
        if (err.code === 409) {
          err.message =
            'Organization slug is already taken. Please try another slug.';
        }

        dispatch({
          type: CREATE_ORGANIZATION_ERROR,
          payload: Object.assign({}, createOrganizationAction, {
            actionStatus: 'FailedActionStatus'
          }),
          error: err
        });
      });
  };
}

export const FETCH_ORGANIZATION = 'FETCH_ORGANIZATION';
export const FETCH_ORGANIZATION_SUCCESS = 'FETCH_ORGANIZATION_SUCCESS';
export const FETCH_ORGANIZATION_ERROR = 'FETCH_ORGANIZATION_ERROR';

export function fetchOrganization(organizationId) {
  return (dispatch, getState) => {
    const { fetchOrganizationStatus } = getState();

    // cancel previous xhr (if any)
    if (fetchOrganizationStatus.xhr) fetchOrganizationStatus.xhr.abort();

    const r = xhr({
      url: `/organization/${unprefix(organizationId)}`,
      method: 'GET',
      json: true
    });

    dispatch({
      type: FETCH_ORGANIZATION,
      payload: r.xhr,
      meta: { organizationId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_ORGANIZATION_SUCCESS,
          payload: body,
          meta: { organizationId }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_ORGANIZATION_ERROR,
          error: err,
          meta: { organizationId }
        });
      });
  };
}

export function updateOrganization(organizationId, updatePayload) {
  return (dispatch, getState) => {
    const { user } = getState();
    organizationId = getId(organizationId);

    const updateAction = {
      '@type': 'UpdateAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: updatePayload,
      targetCollection: organizationId
    };

    dispatch({
      type: UPDATE_ORGANIZATION,
      payload: updateAction,
      meta: { organizationId }
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: updateAction
    })
      .then(({ body: updateAction }) => {
        dispatch({
          type: UPDATE_ORGANIZATION_SUCCESS,
          payload: updateAction,
          meta: { organizationId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_ORGANIZATION_ERROR,
          payload: Object.assign({}, updateAction, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { organizationId },
          error: err
        });
      });
  };
}

export const POST_ORGANIZATION_MEMBER_ACTION =
  'POST_ORGANIZATION_MEMBER_ACTION';
export const POST_ORGANIZATION_MEMBER_ACTION_SUCCESS =
  'POST_ORGANIZATION_MEMBER_ACTION_SUCCESS';
export const POST_ORGANIZATION_MEMBER_ACTION_ERROR =
  'POST_ORGANIZATION_MEMBER_ACTION_ERROR';

export function postOrganizationMemberAction(organizationId, action) {
  organizationId = getId(organizationId);

  return (dispatch, getState) => {
    if (!action['@id']) {
      action = Object.assign(
        { '@id': createId('action', null, organizationId)['@id'] },
        action
      );
    }

    dispatch({
      type: POST_ORGANIZATION_MEMBER_ACTION,
      payload: action,
      meta: { organizationId }
    });

    return xhr({
      url: '/action?mode=document', // mode=document -> so that UpdateAction results are the periodiocal and not just a role for instance
      method: 'POST',
      json: true,
      body: action
    })
      .then(({ body: action }) => {
        dispatch({
          type: POST_ORGANIZATION_MEMBER_ACTION_SUCCESS,
          payload: action,
          meta: { organizationId }
        });
      })
      .catch(err => {
        dispatch({
          type: POST_ORGANIZATION_MEMBER_ACTION_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { organizationId },
          error: err
        });
      });
  };
}

export const UPDATE_ORGANIZATION_CONTACT_POINT =
  'UPDATE_ORGANIZATION_CONTACT_POINT';
export const UPDATE_ORGANIZATION_CONTACT_POINT_SUCCESS =
  'UPDATE_ORGANIZATION_CONTACT_POINT_SUCCESS';
export const UPDATE_ORGANIZATION_CONTACT_POINT_ERROR =
  'UPDATE_ORGANIZATION_CONTACT_POINT_ERROR';

export function updateOrganizationContactPoint(contactPointId, upd) {
  return (dispatch, getState) => {
    const { user } = getState();
    const userId = getId(user);

    const updateAction = {
      '@type': 'UpdateContactPointAction',
      actionStatus: 'CompletedActionStatus',
      agent: userId,
      object: upd,
      targetCollection: contactPointId
    };

    updateAction.potentialAction = {
      '@type': 'InformAction',
      actionStatus: 'CompletedActionStatus',
      recipient: { '@id': userId, email: upd.email },
      instrument: createEmailMessage(updateAction)
    };

    dispatch({
      type: UPDATE_ORGANIZATION_CONTACT_POINT,
      payload: updateAction,
      meta: { contactPointId }
    });

    return xhr({
      url: '/action?mode=document',
      method: 'POST',
      json: true,
      body: updateAction
    })
      .then(({ body: updateAction }) => {
        dispatch({
          type: UPDATE_ORGANIZATION_CONTACT_POINT_SUCCESS,
          payload: updateAction,
          meta: { contactPointId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_ORGANIZATION_CONTACT_POINT_ERROR,
          error: err,
          meta: { contactPointId }
        });
      });
  };
}
