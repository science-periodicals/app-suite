import isClient from 'is-client';
import querystring from 'querystring';
import { xhr, createId } from '@scipe/librarian';
import { getId, unprefix } from '@scipe/jsonld';
import config from '../utils/config';

export const FETCH_ACTIVE_INVITES = 'FETCH_ACTIVES_INVITES';
export const FETCH_ACTIVE_INVITES_SUCCESS = 'FETCH_ACTIVE_INVITES_SUCCESS';
export const FETCH_ACTIVE_INVITES_ERROR = 'FETCH_ACTIVE_INVITES_ERROR';

/**
 * Used to fecth active invites of
 * - Journal (`periodicalId` must be provided)
 * - Organization (`organizationId` must be provided)
 * - the logged in user (if `periodicalId` and `organizationId` are undefined)
 */
export function fetchActiveInvites({
  periodicalId,
  organizationId,
  baseUrl,
  cookie,
  reset = false, // all active invites share same reducer => reset false resets it
  nextUrl
} = {}) {
  return (dispatch, getState) => {
    const { user, fetchActiveInvitesStatus } = getState();
    const { isJournalSubdomain } = config;
    if (
      (!getId(user) && !periodicalId && !organizationId) ||
      isJournalSubdomain
    ) {
      return;
    }

    if (fetchActiveInvitesStatus.xhr) {
      fetchActiveInvitesStatus.xhr.abort();
    }

    let url, append, ifMatch;
    if (nextUrl) {
      url = nextUrl;
      append = true;
    } else {
      let query;
      if (periodicalId) {
        query = `@type:InviteAction AND objectId:"${periodicalId}" AND actionStatus:ActiveActionStatus`;
        ifMatch = periodicalId;
      } else if (organizationId) {
        query = `@type:InviteAction AND objectId:"${organizationId}" AND actionStatus:ActiveActionStatus`;
        ifMatch = organizationId;
      } else {
        query = `@type:InviteAction AND recipientId:"${
          user['@id']
        }" AND actionStatus:ActiveActionStatus`;
        ifMatch = getId(user);
      }

      const qs = {
        sort: JSON.stringify('-startTime'),
        addActiveRoleIds: true,
        query: query,
        hydrate: JSON.stringify([
          'agent',
          'recipient',
          'participant',
          'object',
          'mainEntity',
          'isPartOf'
        ]),
        includeDocs: true
      };

      const pathname = `/action?${querystring.stringify(qs)}`;
      url = isClient() ? pathname : `${baseUrl}${pathname}`;
      append = false;
    }

    const r = xhr({
      url,
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
      type: FETCH_ACTIVE_INVITES,
      payload: r.xhr,
      meta: {
        reset,
        append,
        ifMatch // used to know if we can append to the list of result or not on `POST_INVITE_ACTION_SUCCESS`
      }
    });

    return r
      .then(({ body: itemList }) => {
        dispatch({
          type: FETCH_ACTIVE_INVITES_SUCCESS,
          payload: itemList,
          meta: { reset, append }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_ACTIVE_INVITES_ERROR,
          error: err,
          meta: { reset, append }
        });
      });
  };
}

export const POST_INVITE_ACTION = 'POST_INVITE_ACTION';
export const POST_INVITE_ACTION_SUCCESS = 'POST_INVITE_ACTION_SUCCESS';
export const POST_INVITE_ACTION_ERROR = 'POST_INVITE_ACTION_ERROR';

export function postInviteAction(
  action,
  scopeId,
  {
    ifMatch // `journalId`, `organizationId` or `userId` see `fetchActiveInvites`
  } = {}
) {
  return (dispatch, getState) => {
    if (!action['@id']) {
      action = Object.assign(
        { '@id': createId('action', null, scopeId)['@id'] },
        action
      );
    }

    dispatch({
      type: POST_INVITE_ACTION,
      payload: action,
      meta: { scopeId, ifMatch }
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    })
      .then(({ body }) => {
        dispatch({
          type: POST_INVITE_ACTION_SUCCESS,
          payload: body,
          meta: { scopeId, ifMatch }
        });
      })
      .catch(err => {
        dispatch({
          type: POST_INVITE_ACTION_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          error: err,
          meta: { scopeId, ifMatch }
        });
      });
  };
}

export const DELETE_INVITE_ACTION = 'DELETE_INVITE_ACTION';
export const DELETE_INVITE_ACTION_SUCCESS = 'DELETE_INVITE_ACTION_SUCCESS';
export const DELETE_INVITE_ACTION_ERROR = 'DELETE_INVITE_ACTION_ERROR';

export function deleteInviteAction(inviteAction) {
  return (dispatch, getState) => {
    dispatch({
      type: DELETE_INVITE_ACTION,
      payload: inviteAction
    });

    return xhr({
      url: `/action/${unprefix(getId(inviteAction))}`,
      method: 'DELETE',
      json: true
    })
      .then(({ body: itemList }) => {
        dispatch({
          type: DELETE_INVITE_ACTION_SUCCESS,
          payload: itemList,
          meta: { inviteActionId: getId(inviteAction) }
        });
      })
      .catch(err => {
        dispatch({
          type: DELETE_INVITE_ACTION_ERROR,
          payload: inviteAction,
          error: err
        });
      });
  };
}
