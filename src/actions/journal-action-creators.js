import isClient from 'is-client';
import querystring from 'querystring';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import {
  xhr,
  escapeLucene,
  createId,
  getDefaultPeriodicalDigitalDocumentPermissions,
  parseNextUrl
} from '@scipe/librarian';
import { getId, arrayify, unprefix } from '@scipe/jsonld';
import { upload } from './encoding-action-creators';
import { getJournalsQuery, getLoadingFacets } from '../utils/search';
import { EXPLORER_JOURNALS_FACETS } from '../constants';

export const CREATE_JOURNAL = 'CREATE_JOURNAL';
export const CREATE_JOURNAL_SUCCESS = 'CREATE_JOURNAL_SUCCESS';
export const CREATE_JOURNAL_ERROR = 'CREATE_JOURNAL_ERROR';

export function createJournal(periodical, history) {
  return (dispatch, getState) => {
    const { user, droplets } = getState();
    const profile = droplets && droplets[getId(user)];

    const createPeriodicalAction = {
      '@type': 'CreatePeriodicalAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: getId(periodical.publisher),
      result: Object.assign(
        {
          hasDigitalDocumentPermission: getDefaultPeriodicalDigitalDocumentPermissions(
            user
          ),
          editor: {
            '@id': '_:editorialOffice',
            '@type': 'ContributorRole',
            name: 'editorial office',
            roleName: 'editor',
            editor: getId(user),
            startDate: new Date().toISOString(),
            roleContactPoint: {
              '@type': 'ContactPoint',
              email: profile && profile.email
            }
          }
        },
        periodical
      )
    };

    dispatch({
      type: CREATE_JOURNAL,
      payload: createPeriodicalAction
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: createPeriodicalAction
    })
      .then(({ body: createPeriodicalAction }) => {
        dispatch({
          type: CREATE_JOURNAL_SUCCESS,
          payload: createPeriodicalAction
        });
        history.replace(
          `/settings/journal/${unprefix(getId(createPeriodicalAction.result))}`
        );
      })
      .catch(err => {
        dispatch({
          type: CREATE_JOURNAL_ERROR,
          payload: Object.assign({}, createPeriodicalAction, {
            actionStatus: 'FailedActionStatus'
          }),
          error: err
        });
      });
  };
}

export const RESET_CREATE_JOURNAL_STATUS = 'RESET_CREATE_JOURNAL_STATUS';

export function resetCreateJournalStatus() {
  return {
    type: RESET_CREATE_JOURNAL_STATUS
  };
}

export const UPDATE_JOURNAL = 'UPDATE_JOURNAL';
export const UPDATE_JOURNAL_SUCCESS = 'UPDATE_JOURNAL_SUCCESS';
export const UPDATE_JOURNAL_ERROR = 'UPDATE_JOURNAL_ERROR';

export function updateJournal(
  periodicalId,
  upd,
  targetCollection // can be a `TargetRole` if `undefined` falls back to `periodicalId`
) {
  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@type': 'UpdateAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: upd,
      targetCollection: targetCollection || getId(periodicalId)
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: UPDATE_JOURNAL,
      payload: action,
      meta: { periodicalId, xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: UPDATE_JOURNAL_SUCCESS,
          payload: action,
          meta: { periodicalId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_JOURNAL_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId },
          error: err
        });
      });
  };
}

export const UPSERT_JOURNAL_STYLE = 'UPSERT_JOURNAL_STYLE';
export const UPSERT_JOURNAL_STYLE_SUCCESS = 'UPSERT_JOURNAL_STYLE_SUCCESS';
export const UPSERT_JOURNAL_STYLE_ERROR = 'UPSERT_JOURNAL_STYLE_ERROR';

