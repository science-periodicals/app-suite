import omit from 'lodash/omit';
import { parseIndexableString } from '@scipe/collate';
import { arrayify, getId, getNodeMap } from '@scipe/jsonld';
import { getScopeId } from '@scipe/librarian';

import { DELETE_COMMENT_ACTION_SUCCESS } from '../actions/comment-action-creators';

import {
  REMOTE_DATA_DELETED,
  LOAD_FROM_POUCH_SUCCESS,
  POUCH_DATA_UPSERTED,
  POUCH_DATA_DELETED
} from '../actions/pouch-action-creators';
import {
  SEARCH_GRAPHS,
  SEARCH_GRAPHS_SUCCESS,
  SEARCH_GRAPHS_ERROR,
  FETCH_GRAPH,
  FETCH_GRAPH_SUCCESS,
  FETCH_GRAPH_ERROR,
  CREATE_GRAPH,
  CREATE_GRAPH_SUCCESS,
  CREATE_GRAPH_ERROR,
  DELETE_GRAPH_SUCCESS,
  CREATE_MAIN_ENTITY_SUCCESS,
  CREATE_TAG,
  CREATE_TAG_SUCCESS,
  CREATE_TAG_ERROR,
  DELETE_TAG,
  DELETE_TAG_SUCCESS,
  DELETE_TAG_ERROR
} from '../actions/graph-action-creators';
import { POST_WORKFLOW_ACTION_ERROR } from '../actions/workflow-action-creators';
import { BUY_SERVICE_OFFER_SUCCESS } from '../actions/service-action-creators';

export function createGraphStatus(state = {}, action) {
  switch (action.type) {
    case CREATE_GRAPH:
      return {
        status: 'active',
        error: null
      };

    case CREATE_GRAPH_SUCCESS:
      return {
        status: 'success',
        error: null
      };

    case CREATE_GRAPH_ERROR:
      return {
        status: 'error',
        error: action.error
      };

    default:
      return state;
  }
}

