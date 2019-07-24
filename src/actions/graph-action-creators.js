import { basename, extname } from 'path';
import pickBy from 'lodash/pickBy';
import isClient from 'is-client';
import querystring from 'querystring';
import { unprefix, getId, arrayify } from '@scipe/jsonld';
import {
  parseNextUrl,
  createId,
  getScopeId,
  xhr,
  getCreativeWorkTypeFromMime,
  getRootPartId,
  getAgentId,
  remapRole,
  getMetaActionParticipants
} from '@scipe/librarian';
import { API_LABELS } from '@scipe/ui';
import { upload } from './encoding-action-creators';
import { createActionMapSelector } from '../selectors/graph-selectors';
import {
  getGraphQuery,
  getSifterQuery,
  getLoadingFacets,
  getDashboardRanges
} from '../utils/search';
import config from '../utils/config';
import { DASHBOARD_FACETS, SIFTER_FACETS } from '../constants';

const HYDRATE = [
  'agent',
  'additionalType', // publication types
  'participant',
  'recipient',
  'creator',
  'author',
  'reviewer',
  'contributor',
  'editor',
  'producer',
  'workFeatured',
  'hasPart', // needed to get the articles part of a special issue,
  'isPartOf', // journal, issue
  'resultOf', // instance of the editorial workflow
  'workflow' // template of the editorial workflow
];

const HYDRATE_DASHBOARD = [
  'additionalType', // publication types
  'workFeatured',
  'isPartOf', // journal, issue
  'resultOf', // instance of the editorial workflow
  'workflow' // template of the editorial workflow
];

export const CREATE_GRAPH = 'CREATE_GRAPH';
export const CREATE_GRAPH_SUCCESS = 'CREATE_GRAPH_SUCCESS';
export const CREATE_GRAPH_ERROR = 'CREATE_GRAPH_ERROR';

export function createGraph(
  graph,
  journalId,
  workflowId,
  editorialOfficeRoleId,
  publicationTypeId,
  { history } = {}
) {
  return (dispatch, getState) => {
    const { user } = getState();

    const createGraphAction = pickBy(
      {
        '@type': 'CreateGraphAction',
        actionStatus: 'CompletedActionStatus',
        agent: {
          roleName: 'author',
          agent: getId(user)
        },
        participant: getId(editorialOfficeRoleId),
        object: getId(workflowId),
        result: pickBy(
          Object.assign(
            {
              '@type': 'Graph'
            },
            graph,
            {
              author: {
                '@type': 'ContributorRole',
                roleName: 'author',
                author: getId(user)
              },
              editor: getId(editorialOfficeRoleId),
              additionalType: getId(publicationTypeId)
            }
          )
        )
      },
      x => x !== undefined
    );

    dispatch({
      type: CREATE_GRAPH,
      payload: createGraphAction
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: createGraphAction
    })
      .then(({ body: createGraphAction }) => {
        return dispatch(
          searchGraphs({
            history,
            cache: false // force a cache refresh
          })
        ).then(() => {
          dispatch({
            type: CREATE_GRAPH_SUCCESS,
            payload: createGraphAction
          });

          history.replace(
            `/${unprefix(getId(journalId))}/${unprefix(
              getScopeId(graph)
            )}/submission`
          );
        });
      })
      .catch(err => {
        dispatch({
          type: CREATE_GRAPH_ERROR,
          error: err,
          payload: createGraphAction
        });
      });
  };
}

export const DELETE_GRAPH = 'DELETE_GRAPH';
export const DELETE_GRAPH_SUCCESS = 'DELETE_GRAPH_SUCCESS';
export const DELETE_GRAPH_ERROR = 'DELETE_GRAPH_ERROR';

export function deleteGraph(graphId, { history, query } = {}) {
  return (dispatch, getState) => {
    const { fetchGraphStatusMap } = getState();
    const scopeId = getScopeId(graphId);
    if (fetchGraphStatusMap[scopeId] && fetchGraphStatusMap[scopeId].xhr) {
      fetchGraphStatusMap[scopeId].xhr.abort();
    }

    dispatch({
      type: DELETE_GRAPH,
      payload: graphId,
      meta: { scopeId }
    });

    return xhr({
      url: `/graph/${unprefix(scopeId)}`,
      method: 'DELETE',
      json: true
    })
      .then(({ body: deleteAction }) => {
        dispatch({
          type: DELETE_GRAPH_SUCCESS,
          payload: deleteAction,
          meta: { scopeId }
        });
        return dispatch(
          searchGraphs({
            history,
            query,
            cache: false // force a cache refresh
          })
        );
      })
      .catch(err => {
        dispatch({
          type: DELETE_GRAPH_ERROR,
          payload: graphId,
          meta: { scopeId },
          error: err
        });
      });
  };
}