export function upsertJournalStyle(periodical, { styleId, name, value } = {}) {
  return (dispatch, getState) => {
    const { user } = getState();
    const periodicalId = getId(periodical);

    let updateAction;
    if (styleId) {
      // update existing style
      updateAction = {
        '@type': 'UpdateAction',
        agent: getId(user),
        actionStatus: 'CompletedActionStatus',
        object: pickBy({ name, value }),
        targetCollection: {
          '@type': 'TargetRole',
          hasSelector: {
            '@type': 'NodeSelector',
            selectedProperty: 'style',
            node: getId(styleId)
          },
          targetCollection: getId(periodical)
        }
      };
    } else {
      // create new style
      updateAction = {
        '@type': 'UpdateAction',
        agent: getId(user),
        actionStatus: 'CompletedActionStatus',
        object: {
          style: arrayify(periodical.style)
            .filter(style => {
              return !name || style.name !== name;
            })
            .concat(
              pickBy({
                '@type': 'CssVariable',
                name,
                value
              })
            )
        },
        targetCollection: periodicalId
      };
    }

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: updateAction
    });

    dispatch({
      type: UPSERT_JOURNAL_STYLE,
      payload: updateAction,
      meta: { periodicalId, xhr: r.xhr }
    });

    return r
      .then(({ body: updateAction }) => {
        dispatch({
          type: UPSERT_JOURNAL_STYLE_SUCCESS,
          payload: updateAction,
          meta: { periodicalId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPSERT_JOURNAL_STYLE_ERROR,
          payload: Object.assign({}, updateAction, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId },
          error: err
        });
      });
  };
}

export const RESET_JOURNAL_STYLE_OR_ASSET = 'RESET_JOURNAL_STYLE_OR_ASSET';
export const RESET_JOURNAL_STYLE_OR_ASSET_SUCCESS =
  'RESET_JOURNAL_STYLE_OR_ASSET_SUCCESS';
export const RESET_JOURNAL_STYLE_OR_ASSET_ERROR =
  'RESET_JOURNAL_STYLE_OR_ASSET_ERROR';

export function resetJournalStyleOrAsset(
  periodical,
  prop, // `style` or `logo`
  deletedNames
) {
  const periodicalId = getId(periodical);

  return (dispatch, getState) => {
    const { user } = getState();

    let object;

    const nextValues = arrayify(periodical[prop]).filter(
      resource =>
        !arrayify(deletedNames).some(
          deletedName => resource.name === deletedName
        )
    );
    object = { [prop]: nextValues.length ? nextValues : null };

    const updateAction = {
      '@type': 'UpdateAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object,
      targetCollection: periodicalId
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: updateAction
    });

    dispatch({
      type: RESET_JOURNAL_STYLE_OR_ASSET,
      payload: updateAction,
      meta: { periodicalId, xhr: r.xhr }
    });

    return r
      .then(({ body: updateAction }) => {
        dispatch({
          type: RESET_JOURNAL_STYLE_OR_ASSET_SUCCESS,
          payload: updateAction,
          meta: { periodicalId }
        });
      })
      .catch(err => {
        dispatch({
          type: RESET_JOURNAL_STYLE_OR_ASSET_ERROR,
          payload: Object.assign({}, updateAction, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId },
          error: err
        });
      });
  };
}

export const UPDATE_JOURNAL_LOGO = 'UPDATE_JOURNAL_LOGO';
export const UPDATE_JOURNAL_LOGO_SUCCESS = 'UPDATE_JOURNAL_LOGO_SUCCESS';
export const UPDATE_JOURNAL_LOGO_ERROR = 'UPDATE_JOURNAL_LOGO_ERROR';

export function updateJournalLogo(periodical, logoName, file) {
  return (dispatch, getState) => {
    const { user } = getState();

    dispatch({
      type: UPDATE_JOURNAL_LOGO,
      meta: { periodicalId: getId(periodical) }
    });

    let logo = arrayify(periodical.logo).find(logo => logo.name === logoName);

    // Promise that resolve to the logo to update (it takes care of creating the logo resource if it doesn't exists yet)
    const pLogo = Promise.resolve().then(() => {
      if (getId(logo)) {
        return logo;
      }

      logo = Object.assign({ '@type': 'Image', name: logoName });

      return xhr({
        url: '/action',
        method: 'POST',
        json: true,
        body: {
          '@type': 'UpdateAction',
          agent: getId(user),
          actionStatus: 'CompletedActionStatus',
          object: {
            logo: arrayify(periodical.logo)
              .filter(logo => logo.name !== logoName)
              .concat(logo)
          },
          targetCollection: getId(periodical)
        }
      }).then(({ body: updateAction }) => {
        const updatedLogo = updateAction.result.logo.find(
          logo => logo.name === logoName
        );
        return updatedLogo;
      });
    });

    // The changes feed will pickup the updated periodical document when the
    // worker applies it.
    return pLogo
      .then(logo => {
        return dispatch(
          upload(file, getId(periodical), getId(logo), { update: true })
        );
      })
      .then(uploadAction => {
        dispatch({
          type: UPDATE_JOURNAL_LOGO_SUCCESS,
          meta: { periodicalId: getId(periodical) },
          payload: uploadAction
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_JOURNAL_LOGO_ERROR,
          error: err,
          meta: { periodicalId: getId(periodical) }
        });
      });
  };
}