// NOTE we don't use POST_WORKFLOW_ACTION_SUCCESS as the triggers it can lead to regression (result of POST_WORKFLOW_ACTION_SUCCESS is older than what get replicated)
export function scopeMap(state = {}, action) {
  if (action.buffered) {
    return action.payload.reduce((state, action) => {
      return scopeMap(state, action);
    }, state);
  }

  const DEFAULTS = {
    commentMap: {},
    actionMap: {},
    graphMap: {},
    workflow: undefined
  };

  switch (action.type) {
    // case REMOTE_DATA_DELETED: {
    //   const { scopeId } = action.meta;
    //   if ((scopeId in state) && (action.payload.master['@type'] === 'Graph')) {
    //     return omit(state, [ action.meta.scopeId ]);
    //   }
    //   return state;
    // }

    case FETCH_GRAPH_SUCCESS:
    case SEARCH_GRAPHS_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      const droplets = arrayify(action.payload['@graph']);
      const overwrite = {};

      mainEntity.itemListElement.forEach(itemListElement => {
        const graph = itemListElement.item;
        const scopeId = getScopeId(graph);

        const scopeData = state[scopeId] || {};
        const scopeDataOverwrite = {};

        // TODO we could optimize by checking the _rev and only overwritting if _rev changed

        // workflow
        const workflowId = getId(graph.workflow);
        if (workflowId) {
          const workflow = arrayify(droplets).find(
            node => getId(node) === workflowId
          );
          if (workflow) {
            scopeDataOverwrite.workflow = workflow;
          }
        }

        // Graph and release
        scopeDataOverwrite.graphMap = Object.assign({}, scopeData.graphMap, {
          [getId(graph)]: createGraphMapEntry(
            graph,
            scopeData.graphMap && scopeData.graphMap[getId(graph)]
          )
        });

        // actionMap
        const nextActionMap = getNodeMap(arrayify(graph.potentialAction));
        // we only update if rev changed _but_ we are cautious as some actions can be deleted (e.g, tagActions)
        if (
          !(scopeId in state) ||
          !state[scopeId].actionMap ||
          arrayify(graph.potentialAction).some(action => {
            return (
              !(action['@id'] in state[scopeId].actionMap) ||
              action._rev !== state[scopeId].actionMap[action['@id']]._rev ||
              Object.keys(state[scopeId].actionMap).some(
                actionId => !(actionId in nextActionMap)
              )
            );
          })
        ) {
          scopeDataOverwrite.actionMap = nextActionMap;
        }

        // update the scope
        if (Object.keys(scopeDataOverwrite).length) {
          overwrite[scopeId] = Object.assign(
            {},
            DEFAULTS,
            state[scopeId],
            scopeDataOverwrite
          );
        }
      });

      return Object.keys(overwrite).length
        ? Object.assign({}, state, overwrite)
        : state;
    }

    case LOAD_FROM_POUCH_SUCCESS: {
      // This reset everything for the `scopeId`
      const { scopeId } = action.meta;

      let actionMap = {};
      let commentMap = {};
      let graphMap = {};
      let workflow;

      action.payload.forEach(data => {
        const doc = omit(data.master, ['_conflicts']);
        const [, type] = parseIndexableString(doc._id);
        switch (type) {
          case 'workflow':
            workflow = doc;
            break;

          case 'graph':
          case 'release': {
            graphMap[getId(doc)] = createGraphMapEntry(
              doc,
              graphMap[getId(doc)]
            );
            break;
          }

          case 'action':
            if (doc['@type'] === 'CommentAction') {
              commentMap[doc['@id']] = doc;
            } else {
              actionMap[doc['@id']] = doc;
            }
            break;
        }
      });

      return Object.assign({}, state, {
        [scopeId]: {
          workflow,
          actionMap,
          commentMap,
          graphMap
        }
      });
    }

    case POUCH_DATA_UPSERTED: {
      const { graphId } = action.meta;
      const doc = omit(action.payload.master, ['_conflicts']);
      const [scopeId, type] = parseIndexableString(doc._id);

      switch (type) {
        case 'graph':
        case 'release': {
          return Object.assign({}, state, {
            [scopeId]: Object.assign({}, DEFAULTS, state[scopeId], {
              graphMap: Object.assign(
                {},
                state[scopeId] && state[scopeId].graphMap,
                {
                  [getId(doc)]: createGraphMapEntry(
                    doc,
                    state[scopeId] &&
                      state[scopeId].graphMap &&
                      state[scopeId].graphMap[getId(doc)]
                  )
                }
              )
            })
          });
        }

        case 'workflow': {
          // !! for workflow the scope from _id is a periodical id so we get the scopeId from graphId
          const scopeId = getScopeId(graphId);
          if (state[scopeId] && getId(state[scopeId].workflow) === getId(doc)) {
            return Object.assign({}, state, {
              [scopeId]: Object.assign({}, DEFAULTS, state[scopeId], {
                workflow: doc
              })
            });
          }
          return state;
        }

        case 'action':
          if (doc['@type'] === 'CommentAction') {
            return Object.assign({}, state, {
              [scopeId]: Object.assign({}, DEFAULTS, state[scopeId], {
                commentMap: Object.assign(
                  {},
                  state[scopeId] && state[scopeId].commentMap,
                  {
                    [doc['@id']]: doc
                  }
                )
              })
            });
          } else {
            return Object.assign({}, state, {
              [scopeId]: Object.assign({}, DEFAULTS, state[scopeId], {
                actionMap: Object.assign(
                  {},
                  state[scopeId] && state[scopeId].actionMap,
                  {
                    [doc['@id']]: doc
                  }
                )
              })
            });
          }

        default:
          return state;
      }
    }

    case POUCH_DATA_DELETED: {
      const doc = omit(action.payload.master, ['_conflicts']);
      const [scopeId, type] = parseIndexableString(doc._id);

      switch (type) {
        case 'graph':
          if (scopeId in state) {
            return omit(state, [scopeId]);
          }
          return state;

        case 'release':
          return Object.assign({}, state, {
            [scopeId]: Object.assign({}, state[scopeId], {
              graphMap: omit(state[scopeId].graphMap, [getId(doc)])
            })
          });

        case 'message':
        case 'action':
          if (doc['@type'] === 'CommentAction') {
            return Object.assign({}, state, {
              [scopeId]: Object.assign({}, state[scopeId], {
                commentMap: omit(state[scopeId].commentMap, [doc['@id']])
              })
            });
          }

          return Object.assign({}, state, {
            [scopeId]: Object.assign({}, state[scopeId], {
              actionMap: omit(state[scopeId].actionMap, [doc['@id']])
            })
          });

        default:
          return state;
      }
    }

    case DELETE_COMMENT_ACTION_SUCCESS: {
      const scopeId = getScopeId(action.meta.graphId);
      const deletedIds = arrayify(action.payload.itemListElement).map(
        listItem => getId(listItem.item)
      );
      return Object.assign({}, state, {
        [scopeId]: Object.assign({}, state[scopeId], {
          commentMap: omit(state[scopeId].commentMap, deletedIds)
        })
      });
    }

    case CREATE_MAIN_ENTITY_SUCCESS: {
      const nextGraph = action.payload.result;
      const scopeId = getScopeId(nextGraph);
      const prevGraphData =
        state[scopeId] &&
        state[scopeId].graphMap &&
        state[scopeId].graphMap[getId(nextGraph)];

      return Object.assign({}, state, {
        [scopeId]: Object.assign({}, DEFAULTS, state[scopeId], {
          graphMap: Object.assign(
            {},
            state[scopeId] && state[scopeId].graphMap,
            {
              [getId(nextGraph)]: createGraphMapEntry(nextGraph, prevGraphData)
            }
          )
        })
      });
    }

    // We do optimistic updates for Tags...
    case CREATE_TAG:
    case DELETE_TAG_ERROR:
    case CREATE_TAG_SUCCESS: {
      const scopeId = getScopeId(action.meta.graphId);
      if (!scopeId) return state;
      return Object.assign({}, state, {
        [scopeId]: Object.assign({}, DEFAULTS, state[scopeId], {
          actionMap: Object.assign({}, state[scopeId].actionMap, {
            [getId(action.payload)]: action.payload
          })
        })
      });
    }

    // As we do optimistic updates we need to delete what failed
    case DELETE_TAG:
    case DELETE_TAG_SUCCESS:
    case CREATE_TAG_ERROR: {
      const scopeId = getScopeId(action.meta.graphId);
      if (!scopeId) return state;
      return Object.assign({}, state, {
        [scopeId]: Object.assign({}, DEFAULTS, state[scopeId], {
          actionMap: omit(state[scopeId].actionMap, [getId(action.payload)])
        })
      });
    }

    case POST_WORKFLOW_ACTION_ERROR:
      // TODO optimistic updates
      return state;

    case BUY_SERVICE_OFFER_SUCCESS: {
      // add the purchased service action in actionMap
      const {
        payload: { result: { orderedItem: serviceAction } = {} }
      } = action;
      if (serviceAction && serviceAction._id) {
        const [scopeId, type] = parseIndexableString(serviceAction._id);
        if (type === 'action') {
          return Object.assign({}, state, {
            [scopeId]: Object.assign({}, DEFAULTS, state[scopeId], {
              actionMap: Object.assign({}, state[scopeId].actionMap, {
                [getId(serviceAction)]: serviceAction
              })
            })
          });
        }
      }
      return state;
    }

    default:
      return state;
  }
}

