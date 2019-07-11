import isClient from 'is-client';
import querystring from 'querystring';
import { getId } from '@scipe/jsonld';
import { escapeLucene, xhr, createId } from '@scipe/librarian';

export const FETCH_ACTIVE_APPLICATIONS = 'FETCH_ACTIVES_APPLICATIONS';
export const FETCH_ACTIVE_APPLICATIONS_SUCCESS =
  'FETCH_ACTIVE_APPLICATIONS_SUCCESS';
export const FETCH_ACTIVE_APPLICATIONS_ERROR =
  'FETCH_ACTIVE_APPLICATIONS_ERROR';

export function fetchActiveApplications({
  journalId,
  baseUrl,
  cookie,
  reset = false,
  nextUrl
} = {}) {
  return (dispatch, getState) => {
    const { fetchActiveApplicationsStatus } = getState();

    if (fetchActiveApplicationsStatus.xhr) {
      fetchActiveApplicationsStatus.xhr.abort();
    }

    let url, append;
    if (nextUrl) {
      url = nextUrl;
      append = true;
    } else {
      append = false;
      const qs = {
        sort: JSON.stringify('-startTime'),
        query: `@type:ApplyAction AND objectId:"${escapeLucene(
          journalId
        )}" AND actionStatus:ActiveActionStatus`,
        includeDocs: true
      };
      const pathname = `/action?${querystring.stringify(qs)}`;
      url = isClient() ? pathname : `${baseUrl}${pathname}`;
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
      type: FETCH_ACTIVE_APPLICATIONS,
      payload: r.xhr,
      meta: { journalId, append, reset }
    });

    return r
      .then(({ body: itemList }) => {
        dispatch({
          type: FETCH_ACTIVE_APPLICATIONS_SUCCESS,
          payload: itemList,
          meta: { journalId, append, reset }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_ACTIVE_APPLICATIONS_ERROR,
          error: err,
          meta: { journalId, append, reset }
        });
      });
  };
}

export const POST_ACCEPT_REJECT_APPLY_ACTION =
  'POST_ACCEPT_REJECT_APPLY_ACTION';
export const POST_ACCEPT_REJECT_APPLY_ACTION_SUCCESS =
  'POST_ACCEPT_REJECT_APPLY_ACTION_SUCCESS';
export const POST_ACCEPT_REJECT_APPLY_ACTION_ERROR =
  'POST_ACCEPT_REJECT_APPLY_ACTION_ERROR';

export function postAcceptRejectApplyAction(
  journalId,
  action // AcceptAction or RejectAction
) {
  journalId = getId(journalId);

  return (dispatch, getState) => {
    if (!action['@id']) {
      action = Object.assign(
        { '@id': createId('action', null, journalId)['@id'] },
        action
      );
    }

    dispatch({
      type: POST_ACCEPT_REJECT_APPLY_ACTION,
      payload: action,
      meta: { journalId }
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    })
      .then(({ body: action }) => {
        dispatch({
          type: POST_ACCEPT_REJECT_APPLY_ACTION_SUCCESS,
          payload: action,
          meta: { journalId }
        });
      })
      .catch(err => {
        dispatch({
          type: POST_ACCEPT_REJECT_APPLY_ACTION_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { journalId },
          error: err
        });
      });
  };
}