export const UPDATE_JOURNAL_BANNER = 'UPDATE_JOURNAL_BANNER';
export const UPDATE_JOURNAL_BANNER_SUCCESS = 'UPDATE_JOURNAL_BANNER_SUCCESS';
export const UPDATE_JOURNAL_BANNER_ERROR = 'UPDATE_JOURNAL_BANNER_ERROR';

/**
 * If a new style needs to be created, `style` will not have an @id
 */
export function updateJournalBanner(periodical, style, file) {
  const periodicalId = getId(periodical);

  return (dispatch, getState) => {
    const { user } = getState();

    dispatch({
      type: UPDATE_JOURNAL_BANNER,
      meta: { periodicalId }
    });

    style =
      arrayify(periodical.style).find(_style => _style.name === style.name) ||
      style;

    // Promise that resolve to the style to update (it takes care of creating that style if it doesn't exists yet)
    const pStyle = Promise.resolve().then(() => {
      if (getId(style)) {
        return style;
      }

      // no @id => we need to add the style to the journal before uploading the banner
      style = Object.assign({ '@type': 'CssVariable' }, style);

      return xhr({
        url: '/action',
        method: 'POST',
        json: true,
        body: {
          '@type': 'UpdateAction',
          agent: getId(user),
          actionStatus: 'CompletedActionStatus',
          object: {
            style: arrayify(periodical.style)
              .filter(_style => _style.name !== style.name)
              .concat(style)
          },
          targetCollection: getId(periodical)
        }
      }).then(({ body: updateAction }) => {
        const updatedStyle = arrayify(updateAction.result.style).find(
          _style => _style.name === style.name
        );

        return updatedStyle;
      });
    });

    return pStyle
      .then(style => {
        // The changes feed will pickup the updated periodical document when the
        // worker applies it.
        return dispatch(
          upload(file, getId(periodical), getId(style), { update: true })
        );
      })
      .then(uploadAction => {
        dispatch({
          type: UPDATE_JOURNAL_BANNER_SUCCESS,
          meta: { periodicalId },
          payload: uploadAction
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_JOURNAL_BANNER_ERROR,
          error: err,
          meta: { periodicalId }
        });
      });
  };
}

export const ADD_JOURNAL_SUBJECT = 'ADD_JOURNAL_SUBJECT';
export const ADD_JOURNAL_SUBJECT_SUCCESS = 'ADD_JOURNAL_SUBJECT_SUCCESS';
export const ADD_JOURNAL_SUBJECT_ERROR = 'ADD_JOURNAL_SUBJECT_ERROR';

export function addJournalSubject(periodical, subject) {
  return (dispatch, getState) => {
    const { user } = getState();

    const updateAction = {
      '@type': 'UpdateAction',
      agent: getId(user),
      actionStatus: 'CompletedActionStatus',
      object: {
        about: arrayify(periodical.about)
          .filter(about => getId(about) !== getId(subject))
          .concat(pick(subject, ['@id', '@type', 'name']))
      },
      targetCollection: getId(periodical)
    };

    dispatch({
      type: ADD_JOURNAL_SUBJECT,
      payload: updateAction,
      meta: { periodicalId: getId(periodical) }
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: updateAction
    })
      .then(({ body: updateAction }) => {
        dispatch({
          type: ADD_JOURNAL_SUBJECT_SUCCESS,
          payload: updateAction,
          meta: { periodicalId: getId(periodical) }
        });
      })
      .catch(err => {
        dispatch({
          type: ADD_JOURNAL_SUBJECT_ERROR,
          payload: Object.assign({}, updateAction, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId: getId(periodical) },
          error: err
        });
      });
  };
}