function createGraphMapEntry(graph, prevGraphData = {}) {
  if (
    graph._rev &&
    prevGraphData.graph &&
    graph._rev === prevGraphData.graph._rev &&
    prevGraphData.nodeMap
  ) {
    return prevGraphData;
  }

  return {
    graph,
    nodeMap: getNodeMap(graph)
  };
}

export function graphSearchResults(
  state = {
    issueId: null,
    status: 'active',
    error: null,
    graphIds: [],
    newGraphIds: [],
    deletedScopeIds: [],
    xhr: null,
    loadingFacets: {},
    nextUrl: null
  },
  action
) {
  switch (action.type) {
    case SEARCH_GRAPHS: {
      const {
        meta: { reset }
      } = action;
      return Object.assign(
        {},
        state,
        {
          status: 'active',
          error: null,
          xhr: action.payload,
          loadingFacets: action.meta.loadingFacets
        },
        reset
          ? {
              graphIds: [],
              newGraphIds: [],
              deletedScopeIds: [],
              loadingFacets: {},
              nextUrl: null
            }
          : undefined
      );
    }

    case SEARCH_GRAPHS_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      const lastItemListElement =
        mainEntity.itemListElement[mainEntity.itemListElement.length - 1];
      const nextGraphIds = mainEntity.itemListElement.map(itemListElement =>
        getId(itemListElement.item)
      );
      return {
        status: 'success',
        error: null,
        xhr: null,
        loadingFacets: {},
        newGraphIds: [],
        deletedScopeIds: [],
        graphIds:
          action.meta && action.meta.append
            ? state.graphIds.concat(
                nextGraphIds.filter(id => !state.graphIds.includes(id))
              )
            : nextGraphIds,
        numberOfItems: mainEntity.numberOfItems,
        nextUrl: (lastItemListElement && lastItemListElement.nextItem) || null
      };
    }

    case SEARCH_GRAPHS_ERROR:
      return Object.assign({}, state, {
        status: 'error',
        error: action.error,
        xhr: null,
        loadingFacets: {},
        nextUrl: null
      });

    case FETCH_GRAPH_SUCCESS:
      if (action.meta.isNewGraph) {
        const mainEntity = action.payload.mainEntity || action.payload;
        if (
          mainEntity &&
          mainEntity.itemListElement &&
          mainEntity.itemListElement[0]
        ) {
          const graphId = getId(mainEntity.itemListElement[0].item);
          if (
            !state.newGraphIds.includes(graphId) &&
            !state.graphIds.includes(graphId)
          ) {
            return Object.assign({}, state, {
              newGraphIds: [graphId].concat(state.newGraphIds)
            });
          }
        }
      }
      return state;

    case REMOTE_DATA_DELETED:
      if (action.payload.master['@type'] === 'Graph') {
        const scopeId = getScopeId(action.payload.master);
        if (!state.deletedScopeIds.includes(scopeId)) {
          return Object.assign({}, state, {
            deletedScopeIds: state.deletedScopeIds.concat(scopeId)
          });
        }
      }
      return state;

    default:
      return state;
  }
}