export const CREATE_TAG = 'CREATE_TAG';
export const CREATE_TAG_SUCCESS = 'CREATE_TAG_SUCCESS';
export const CREATE_TAG_ERROR = 'CREATE_TAG_ERROR';

export function createTag(
  graphId,
  tagName,
  audienceTypes,
  role,
  { query } = {}
) {
  return (dispatch, getState) => {
    const { user } = getState();

    const tagAction = {
      '@id': createId('action', null, graphId)['@id'],
      '@type': 'TagAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(role) || getId(user),
      object: graphId,
      result: {
        '@type': 'Tag',
        name: tagName
      }
    };

    audienceTypes = arrayify(audienceTypes);
    if (audienceTypes.length) {
      tagAction.participant = audienceTypes.map(audienceType => {
        return {
          '@type': 'Audience',
          audienceType
        };
      });
    }

    dispatch({
      type: CREATE_TAG,
      payload: tagAction,
      meta: { graphId, workflowActionStatusId: getId(tagAction) }
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: tagAction
    })
      .then(({ body: tagAction }) => {
        dispatch({
          type: CREATE_TAG_SUCCESS,
          payload: tagAction,
          meta: { graphId, workflowActionStatusId: getId(tagAction) }
        });
        return dispatch(
          searchGraphs({
            query,
            cache: false // force a cache refresh
          })
        );
      })
      .catch(err => {
        dispatch({
          type: CREATE_TAG_ERROR,
          payload: tagAction,
          meta: { graphId, workflowActionStatusId: getId(tagAction) },
          error: err
        });
      });
  };
}

export const DELETE_TAG = 'DELETE_TAG';
export const DELETE_TAG_SUCCESS = 'DELETE_TAG_SUCCESS';
export const DELETE_TAG_ERROR = 'DELETE_TAG_ERROR';

export function deleteTag(graphId, tagActionId, { query } = {}) {
  return (dispatch, getState) => {
    const actionMapSelector = createActionMapSelector();
    const actionMap = actionMapSelector(getState(), { graphId });

    if (actionMap) {
      const tagAction = actionMap[getId(tagActionId)];
      if (tagAction) {
        dispatch({
          type: DELETE_TAG,
          payload: tagAction,
          meta: { graphId, workflowActionStatusId: getId(tagAction) }
        });

        return xhr({
          url: `/action/${unprefix(tagActionId)}`,
          method: 'DELETE',
          json: true
        })
          .then(({ body: deleteAction }) => {
            dispatch({
              type: DELETE_TAG_SUCCESS,
              payload: tagAction,
              meta: { graphId, workflowActionStatusId: getId(tagAction) }
            });
            return dispatch(
              searchGraphs({
                query,
                cache: false // force a cache refresh
              })
            );
          })
          .catch(err => {
            dispatch({
              type: DELETE_TAG_ERROR,
              payload: tagAction,
              meta: { graphId, workflowActionStatusId: getId(tagAction) },
              error: err
            });
          });
      }
    }
  };
}

export const SEARCH_GRAPHS = 'SEARCH_GRAPHS';
export const SEARCH_GRAPHS_SUCCESS = 'SEARCH_GRAPHS_SUCCESS';
export const SEARCH_GRAPHS_ERROR = 'SEARCH_GRAPHS_ERROR';