export const DELETE_JOURNAL_SUBJECT = 'DELETE_JOURNAL_SUBJECT';
export const DELETE_JOURNAL_SUBJECT_SUCCESS = 'DELETE_JOURNAL_SUBJECT_SUCCESS';
export const DELETE_JOURNAL_SUBJECT_ERROR = 'DELETE_JOURNAL_SUBJECT_ERROR';

export function deleteJournalSubject(periodical, subject) {
  return (dispatch, getState) => {
    const { user } = getState();
    const updateAction = {
      '@type': 'UpdateAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: {
        about: arrayify(periodical.about).filter(
          about => getId(about) !== getId(subject)
        )
      },
      targetCollection: getId(periodical)
    };

    dispatch({
      type: DELETE_JOURNAL_SUBJECT,
      payload: updateAction,
      meta: { periodicalId: getId(periodical) }
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: updateAction
    })
      .then(({ body: updateAction }) => {
        dispatch({
          type: DELETE_JOURNAL_SUBJECT_SUCCESS,
          payload: updateAction,
          meta: { periodicalId: getId(periodical) }
        });
      })
      .catch(err => {
        dispatch({
          type: DELETE_JOURNAL_SUBJECT_ERROR,
          payload: Object.assign({}, updateAction, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId: getId(periodical) },
          error: err
        });
      });
  };
}

export const FETCH_JOURNAL = 'FETCH_JOURNAL';
export const FETCH_JOURNAL_SUCCESS = 'FETCH_JOURNAL_SUCCESS';
export const FETCH_JOURNAL_ERROR = 'FETCH_JOURNAL_ERROR';

export function fetchJournal(
  periodicalIdOrHostname,
  { homepage, cookie, baseUrl } = {}
) {
  periodicalIdOrHostname = getId(periodicalIdOrHostname);

  return (dispatch, getState) => {
    const { fetchJournalStatus } = getState();

    // cancel previous xhr (if any)
    if (fetchJournalStatus.xhr) {
      fetchJournalStatus.xhr.abort();
    }

    const qs = {
      query: `@id:"${escapeLucene(
        periodicalIdOrHostname
      )}" OR hostname:"${escapeLucene(periodicalIdOrHostname)}"`,
      hydrate: JSON.stringify(
        ['author', 'reviewer', 'editor', 'producer', 'contributor'].concat(
          homepage
            ? ['publicationTypeCoverage', 'potentialWorkflow', 'workFeatured']
            : []
        )
      ),
      potentialActions: 'bare', // needed for the WorkflowSpecification
      includeDocs: true,
      limit: 1
    };

    const url = `/periodical?${querystring.stringify(qs)}`;

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
      type: FETCH_JOURNAL,
      payload: r.xhr,
      meta: { id: periodicalIdOrHostname, homepage: !!homepage }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_JOURNAL_SUCCESS,
          payload: body,
          meta: { id: periodicalIdOrHostname, homepage: !!homepage }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_JOURNAL_ERROR,
          error: err,
          meta: { id: periodicalIdOrHostname, homepage: !!homepage }
        });
      });
  };
}

export const JOURNAL_STAFF_ACTION = 'JOURNAL_STAFF_ACTION';
export const JOURNAL_STAFF_ACTION_SUCCESS = 'JOURNAL_STAFF_ACTION_SUCCESS';
export const JOURNAL_STAFF_ACTION_ERROR = 'JOURNAL_STAFF_ACTION_ERROR';

export function postJournalStaffAction(periodicalId, agentId, action) {
  periodicalId = getId(periodicalId);

  return (dispatch, getState) => {
    if (!action['@id']) {
      action = Object.assign(
        { '@id': createId('action', null, periodicalId)['@id'] },
        action
      );
    }

    dispatch({
      type: JOURNAL_STAFF_ACTION,
      payload: action,
      meta: { periodicalId, agentId }
    });

    return xhr({
      url: '/action?mode=document', // mode=document -> so that UpdateAction results are the periodiocal and not just a role for instance
      method: 'POST',
      json: true,
      body: action
    })
      .then(({ body: action }) => {
        dispatch({
          type: JOURNAL_STAFF_ACTION_SUCCESS,
          payload: action,
          meta: { periodicalId, agentId }
        });
      })
      .catch(err => {
        dispatch({
          type: JOURNAL_STAFF_ACTION_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId, agentId },
          error: err
        });
      });
  };
}

