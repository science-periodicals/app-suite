import querystring from 'querystring';
import omit from 'lodash/omit';
import { xhr, RE_LOCAL_HOST_OR_DEV } from '@scipe/librarian';
import isClient from 'is-client';
import { getId, unprefix } from '@scipe/jsonld';
import { createEmailMessage } from '../utils/email-utils';
import { createUserPouchDb } from './pouch-action-creators';

export const LOGIN = 'LOGIN';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_ERROR = 'LOGIN_ERROR';

export function login(username, password, { csrfToken, history, next = '/' }) {
  return (dispatch, getState) => {
    dispatch({
      type: LOGIN,
      meta: { username, password, csrfToken }
    });

    return xhr({
      url: '/login',
      method: 'POST',
      json: true,
      headers: {
        'CSRF-Token': csrfToken
      },
      body: {
        username,
        password
      }
    })
      .then(({ body: user }) => {
        return dispatch(createUserPouchDb(getId(user))).then(db => {
          return user;
        });
      })
      .then(user => {
        dispatch({
          type: LOGIN_SUCCESS,
          meta: { username, password, csrfToken },
          payload: user
        });

        if (next.startsWith('http')) {
          if (RE_LOCAL_HOST_OR_DEV.test(window.location.hostname)) {
            // convert journal hostname into hostname query
            const parsed = new URL(next);
            const query = querystring.parse(parsed.search.substring(1));
            const hostname = query.hostname || parsed.hostname;

            const nextQuery = Object.assign(
              omit(query, ['hostname']),
              hostname && hostname !== 'sci.pe' ? { hostname } : undefined
            );

            window.location.replace(
              `${parsed.pathname}${
                Object.keys(nextQuery).length
                  ? `?${querystring.stringify(nextQuery)}`
                  : ''
              }`
            );
          } else {
            window.location.replace(next);
          }
        } else {
          history.replace(next);
        }
      })
      .catch(err => {
        dispatch({
          type: LOGIN_ERROR,
          meta: { username, password, csrfToken },
          error: err
        });
      });
  };
}

export const PROXY_LOGIN = 'PROXY_LOGIN';
export const PROXY_LOGIN_SUCCESS = 'PROXY_LOGIN_SUCCESS';
export const PROXY_LOGIN_ERROR = 'PROXY_LOGIN_ERROR';

export function proxyLogin(token, { history } = {}) {
  return (dispatch, getState) => {
    dispatch({
      type: PROXY_LOGIN,
      meta: { token }
    });

    return xhr({
      url: '/login?redirect=false',
      method: 'POST',
      json: true,
      followRedirect: false,
      headers: {
        Authorization: `token ${token}`
      }
    })
      .then(({ headers, statusCode, body }) => {
        dispatch({
          type: PROXY_LOGIN_SUCCESS,
          meta: { token }
        });
        window.location.replace(body.next);
      })
      .catch(err => {
        dispatch({
          type: PROXY_LOGIN_ERROR,
          meta: { token },
          error: err
        });
      });
  };
}

export const UPDATE_PROFILE = 'UPDATE_PROFILE';
export const UPDATE_PROFILE_SUCCESS = 'UPDATE_PROFILE_SUCCESS';
export const UPDATE_PROFILE_ERROR = 'UPDATE_PROFILE_ERROR';

export function updateProfile(upd) {
  return (dispatch, getState) => {
    const { user } = getState();
    const userId = getId(user);

    const updateAction = {
      '@type': 'UpdateAction',
      actionStatus: 'CompletedActionStatus',
      agent: userId,
      object: upd,
      targetCollection: userId
    };

    dispatch({
      type: UPDATE_PROFILE,
      payload: updateAction
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: updateAction
    })
      .then(({ body: updateAction }) => {
        dispatch({
          type: UPDATE_PROFILE_SUCCESS,
          payload: updateAction
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_PROFILE_ERROR,
          error: err
        });
      });
  };
}

export const CLEAR_LOGIN_ERROR = 'CLEAR_LOGIN_ERROR';
export function clearLoginError() {
  return {
    type: CLEAR_LOGIN_ERROR
  };
}

export const FETCH_PROFILE = 'FETCH_PROFILE';
export const FETCH_PROFILE_SUCCESS = 'FETCH_PROFILE_SUCCESS';
export const FETCH_PROFILE_ERROR = 'FETCH_PROFILE_ERROR';

export function fetchProfile(
  userId,
  { includeActiveRoles = false, baseUrl, cookie } = {}
) {
  return (dispatch, getState) => {
    const { fetchProfileStatus } = getState();

    // cancel previous xhr (if any)
    if (fetchProfileStatus.xhr) fetchProfileStatus.xhr.abort();

    const qs = includeActiveRoles ? '?includeActiveRoles=true' : '';

    const url = `/user/${unprefix(userId)}${qs}`;
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
      type: FETCH_PROFILE,
      payload: r.xhr,
      meta: { userId, includeActiveRoles }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_PROFILE_SUCCESS,
          payload: body,
          meta: { userId, includeActiveRoles }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_PROFILE_ERROR,
          error: err,
          meta: { userId, includeActiveRoles }
        });
      });
  };
}

export const UPDATE_USER_CONTACT_POINT = 'UPDATE_USER_CONTACT_POINT';
export const UPDATE_USER_CONTACT_POINT_SUCCESS =
  'UPDATE_USER_CONTACT_POINT_SUCCESS';
export const UPDATE_USER_CONTACT_POINT_ERROR =
  'UPDATE_USER_CONTACT_POINT_ERROR';

export function updateUserContactPoint(contactPointId, upd) {
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
      type: UPDATE_USER_CONTACT_POINT,
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
          type: UPDATE_USER_CONTACT_POINT_SUCCESS,
          payload: updateAction,
          meta: { contactPointId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_USER_CONTACT_POINT_ERROR,
          error: err,
          meta: { contactPointId }
        });
      });
  };
}