export function searchGraphs({
  history,
  nextUrl,
  query = {},
  issueId, // if specified we restrict the search to that issue
  nextQuery,
  cookie,
  baseUrl,
  reset,
  cache = true
} = {}) {
  return (dispatch, getState) => {
    const {
      user,
      graphFacetMap,
      homepage,
      graphSearchResults,
      fetchGraphStatusMap
    } = getState();
    const { isJournalSubdomain } = config;

    // cancel previous xhr (if any)
    if (graphSearchResults && graphSearchResults.xhr) {
      graphSearchResults.xhr.abort();
    }
    if (fetchGraphStatusMap) {
      Object.keys(fetchGraphStatusMap).forEach(scopeId => {
        if (fetchGraphStatusMap[scopeId].xhr) {
          fetchGraphStatusMap[scopeId].xhr.abort();
        }
      });
    }

    let facets, ranges, hydrate;
    if (isJournalSubdomain) {
      facets = SIFTER_FACETS;
      hydrate = HYDRATE;
    } else {
      ranges = getDashboardRanges();
      facets = DASHBOARD_FACETS;
      hydrate = HYDRATE_DASHBOARD;
    }

    let url, json;
    if (nextUrl) {
      const parsed = parseNextUrl(nextUrl);
      url = parsed.url;
      json = parsed.body;
    } else {
      const q = isJournalSubdomain
        ? getSifterQuery(homepage, nextQuery || query, graphFacetMap, facets, {
            issueId
          })
        : getGraphQuery(user, nextQuery || query, graphFacetMap, facets);

      json = {
        sort: isJournalSubdomain ? '-datePublished' : '-dateCreated',
        counts: ranges ? facets.filter(facet => !(facet in ranges)) : facets,
        ranges: ranges,
        includeDocs: true,
        query: q,
        nodes: true,
        potentialActions: isJournalSubdomain ? false : 'dashboard',
        hydrate,
        addActiveRoleIds: true,
        limit: isJournalSubdomain ? 10 : 5 // dashboard is data heavy so we fetch few documents
      };

      const qs = { cache };
      url = `/graph?${querystring.stringify(qs)}`;
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
      type: SEARCH_GRAPHS,
      payload: r.xhr,
      meta: { loadingFacets, reset, json, url }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: SEARCH_GRAPHS_SUCCESS,
          payload: body,
          meta: { append: !!nextUrl, loadingFacets, json, url }
        });
      })
      .catch(err => {
        dispatch({
          type: SEARCH_GRAPHS_ERROR,
          error: err,
          meta: { loadingFacets, json, url }
        });
        throw err;
      });
  };
}

export const FETCH_GRAPH = 'FETCH_GRAPH';
export const FETCH_GRAPH_SUCCESS = 'FETCH_GRAPH_SUCCESS';
export const FETCH_GRAPH_ERROR = 'FETCH_GRAPH_ERROR';

export function fetchGraph(
  graphIdOrSlug,
  {
    query = {},
    reader = false,
    publisher = false,
    sifter = false,
    isNewGraph = false,
    nodes,
    baseUrl,
    cookie,
    cache = true
  } = {}
) {
  // we use xhr for the request as we need to be able to cancel it...
  // only include nodes if opts.new is set to true
  const scopeId = getScopeId(graphIdOrSlug);

  return (dispatch, getState) => {
    const { user, graphFacetMap, fetchGraphStatusMap, homepage } = getState();
    if (fetchGraphStatusMap[scopeId] && fetchGraphStatusMap[scopeId].xhr) {
      fetchGraphStatusMap[scopeId].xhr.abort();
    }

    let facets;
    if (!reader && !publisher) {
      facets = sifter ? SIFTER_FACETS : DASHBOARD_FACETS;
    }

    // if `reader` is true we are in the public reader (not publisher preview) => we only want releases
    const qid = publisher
      ? `@id:"${graphIdOrSlug}"`
      : reader
      ? `slug:"${graphIdOrSlug}" NOT version:"null"`
      : `scopeId:"${scopeId}" OR slug:"${graphIdOrSlug}"`;

    const q =
      reader || publisher
        ? qid
        : `(${qid}) AND (${getGraphQuery(user, query, graphFacetMap, facets)})`;

    const qs = {
      includeDocs: true,
      query: q,
      nodes: !!reader || !!publisher || !!isNewGraph || !!nodes,
      potentialActions: sifter || reader ? false : 'dashboard',
      limit: 1,
      cache
    };

    const hydrate =
      !reader && !publisher && !sifter ? HYDRATE_DASHBOARD : HYDRATE;

    qs.hydrate = JSON.stringify(hydrate);

    if (!reader && !publisher) {
      let ranges;
      if (!sifter) {
        ranges = getDashboardRanges();
        qs.ranges = JSON.stringify(ranges);
      }
      qs.facetQuery = sifter
        ? getSifterQuery(homepage, query, graphFacetMap, facets)
        : getGraphQuery(user, query, graphFacetMap, facets);
      qs.counts = JSON.stringify(
        ranges ? facets.filter(facet => !(facet in ranges)) : facets
      );
    }

    const url = `/graph?${querystring.stringify(qs)}`;

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
      type: FETCH_GRAPH,
      payload: r.xhr,
      meta: { id: scopeId, isNewGraph: !!isNewGraph, qs }
    });

    return r
      .then(({ body: itemList }) => {
        dispatch({
          type: FETCH_GRAPH_SUCCESS,
          payload: itemList,
          meta: { id: scopeId, isNewGraph: !!isNewGraph, qs }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_GRAPH_ERROR,
          error: err,
          meta: { id: scopeId, isNewGraph: !!isNewGraph, qs }
        });
      });
  };
}

