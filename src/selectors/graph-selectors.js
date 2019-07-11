import { createSelector } from 'reselect';
import { getId, arrayify } from '@scipe/jsonld';
import { getScopeId, createId, Acl, getRootPartId } from '@scipe/librarian';
import config from '../utils/config';
import { getLocationOptions } from '../utils/document-object';

/**
 * Get a Graph @id (including version) based on the state and user permissions
 */
export function createGraphIdSelector(
  // graphIdMapper
  {
    getGraphId = function(state = {}, props = {}) {
      return props.graphId;
    },
    getSlug = function(state = {}, props = {}) {
      return props.slug;
    }
  } = {}
) {
  return createSelector(
    state => state.scopeMap,
    getGraphId ||
      function(state = {}, props = {}) {
        return props.graphId || getId(props.graph);
      },
    getSlug ||
      function(state = {}, props = {}) {
        return props.slug;
      },
    (scopeMap, graphId, slug) => {
      // handle slug case => only used for reader in non preview mode
      // we we match by slug, we return the latest release @id
      if (!graphId && slug) {
        // If we have a slug, we trade it for the graphId of the _latest_ release with matching slug
        for (const scopeId in scopeMap) {
          if (scopeMap.hasOwnProperty(scopeId)) {
            const { graphMap } = scopeMap[scopeId];
            if (graphMap) {
              for (const releaseId in graphMap) {
                if (graphMap.hasOwnProperty(releaseId)) {
                  const { graph = {} } = graphMap[releaseId];
                  if (
                    graph.slug === slug &&
                    graph.version != null &&
                    (graph._id || '').includes('latest')
                  ) {
                    return releaseId;
                  }
                }
              }
            }
          }
        }
      }

      return graphId;
    }
  );
}

export function createWorkflowSelector(graphIdMapper) {
  return createSelector(
    createGraphIdSelector(graphIdMapper),
    state => state.scopeMap,
    (graphId, scopeMap) => {
      const scopeData = scopeMap[getScopeId(graphId)];
      return scopeData && scopeData.workflow;
    }
  );
}

export function createActionMapSelector(graphIdMapper) {
  return createSelector(
    createGraphIdSelector(graphIdMapper),
    state => state.scopeMap,
    (graphId, scopeMap) => {
      const scopeData = scopeMap[getScopeId(graphId)];
      return scopeData && scopeData.actionMap;
    }
  );
}

export function createGraphAclSelector(graphIdMapper) {
  return createSelector(
    createGraphIdSelector(graphIdMapper),
    state => state.scopeMap,
    (graphId, scopeMap) => {
      const scopeId = getScopeId(graphId);
      const scopeData = scopeMap[scopeId];

      let graph, inviteActions;
      if (scopeData) {
        const { graphMap, actionMap } = scopeData;
        if (graphMap) {
          // if live graph is not available, try the graphId which may be a versionned graphId
          const graphData =
            graphMap[createId('graph', scopeId)['@id']] || graphMap[graphId];
          if (graphData) {
            graph = graphData.graph;
          }
        }
        if (actionMap) {
          inviteActions = Object.values(actionMap).filter(
            action => action['@type'] === 'InviteAction'
          );
        }
      }

      return new Acl(graph, inviteActions);
    }
  );
}

export function createCommentMapSelector(graphIdMapper) {
  return createSelector(
    createGraphIdSelector(graphIdMapper),
    state => state.scopeMap,
    (graphId, scopeMap) => {
      const scopeData = scopeMap[getScopeId(graphId)];
      return scopeData && scopeData.commentMap;
    }
  );
}

export function createGraphDataSelector(graphIdMapper) {
  return createSelector(
    state => state.user,
    state => state.scopeMap,
    createGraphIdSelector(graphIdMapper),
    (user, scopeMap, graphId) => {
      if (graphId && scopeMap) {
        const scopeId = getScopeId(graphId);
        const scopeData = scopeMap[scopeId];

        if (scopeData && scopeData.graphMap) {
          const { graphMap = {} } = scopeData;

          return graphMap[graphId] || graphMap[scopeId];
        }
      }
    }
  );
}

