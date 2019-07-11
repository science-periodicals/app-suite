import isClient from 'is-client';
import { getId, unprefix } from '@scipe/jsonld';
import { xhr } from '@scipe/librarian';

export const ADD_DROPLETS = 'ADD_DROPLETS';
export function addDroplets(payload) {
  return {
    type: ADD_DROPLETS,
    payload
  };
}

export const FETCH_DROPLET = 'FETCH_DROPLET';
export const FETCH_DROPLET_SUCCESS = 'FETCH_DROPLET_SUCCESS';
export const FETCH_DROPLET_ERROR = 'FETCH_DROPLET_ERROR';

export function fetchDroplet(dropletId, { cookie, baseUrl } = {}) {
  return (dispatch, getState) => {
    const [prefix] = dropletId.split(':');

    let type;
    switch (prefix) {
      case 'org':
        type = 'organization';
        break;

      case 'journal':
        type = 'periodical';
        break;

      default:
        type = prefix;
        break;
    }

    const url = `/${type}/${unprefix(getId(dropletId))}`;

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
      type: FETCH_DROPLET,
      payload: r.xhr,
      meta: { dropletId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_DROPLET_SUCCESS,
          payload: body,
          meta: { dropletId }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_DROPLET_ERROR,
          error: err,
          meta: { dropletId }
        });
      });
  };
}