export const UPDATE_RELEASE = 'UPDATE_RELEASE';
export const UPDATE_RELEASE_SUCCESS = 'UPDATE_RELEASE_SUCCESS';
export const UPDATE_RELEASE_ERROR = 'UPDATE_RELEASE_ERROR';

/**
 * See also `updateGraph` to update nodes of a graph
 */
export function updateRelease(release, updatePayload) {
  return (dispatch, getState) => {
    const { user } = getState();

    const action = {
      '@type': 'UpdateAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: updatePayload,
      targetCollection: getId(release)
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: UPDATE_RELEASE,
      payload: action,
      meta: { releaseId: getId(release), xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: UPDATE_RELEASE_SUCCESS,
          payload: action,
          meta: { releaseId: getId(release) }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_RELEASE_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { releaseId: getId(release) },
          error: err
        });
      });
  };
}

export const UPDATE_RELEASE_BANNER = 'UPDATE_RELEASE_BANNER';
export const UPDATE_RELEASE_BANNER_SUCCESS = 'UPDATE_RELEASE_BANNER_SUCCESS';
export const UPDATE_RELEASE_BANNER_ERROR = 'UPDATE_RELEASE_BANNER_ERROR';

export function updateReleaseBanner(release, style, file) {
  const releaseId = getId(release);
  const periodicalId = getRootPartId(release);

  return (dispatch, getState) => {
    const { user } = getState();

    dispatch({
      type: UPDATE_RELEASE_BANNER,
      meta: { periodicalId, releaseId }
    });

    style =
      arrayify(release.style).find(_style => _style.name === style.name) ||
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
            style: arrayify(release.style).concat(style)
          },
          targetCollection: releaseId
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
        // The changes feed will pickup the updated release document when the
        // worker applies it.
        return dispatch(
          upload(file, releaseId, getId(style), { update: true })
        );
      })
      .then(uploadAction => {
        dispatch({
          type: UPDATE_RELEASE_BANNER_SUCCESS,
          meta: { periodicalId, releaseId },
          payload: uploadAction
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_RELEASE_BANNER_ERROR,
          error: err,
          meta: { periodicalId, releaseId }
        });
      });
  };
}

/**
 * Note: The PouchDB changes feed will dispatch the success (see pouch-action-creators.js)
 * See also `updateRelease` to update some properties of release
 */
export const UPDATE_GRAPH = 'UPDATE_GRAPH';
export const UPDATE_GRAPH_SUCCESS = 'UPDATE_GRAPH_SUCCESS';
export const UPDATE_GRAPH_ERROR = 'UPDATE_GRAPH_ERROR';