export function fetchGraphStatusMap(state = {}, action) {
  switch (action.type) {
    case SEARCH_GRAPHS:
      // searching for graphs cancel any ongoing graph fetching
      return {};

    case FETCH_GRAPH:
      return Object.assign({}, state, {
        [action.meta.id]: {
          xhr: action.payload,
          isNewGraph: action.meta.isNewGraph
        }
      });

    case REMOTE_DATA_DELETED:
      if (
        action.meta.scopeId in state &&
        action.payload.master['@type'] === 'Graph'
      ) {
        return omit(state, [action.meta.scopeId]);
      }
      return state;

    case DELETE_GRAPH_SUCCESS:
      if (action.meta.scopeId in state) {
        return omit(state, [action.meta.scopeId]);
      }
      return state;

    case FETCH_GRAPH_SUCCESS:
    case FETCH_GRAPH_ERROR:
      if (action.meta.id in state) {
        return omit(state, [action.meta.id]);
      }
      return state;

    default:
      return state;
  }
}

export function graphFacetMap(state = {}, action) {
  switch (action.type) {
    case FETCH_GRAPH_SUCCESS:
    case SEARCH_GRAPHS_SUCCESS: {
      const mainEntity = action.payload.mainEntity || action.payload;
      return arrayify(mainEntity.itemListFacet).reduce((state, facet) => {
        if (!(facet.name in state)) {
          state[facet.name] = {};
        }
        if (facet.count) {
          state[facet.name] = facet.count.reduce((state, count) => {
            if (count.propertyId !== 'tmp:null') {
              state[count.propertyId] = count;
            }
            return state;
          }, {});
        } else {
          state[facet.name] = {};
        }
        return state;
      }, {});
    }
    default:
      return state;
  }
}
