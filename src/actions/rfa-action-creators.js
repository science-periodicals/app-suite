import isClient from 'is-client';
import querystring from 'querystring';
import { unprefix, getId } from '@scipe/jsonld';
import { xhr, parseNextUrl } from '@scipe/librarian';
import { getRfasQuery, getLoadingFacets } from '../utils/search';
import { EXPLORER_RFAS_FACETS } from '../constants';

export const SEARCH_RFAS = 'SEARCH_RFAS';
export const SEARCH_RFAS_SUCCESS = 'SEARCH_RFAS_SUCCESS';
export const SEARCH_RFAS_ERROR = 'SEARCH_RFAS_ERROR';

export function searchRfas({
  history,
  nextUrl,
  query = {},
  nextQuery,
  cookie,
  baseUrl,
  reset,
  journal, // if journal is specified we restict the search to that journal
  cache = true
} = {}) {
  return (dispatch, getState) => {
    const { user, rfasFacetMap, rfasSearchResults } = getState();

    // cancel previous xhr (if any)
    if (rfasSearchResults && rfasSearchResults.xhr) {
      rfasSearchResults.xhr.abort();
    }

    const facets = EXPLORER_RFAS_FACETS;

    let url, json;
    if (nextUrl) {
      const parsed = parseNextUrl(nextUrl);
      url = parsed.url;
      json = parsed.body;
    } else {
      const q = getRfasQuery(
        user,
        nextQuery || query,
        rfasFacetMap,
        facets,
        journal
      );

      json = {
        sort: '-startTime',
        counts: facets,
        includeDocs: true,
        query: q,
        hydrate: ['agent', 'object'],
        limit: 10
      };

      const qs = { cache };

      url = `/action?${querystring.stringify(qs)}`;
    }

    // compute loadingFacets and transition route if needed
    let loadingFacets;
    if (nextQuery) {
      loadingFacets = getLoadingFacets(facets, query, nextQuery);

      history.push({
        path: '/',
        search: `?${querystring.stringify(nextQuery)}`
      });
    } else {
      loadingFacets = {};
    }

    const r = xhr({
      url: isClient() ? url : `${baseUrl}${url}`,
      headers: isClient()
        ? undefined
        : cookie
        ? {
            Cookie: cookie
          }
        : undefined,
      method: 'POST',
      json
    });

    dispatch({
      type: SEARCH_RFAS,
      payload: r.xhr,
      meta: { loadingFacets, reset }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: SEARCH_RFAS_SUCCESS,
          payload: body,
          meta: { append: !!nextUrl, loadingFacets }
        });
      })
      .catch(err => {
        dispatch({
          type: SEARCH_RFAS_ERROR,
          error: err,
          meta: { loadingFacets }
        });
        throw err;
      });
  };
}

export const FETCH_RFA = 'FETCH_RFA';
export const FETCH_RFA_SUCCESS = 'FETCH_RFA_SUCCESS';
export const FETCH_RFA_ERROR = 'FETCH_RFA_ERROR';

export function fetchRfa(rfaId, { cookie, baseUrl, cache = true } = {}) {
  return (dispatch, getState) => {
    const { fetchRfaStatus } = getState();

    // cancel previous xhr (if any)
    if (fetchRfaStatus && fetchRfaStatus.xhr) {
      fetchRfaStatus.xhr.abort();
    }

    const url = `/action/${unprefix(getId(rfaId))}`;

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
      type: FETCH_RFA,
      payload: r.xhr,
      meta: { rfaId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_RFA_SUCCESS,
          payload: body,
          meta: { rfaId }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_RFA_ERROR,
          error: err,
          meta: { rfaId }
        });
        throw err;
      });
  };
}

export const CREATE_RFA = 'CREATE_RFA';
export const CREATE_RFA_SUCCESS = 'CREATE_RFA_SUCCESS';
export const CREATE_RFA_ERROR = 'CREATE_RFA_ERROR';

export function createRfa(journalId, rfa) {
  return (dispatch, getState) => {
    journalId = getId(journalId);
    const { user } = getState();

    const action = Object.assign(
      {
        '@type': 'RequestArticleAction',
        agent: getId(user),
        actionStatus: 'PotentialActionStatus',
        object: journalId
      },
      rfa
    );

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: action
    });

    dispatch({
      type: CREATE_RFA,
      payload: action,
      meta: { journalId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: CREATE_RFA_SUCCESS,
          payload: body,
          meta: { journalId }
        });
        return body;
      })
      .catch(err => {
        dispatch({
          type: CREATE_RFA_ERROR,
          error: err,
          meta: { journalId }
        });
        throw err;
      });
  };
}

export const UPDATE_RFA = 'UPDATE_RFA';
export const UPDATE_RFA_SUCCESS = 'UPDATE_RFA_SUCCESS';
export const UPDATE_RFA_ERROR = 'UPDATE_RFA_ERROR';

export function updateRfa(journalId, rfa, updatePayload) {
  return (dispatch, getState) => {
    journalId = getId(journalId);
    const rfaId = getId(rfaId);

    const action = Object.assign({}, rfa, updatePayload);

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: action
    });

    dispatch({
      type: UPDATE_RFA,
      payload: action,
      meta: { journalId, rfaId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: UPDATE_RFA_SUCCESS,
          payload: body,
          meta: { journalId, rfaId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_RFA_ERROR,
          error: err,
          meta: { journalId, rfaId }
        });
        throw err;
      });
  };
}

export const DELETE_RFA = 'DELETE_RFA';
export const DELETE_RFA_SUCCESS = 'DELETE_RFA_SUCCESS';
export const DELETE_RFA_ERROR = 'DELETE_RFA_ERROR';

export function deleteRfa(journalId, rfaId) {
  return (dispatch, getState) => {
    journalId = getId(journalId);
    rfaId = getId(rfaId);

    const r = xhr({
      url: `/action/${unprefix(rfaId)}`,
      method: 'DELETE',
      json: true
    });

    dispatch({
      type: DELETE_RFA,
      payload: rfaId,
      meta: { journalId, rfaId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: DELETE_RFA_SUCCESS,
          payload: body,
          meta: { journalId, rfaId }
        });
      })
      .catch(err => {
        dispatch({
          type: DELETE_RFA_ERROR,
          error: err,
          meta: { journalId, rfaId }
        });
        throw err;
      });
  };
}