export function updateGraph(
  graphId,
  createReleaseActionId,
  updatePayload,
  { mergeStrategy = 'ReconcileMergeStrategy' } = {}
) {
  return (dispatch, getState) => {
    const { user, scopeMap } = getState();

    const scopeId = getScopeId(graphId);
    const graph = scopeMap[scopeId].graphMap[scopeId].graph;
    const agent = remapRole(
      arrayify(graph.author).find(role => getAgentId(role) === getId(user)),
      'agent',
      { dates: false }
    );

    const action = {
      '@type': 'UpdateAction',
      actionStatus: 'CompletedActionStatus',
      agent,
      instrumentOf: getId(createReleaseActionId),
      mergeStrategy,
      object: updatePayload,
      targetCollection: getId(graphId)
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    dispatch({
      type: UPDATE_GRAPH,
      payload: action,
      meta: { graphId: getId(graphId), xhr: r.xhr }
    });

    return r
      .then(({ body: action }) => {
        dispatch({
          type: UPDATE_GRAPH_SUCCESS,
          payload: action,
          meta: { graphId: getId(graphId) }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_GRAPH_ERROR,
          payload: Object.assign({}, action, {
            actionStatus: 'FailedActionStatus'
          }),
          meta: { graphId: getId(graphId) },
          error: err
        });
      });
  };
}

export const CREATE_MAIN_ENTITY = 'CREATE_MAIN_ENTITY';
export const CREATE_MAIN_ENTITY_SUCCESS = 'CREATE_MAIN_ENTITY_SUCCESS';
export const CREATE_MAIN_ENTITY_ERROR = 'CREATE_MAIN_ENTITY_ERROR';

export function createMainEntity(
  file,
  context, // the id of the relevant CreateReleaseAction allowing to create the main entity
  graphId,
  { fileFormat } = {}
) {
  return (dispatch, getState) => {
    const { user, scopeMap } = getState();

    const scopeId = getScopeId(graphId);
    const graph = scopeMap[scopeId].graphMap[scopeId].graph;
    const agent = remapRole(
      arrayify(graph.author).find(role => getAgentId(role) === getId(user)),
      'agent',
      { dates: false }
    );

    const actionMapSelector = createActionMapSelector();
    const actionMap = actionMapSelector(getState(), { graphId });

    let updateActionParticipants;
    const action = actionMap[context];
    if (action) {
      updateActionParticipants = getMetaActionParticipants(action, {
        addAgent: getAgentId(action.agent) !== getId(user),
        restrictToAuthorsAndProducers: true
      });
    }

    const userId = getId(user);

    const resource = {
      '@id': '_:mainEntity',
      '@type': getCreativeWorkTypeFromMime(file.type),
      resourceOf: scopeId,
      creator: userId
    };

    if (resource['@type'] || file.name) {
      // We set a default label (alternateName).
      // We pick up the @type (when available) over the filename when the type
      // is available to avoid situations where a user get stuck with a label
      // containing a version number (e.g manuscript-0.0.0) as that can be
      // confusing during revisions
      resource.alternateName =
        API_LABELS[resource['@type']] ||
        (/\.ds3\.docx$/i.test(file.name)
          ? file.name.replace(/\.ds3\.docx$/i, '')
          : basename(file.name, extname(file.name)));
    }

    dispatch({
      type: CREATE_MAIN_ENTITY,
      payload: resource,
      meta: { context, graphId }
    });

    const updateAction = {
      '@type': 'UpdateAction',
      agent,
      mergeStrategy: 'ReconcileMergeStrategy',
      actionStatus: 'CompletedActionStatus',
      instrumentOf: getId(context),
      object: {
        mainEntity: getId(resource),
        '@graph': [resource]
      },
      targetCollection: getScopeId(graphId)
    };
    if (updateActionParticipants.length) {
      updateAction.participant = updateActionParticipants;
    }

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: updateAction
    })
      .then(({ body: updateAction }) => {
        dispatch({
          type: CREATE_MAIN_ENTITY_SUCCESS,
          payload: updateAction,
          meta: { context, graphId }
        });

        return dispatch(
          upload(file, context, getId(updateAction.result.mainEntity), {
            roleId: getId(agent),
            fileFormat,
            update: true
          })
        );
      })
      .catch(err => {
        dispatch({
          type: CREATE_MAIN_ENTITY_ERROR,
          meta: { context, graphId, updateAction },
          error: err
        });
      });
  };
}

export const REVISE_RESOURCE = 'REVISE_RESOURCE';
export const REVISE_RESOURCE_SUCCESS = 'REVISE_RESOURCE_SUCCESS';
export const REVISE_RESOURCE_ERROR = 'REVISE_RESOURCE_ERROR';

/**
 * Note: this is also used to typeset resources
 */
export function reviseResource(
  file,
  action, // `TypesettingAction` or `CreateReleaseAction`
  graphId,
  resourceId,
  { fileFormat } = {}
) {
  return (dispatch, getState) => {
    const { scopeMap, user } = getState();

    const actionId = getId(action);
    graphId = getId(graphId);
    resourceId = getId(resourceId);
    const update = action['@type'] === 'CreateReleaseAction';

    const scopeId = getScopeId(graphId);
    const graph = scopeMap[scopeId].graphMap[scopeId].graph;
    const role = arrayify(
      graph[action['@type'] === 'CreateReleaseAction' ? 'author' : 'producer']
    ).find(role => getAgentId(role) === getId(user));

    dispatch({
      type: REVISE_RESOURCE,
      meta: { actionId, graphId, resourceId },
      payload: resourceId
    });

    return dispatch(
      upload(file, actionId, resourceId, {
        fileFormat,
        update,
        roleId: getId(role)
      })
    )
      .then(uploadAction => {
        dispatch({
          type: REVISE_RESOURCE_SUCCESS,
          meta: { actionId, graphId, resourceId },
          payload: uploadAction
        });
      })
      .catch(err => {
        dispatch({
          type: REVISE_RESOURCE_ERROR,
          meta: { actionId, graphId, resourceId },
          error: err
        });
      });
  };
}
