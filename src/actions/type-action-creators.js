import isClient from 'is-client';
import querystring from 'querystring';
import { getId } from '@scipe/jsonld';
import {
  xhr,
  escapeLucene,
  createId,
  createAuthorGuidelines
} from '@scipe/librarian';

export const FETCH_PERIODICAL_PUBLICATION_TYPES =
  'FETCH_PERIODICAL_PUBLICATION_TYPES';
export const FETCH_PERIODICAL_PUBLICATION_TYPES_SUCCESS =
  'FETCH_PERIODICAL_PUBLICATION_TYPES_SUCCESS';
export const FETCH_PERIODICAL_PUBLICATION_TYPES_ERROR =
  'FETCH_PERIODICAL_PUBLICATION_TYPES_ERROR';

export function fetchPeriodicalPublicationTypes(
  periodicalId,
  { cookie, baseUrl } = {}
) {
  periodicalId = getId(periodicalId);

  return (dispatch, getState) => {
    const { fetchPeriodicalPublicationTypesStatus } = getState();

    // cancel previous xhr (if any)
    if (fetchPeriodicalPublicationTypesStatus.xhr) {
      fetchPeriodicalPublicationTypesStatus.xhr.abort();
    }

    const qs = {
      query: `isPublicationTypeOf:"${escapeLucene(
        periodicalId
      )}" NOT publicationTypeStatus:"ArchivedPublicationTypeStatus"`,
      includeDocs: true,
      hydrate: JSON.stringify(['eligibleWorkflow'])
    };

    const url = `/type?${querystring.stringify(qs)}`;

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
      type: FETCH_PERIODICAL_PUBLICATION_TYPES,
      payload: r.xhr,
      meta: { periodicalId }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_PERIODICAL_PUBLICATION_TYPES_SUCCESS,
          payload: body,
          meta: { periodicalId }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_PERIODICAL_PUBLICATION_TYPES_ERROR,
          error: err,
          meta: { periodicalId }
        });
      });
  };
}

export const CREATE_PERIODICAL_PUBLICATION_TYPE =
  'CREATE_PERIODICAL_PUBLICATION_TYPE';
export const CREATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS =
  'CREATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS';
export const CREATE_PERIODICAL_PUBLICATION_TYPE_ERROR =
  'CREATE_PERIODICAL_PUBLICATION_TYPE_ERROR';

export function createPeriodicalPublicationType(
  periodicalId,
  publicationType = {}
) {
  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@id': createId('action', action, periodicalId)['@id'],
      '@type': 'CreatePublicationTypeAction',
      agent: getId(user),
      startTime: new Date().toISOString(),
      actionStatus: 'CompletedActionStatus',
      object: periodicalId,
      result: {
        '@type': 'PublicationType',
        objectSpecification: {
          '@type': 'Graph',
          mainEntity: {
            '@type': 'ScholarlyArticle',
            hasPart: createAuthorGuidelines() // list of WebPageElement
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
      type: CREATE_PERIODICAL_PUBLICATION_TYPE,
      payload: action,
      meta: { periodicalId, xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: CREATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS,
          payload: action,
          meta: { periodicalId }
        });
      })
      .catch(err => {
        dispatch({
          type: CREATE_PERIODICAL_PUBLICATION_TYPE_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId },
          error: err
        });
      });
  };
}

export const UPDATE_PERIODICAL_PUBLICATION_TYPE =
  'UPDATE_PERIODICAL_PUBLICATION_TYPE';
export const UPDATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS =
  'UPDATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS';
export const UPDATE_PERIODICAL_PUBLICATION_TYPE_ERROR =
  'UPDATE_PERIODICAL_PUBLICATION_TYPE_ERROR';

export function updatePeriodicalPublicationType(
  periodicalId,
  publicationTypeId,
  updatePayload
) {
  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@id': createId('action', action, periodicalId)['@id'],
      '@type': 'UpdateAction',
      agent: getId(user),
      startTime: new Date().toISOString(),
      actionStatus: 'CompletedActionStatus',
      object: updatePayload,
      targetCollection: publicationTypeId
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: UPDATE_PERIODICAL_PUBLICATION_TYPE,
      payload: action,
      meta: { periodicalId, publicationTypeId, xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: UPDATE_PERIODICAL_PUBLICATION_TYPE_SUCCESS,
          payload: action,
          meta: { periodicalId, publicationTypeId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_PERIODICAL_PUBLICATION_TYPE_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId, publicationTypeId },
          error: err
        });
      });
  };
}

export const ARCHIVE_PERIODICAL_PUBLICATION_TYPE =
  'ARCHIVE_PERIODICAL_PUBLICATION_TYPE';
export const ARCHIVE_PERIODICAL_PUBLICATION_TYPE_SUCCESS =
  'ARCHIVE_PERIODICAL_PUBLICATION_TYPE_SUCCESS';
export const ARCHIVE_PERIODICAL_PUBLICATION_TYPE_ERROR =
  'ARCHIVE_PERIODICAL_PUBLICATION_TYPE_ERROR';

export function archivePeriodicalPublicationType(
  periodicalId,
  publicationTypeId
) {
  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@id': createId('action', action, periodicalId)['@id'],
      '@type': 'ArchiveAction',
      agent: getId(user),
      startTime: new Date().toISOString(),
      actionStatus: 'CompletedActionStatus',
      object: publicationTypeId
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: ARCHIVE_PERIODICAL_PUBLICATION_TYPE,
      payload: action,
      meta: { periodicalId, publicationTypeId, xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: ARCHIVE_PERIODICAL_PUBLICATION_TYPE_SUCCESS,
          payload: action,
          meta: { periodicalId, publicationTypeId }
        });
      })
      .catch(err => {
        dispatch({
          type: ARCHIVE_PERIODICAL_PUBLICATION_TYPE_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId, publicationTypeId },
          error: err
        });
      });
  };
}

export const TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS =
  'TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS';
export const TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_SUCCESS =
  'TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_SUCCESS';
export const TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_ERROR =
  'TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_ERROR';

export function togglePeriodicalPublicationTypeStatus(
  periodicalId,
  publicationTypeId,
  activate
) {
  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@type': activate ? 'ActivateAction' : 'DeactivateAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: publicationTypeId
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS,
      payload: action,
      meta: { periodicalId, xhr: r.xhr, publicationTypeId }
    });
    return r
      .then(({ body: action }) => {
        dispatch({
          type: TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_SUCCESS,
          payload: action,
          meta: { periodicalId, publicationTypeId }
        });
      })
      .catch(err => {
        dispatch({
          type: TOGGLE_PERIODICAL_PUBLICATION_TYPE_STATUS_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId, publicationTypeId },
          error: err
        });
      });
  };
}