export const UPDATE_JOURNAL_ACCESS = 'UPDATE_JOURNAL_ACCESS';
export const UPDATE_JOURNAL_ACCESS_SUCCESS =
  'UPDATE_JOURNAL_ACCESS_ACTION_SUCCESS';
export const UPDATE_JOURNAL_ACCESS_ERROR = 'UPDATE_JOURNAL_ACCESS_ERROR';

export function updateJournalAccess(periodicalId, action) {
  return (dispatch, getState) => {
    const { user } = getState();
    action = Object.assign(
      {
        '@id': createId('action', action, periodicalId)['@id'],
        agent: getId(user),
        startTime: new Date().toISOString(),
        actionStatus: 'CompletedActionStatus'
      },
      action
    );

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: UPDATE_JOURNAL_ACCESS,
      payload: action,
      meta: { periodicalId, xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: UPDATE_JOURNAL_ACCESS_SUCCESS,
          payload: action,
          meta: { periodicalId }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_JOURNAL_ACCESS_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { periodicalId },
          error: err
        });
      });
  };
}

export const SEARCH_JOURNALS = 'SEARCH_JOURNALS';
export const SEARCH_JOURNALS_SUCCESS = 'SEARCH_JOURNALS_SUCCESS';
export const SEARCH_JOURNALS_ERROR = 'SEARCH_JOURNALS_ERROR';

export function searchJournals({
  history,
  nextUrl,
  query = {},
  nextQuery,
  cookie,
  baseUrl,
  reset,
  cache = true
} = {}) {
  return (dispatch, getState) => {
    const { user, journalsFacetMap, journalsSearchResults } = getState();

    // cancel previous xhr (if any)
    if (journalsSearchResults && journalsSearchResults.xhr) {
      journalsSearchResults.xhr.abort();
    }

    const facets = EXPLORER_JOURNALS_FACETS;

    let url, json;
    if (nextUrl) {
      const parsed = parseNextUrl(nextUrl);
      url = parsed.url;
      json = parsed.body;
    } else {
      const q = getJournalsQuery(
        user,
        nextQuery || query,
        journalsFacetMap,
        facets
      );

      json = {
        sort: '-dateCreated',
        counts: facets,
        includeDocs: true,
        query: q,
        hydrate: [
          'creator',
          'author',
          'reviewer',
          'contributor',
          'editor',
          'producer'
        ],
        limit: 10
      };

      const qs = { cache };

      url = `/periodical?${querystring.stringify(qs)}`;
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
      type: SEARCH_JOURNALS,
      payload: r.xhr,
      meta: { loadingFacets, reset }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: SEARCH_JOURNALS_SUCCESS,
          payload: body,
          meta: { append: !!nextUrl, loadingFacets }
        });
      })
      .catch(err => {
        dispatch({
          type: SEARCH_JOURNALS_ERROR,
          error: err,
          meta: { loadingFacets }
        });
        throw err;
      });
  };
}

// Note this is used outside of redux in `<ApplyModal />`
// => be sure that promise return a value or rethrow error
const APPLY_TO_JOURNAL = 'APPLY_TO_JOURNAL';
const APPLY_TO_JOURNAL_SUCCESS = 'APPLY_TO_JOURNAL_SUCCESS';
const APPLY_TO_JOURNAL_ERROR = 'APPLY_TO_JOURNAL_ERROR';
export function applyToJournal(
  userId,
  journalId,
  { roleName = 'reviewer' } = {}
) {
  userId = getId(userId);
  journalId = getId(journalId);

  return (dispatch, getState) => {
    const action = {
      '@type': 'ApplyAction',
      agent: {
        '@type': 'ContributorRole',
        roleName,
        agent: userId
      },
      actionStatus: 'ActiveActionStatus',
      object: journalId
    };

    dispatch({
      type: APPLY_TO_JOURNAL,
      payload: action,
      meta: { journalId, userId }
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    })
      .then(({ body: action }) => {
        dispatch({
          type: APPLY_TO_JOURNAL_SUCCESS,
          payload: action,
          meta: { journalId, userId }
        });
        return action;
      })
      .catch(err => {
        dispatch({
          type: APPLY_TO_JOURNAL_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { journalId, userId },
          error: err
        });
        throw err;
      });
  };
}