export function createPeriodicalSelector(graphIdMapper) {
  if (config.isJournalSubdomain) {
    return state => state.homepage;
  }

  return createSelector(
    state => state.droplets,
    createGraphDataSelector(graphIdMapper),
    (droplets, graphData) => {
      if (graphData) {
        const periodicalId = getRootPartId(graphData.graph);
        return droplets[periodicalId];
      }
    }
  );
}

export function createFirstAuthorFamilyNameSelector(graphIdMapper) {
  return createSelector(
    createGraphDataSelector(graphIdMapper),
    (graphData = {}) => {
      const { graph, nodeMap } = graphData;

      let firstAuthorFamilyName;
      if (graph && nodeMap) {
        const mainEntity = nodeMap[getId(graph.mainEntity)];
        if (mainEntity) {
          const firstAuthorRole =
            nodeMap[getId(arrayify(mainEntity.author)[0])];
          if (firstAuthorRole) {
            const firstAuthor = firstAuthorRole.author
              ? nodeMap[getId(firstAuthorRole.author)]
              : firstAuthorRole;

            if (firstAuthor) {
              firstAuthorFamilyName = firstAuthor.familyName;
            }
          }
        }
      }

      return firstAuthorFamilyName;
    }
  );
}

/**
 * Return all the action involved in the Upload and transformation of a resource
 */
export const syncProgressSelector = createSelector(
  state => state.pouch.repFromPouchToCouchStatus,
  state => state.pouch.repFromCouchToPouchStatus,
  state => state.pouch.progressPouch,
  (repFromPouchToCouchStatus, repFromCouchToPouchStatus, progressPouch) => {
    let value, mode;
    if (
      repFromPouchToCouchStatus === 'active' &&
      progressPouch &&
      progressPouch !== 100
    ) {
      mode = 'up';
      value = progressPouch;
    } else if (
      repFromPouchToCouchStatus === 'active' &&
      repFromCouchToPouchStatus === 'active'
    ) {
      mode = 'spinUp'; // we should use `bounce` but it is wild as repFromCouchToPouchStatus changes all the time. TODO improve rep from Couch to Pouch and use `bounce`
    } else if (
      repFromPouchToCouchStatus === 'active' &&
      repFromCouchToPouchStatus !== 'active'
    ) {
      mode = 'spinUp';
    } else if (
      repFromPouchToCouchStatus !== 'active' &&
      repFromCouchToPouchStatus === 'active'
    ) {
      mode = 'spinDown';
    } else {
      mode = 'none';
    }

    return { value, mode };
  }
);

export function createLocationAutocompleteDataSelector(graphIdMapper) {
  return createSelector(
    createGraphDataSelector(graphIdMapper), // Note that `createGraphDataSelector` will fallback to using the live graph if a future version is specified which is what we want in case of CreateReleaseAction not completed yet (the `graph` param of the selector is the future version for those)
    state => state.contentMap,
    ({ graph = {}, nodeMap = {} } = {}, contentMap = {}) => {
      let options;

      const mainEntityId = getId(graph.mainEntity);
      if (mainEntityId) {
        const mainEntity = nodeMap[mainEntityId];
        if (mainEntity) {
          const contentId = arrayify(mainEntity.encoding)
            .concat(arrayify(mainEntity.distribution))
            .find(encodingId => getId(encodingId) in contentMap);
          if (contentId) {
            const content = contentMap[getId(contentId)];

            options = getLocationOptions(content, nodeMap);
          }
        }
      }

      return options;
    }
  );
}

export const locationAutocompleteDataSelector = createLocationAutocompleteDataSelector();

export const annotationLocationAutocompleteDataSelector = createLocationAutocompleteDataSelector(
  {
    getGraphId: (state, props) => {
      // for author response when comments are made from prev files, we need the live graph not the versioned graph)
      // => we get the graphId from the first selector of the annotation (in case of author response that will be
      // the value of the next version). The reselect selector (`locationAutocompleteDataSelector`) will do the right
      // thing to convert that versioned graphId into a live graphId
      if (
        props.annotation &&
        props.annotation.selector &&
        props.annotation.selector.graph
      ) {
        return props.annotation.selector.graph;
      }

      return props.graphId;
    }
  }
);
