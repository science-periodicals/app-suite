import isClient from 'is-client';
import querystring from 'querystring';
import { xhr } from '@scipe/librarian';
import { getId } from '@scipe/jsonld';

export const FETCH_ACTIVE_CHECKS = 'FETCH_ACTIVES_CHECKS';
export const FETCH_ACTIVE_CHECKS_SUCCESS = 'FETCH_ACTIVE_CHECKS_SUCCESS';
export const FETCH_ACTIVE_CHECKS_ERROR = 'FETCH_ACTIVE_CHECKS_ERROR';

export function fetchActiveChecks({
  baseUrl,
  cookie,
  reset = false,
  nextUrl
} = {}) {
  return (dispatch, getState) => {
    const { user, fetchActiveCheckActionsStatus } = getState();
    if (!getId(user)) {
      return;
    }

    if (fetchActiveCheckActionsStatus.xhr) {
      fetchActiveCheckActionsStatus.xhr.abort();
    }

    let url, append;
    if (nextUrl) {
      url = nextUrl;
      append = true;
    } else {
      const query = `@type:"CheckAction" AND agentId:"${getId(
        user['@id']
      )}" AND actionStatus:"ActiveActionStatus"`;

      const qs = {
        sort: JSON.stringify('-startTime'),
        addActiveRoleIds: true,
        query: query,
        hydrate: JSON.stringify(['object', 'isPartOf']),
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
      type: FETCH_ACTIVE_CHECKS,
      payload: r.xhr,
      meta: { reset, append }
    });

    return r
      .then(({ body: itemList }) => {
        dispatch({
          type: FETCH_ACTIVE_CHECKS_SUCCESS,
          payload: itemList,
          meta: { reset, append }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_ACTIVE_CHECKS_ERROR,
          error: err,
          meta: { reset, append }
        });
      });
  };
}

export const POST_CHECK_ACTION = 'POST_CHECK_ACTION';
export const POST_CHECK_ACTION_SUCCESS = 'POST_CHECK_ACTION_SUCCESS';
export const POST_CHECK_ACTION_ERROR = 'POST_CHECK_ACTION_ERROR';

export function postCheckAction(
  action,
  { history, nextLocationOnSuccess } = {}
) {
  return (dispatch, getState) => {
    dispatch({
      type: POST_CHECK_ACTION,
      payload: action
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    })
      .then(({ body }) => {
        dispatch({
          type: POST_CHECK_ACTION_SUCCESS,
          payload: body
        });

        if (history && nextLocationOnSuccess) {
          history.replace(nextLocationOnSuccess);
        }
      })
      .catch(err => {
        dispatch({
          type: POST_CHECK_ACTION_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          error: err
        });
      });
  };
}
