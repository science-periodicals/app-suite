import querystring from 'querystring';
import isClient from 'is-client';
import pickBy from 'lodash/pickBy';
import omit from 'lodash/omit';
import {
  createId,
  getScopeId,
  handleParticipants,
  handleUserReferences,
  flagDeleted,
  getMetaActionParticipants,
  escapeLucene,
  xhr
} from '@scipe/librarian';
import { getId, arrayify, nodeify, unprefix } from '@scipe/jsonld';
import { getAnnotationObject } from '../utils/annotations';

export const CREATE_COMMENT_ACTION = 'CREATE_COMMENT_ACTION';
export const CREATE_COMMENT_ACTION_SUCCESS = 'CREATE_COMMENT_ACTION_SUCCESS';
export const CREATE_COMMENT_ACTION_ERROR = 'CREATE_COMMENT_ACTION_ERROR';

/**
 * This is used to create new comment actions (`CommentAction`)
 *
 * We first try to POST the comment action in `ActiveActionStatus` to the server / CouchDB
 * if that doesn't work because we are offline, we save it as draft in
 * `PotentialActionStatus` in PouchDB and the user will have to submit it later
 * (the UI will display a button + warning)
 */
export function createCommentAction(
  graphId,
  {
    annotation, // A "bubble" from the right margin, note: the `object` of the annotation is the id of the root comment action of a comment thread
    commentType = 'Comment',
    agent,
    text,
    commentActionObject,
    parentItemId,
    isCommentActionOnAnnotation,
    actionAnnotationSelector
  }
) {
  return (dispatch, getState) => {
    const {
      pouch: { db },
      scopeMap
    } = getState();

    const scopeData = scopeMap[getScopeId(graphId)];
    const graphData =
      scopeData &&
      scopeData.graphMap &&
      scopeData.graphMap[getScopeId(graphId)];
    const graph = graphData && graphData.graph;

    // replace the finer grain selector with selection data so we have access to the `selectedValue` etc.
    let object;
    if (isCommentActionOnAnnotation) {
      object = {
        '@type': 'TargetRole',
        identifier: annotation.hash.substring(1),
        object: getId(commentActionObject),
        hasSelector: actionAnnotationSelector
      };
    } else if (annotation) {
      object = {
        '@type': 'TargetRole',
        identifier: annotation.hash.substring(1),
        object: getId(commentActionObject),
        hasSelector: annotation.selector
      };
    } else {
      object = getId(commentActionObject);
    }

    const audience = getMetaActionParticipants(commentActionObject, {
      addAgent: true
    });

    const commentActionId = createId('action', null, graphId);
    const commentAction = handleUserReferences(
      handleParticipants(
        Object.assign(
          commentActionId,
          pickBy({
            '@type': 'CommentAction',
            actionStatus: 'ActiveActionStatus',
            completeOn: 'OnObjectCompletedActionStatus',
            startTime: new Date().toISOString(),
            agent,
            participant: audience && audience.length ? audience : undefined,
            object,
            resultComment: Object.assign(
              // if parentItemId is defined the comment is a response => need a new UUID, otherwise we re-use the uuid that was used for the annotation
              createId(
                'cnode',
                parentItemId || isCommentActionOnAnnotation || !annotation
                  ? null
                  : annotation.object,
                getId(commentActionId)
              ),
              {
                '@type': commentType,
                dateCreated: new Date().toISOString(),
                text
              },
              parentItemId ? { parentItem: parentItemId } : undefined
            )
          })
        ),
        graph
      ),
      graph
    );

    const meta = {
      commentId: getId(commentAction.resultComment),
      annotationObject: getAnnotationObject(commentAction)
    };

    dispatch({
      type: CREATE_COMMENT_ACTION,
      payload: commentAction,
      meta
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: commentAction
    })
      .then(({ body: commentAction }) => {
        dispatch({
          type: CREATE_COMMENT_ACTION_SUCCESS,
          payload: commentAction,
          meta
        });
      })
      .catch(err => {
        // if that fails because user if offline, save as draft in PouchDB
        return db
          .put(
            Object.assign({}, commentAction, {
              actionStatus: 'PotentialActionStatus' // draft
            })
          )
          .then(resp => {
            dispatch({
              type: CREATE_COMMENT_ACTION_SUCCESS,
              payload: Object.assign({}, commentAction, { _rev: resp.rev }),
              meta
            });
          })
          .catch(err => {
            dispatch({
              type: CREATE_COMMENT_ACTION_ERROR,
              error: err,
              meta
            });
          });
      });
  };
}

export const UPDATE_COMMENT_ACTION = 'UPDATE_COMMENT_ACTION';
export const UPDATE_COMMENT_ACTION_SUCCESS = 'UPDATE_COMMENT_ACTION_SUCCESS';
export const UPDATE_COMMENT_ACTION_ERROR = 'UPDATE_COMMENT_ACTION_ERROR';

export function updateCommentAction(graphId, commentAction, text) {
  return (dispatch, getState) => {
    const {
      pouch: { db }
    } = getState();

    dispatch({
      type: UPDATE_COMMENT_ACTION,
      payload: commentAction
    });

    function offlineUpdate() {
      return db
        .upsert(commentAction._id, doc => {
          if (doc && doc.resultComment) {
            doc.resultComment.text = text;
            return doc;
          }
        })
        .then(res => {
          dispatch({
            type: UPDATE_COMMENT_ACTION_SUCCESS,
            payload: commentAction
          });
        })
        .catch(err => {
          dispatch({
            type: UPDATE_COMMENT_ACTION_ERROR,
            error: err
          });
        });
    }

    if (commentAction.actionStatus === 'PotentialActionStatus') {
      // if commentAction is in `PotentialActionStatus` try to POST with `ActiveActionStatus` first and fallback to offline update
      return xhr({
        url: '/action',
        method: 'POST',
        json: true,
        body: Object.assign({}, commentAction, {
          actionStatus: 'ActiveActionStatus',
          resultComment: Object.assign(
            {},
            nodeify(commentAction.resultComment),
            {
              text
            }
          )
        })
      })
        .then(({ body: commentAction }) => {
          dispatch({
            type: UPDATE_COMMENT_ACTION_SUCCESS,
            payload: commentAction
          });
        })
        .catch(err => {
          // if that fails because user if offline, save as draft to PouchDB, still in PotentialActionStatus
          return offlineUpdate();
        });
    } else {
      return offlineUpdate();
    }
  };
}

export const DELETE_COMMENT_ACTION = 'DELETE_COMMENT_ACTION';
export const DELETE_COMMENT_ACTION_SUCCESS = 'DELETE_COMMENT_ACTION_SUCCESS';
export const DELETE_COMMENT_ACTION_ERROR = 'DELETE_COMMENT_ACTION_ERROR';

/**
 * Note `deleteCommentAction` can only happen online (not offline) this is so
 * that the redis wid set is kept up to date (see librarian)
 */
export function deleteCommentAction(graphId, commentAction) {
  return (dispatch, getState) => {
    const meta = {
      commentActionId: getId(commentAction),
      commentId: getId(commentAction.resultComment),
      annotationObject: getAnnotationObject(commentAction),
      graphId
    };

    dispatch({
      type: DELETE_COMMENT_ACTION,
      payload: commentAction,
      meta
    });

    return xhr({
      url: `/action/${unprefix(getId(commentAction))}`,
      method: 'DELETE',
      json: true
    })
      .then(({ body: deleteAction }) => {
        dispatch({
          type: DELETE_COMMENT_ACTION_SUCCESS,
          payload: deleteAction,
          meta
        });
      })
      .catch(err => {
        dispatch({
          type: DELETE_COMMENT_ACTION_ERROR,
          error: err,
          meta
        });
      });
  };
}

export const ACTIVATE_COMMENT_ACTION = 'ACTIVATE_COMMENT_ACTION';
export const ACTIVATE_COMMENT_ACTION_SUCCESS =
  'ACTIVATE_COMMENT_ACTION_SUCCESS';
export const ACTIVATE_COMMENT_ACTION_ERROR = 'ACTIVATE_COMMENT_ACTION_ERROR';
export function activateCommentAction(graphId, commentActionId) {
  return (dispatch, getState) => {
    const { scopeMap } = getState();

    const { commentMap } = scopeMap[getScopeId(graphId)];
    const commentAction = commentMap[commentActionId];

    const meta = {
      graphId,
      commentActionId: getId(commentAction)
    };

    dispatch({
      type: ACTIVATE_COMMENT_ACTION,
      meta
    });

    return xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: Object.assign({}, commentAction, {
        actionStatus: 'ActiveActionStatus'
      })
    })
      .then(({ body: commentAction }) => {
        dispatch({
          type: ACTIVATE_COMMENT_ACTION_SUCCESS,
          payload: commentAction,
          meta
        });
      })
      .catch(err => {
        dispatch({
          type: ACTIVATE_COMMENT_ACTION_ERROR,
          error: err,
          meta
        });
      });
  };
}

/**
 * Note: The PouchDB changes feed will dispatch the success (see
 * pouch-action-creators.js)
 */
export const CREATE_ACTION_ANNOTATION = 'CREATE_ACTION_ANNOTATION';
export const CREATE_ACTION_ANNOTATION_SUCCESS =
  'CREATE_ACTION_ANNOTATION_SUCCESS';
export const CREATE_ACTION_ANNOTATION_ERROR = 'CREATE_ACTION_ANNOTATION_ERROR';

export function createActionAnnotation(
  graphId,
  annotation,
  action,
  { selector, commentType, text, isBasedOn, parentItemId } = {}
) {
  return (dispatch, getState) => {
    const {
      pouch: { db }
    } = getState();

    const actionAnnotation = Object.assign(
      createId(
        'cnode',
        commentType === 'AuthorResponseComment' ? null : annotation.object,
        getId(action)
      ),
      {
        '@type': 'Annotation',
        annotationTarget: {
          '@type': 'TargetRole',
          annotationTarget: graphId,
          identifier: annotation.hash.substring(1),
          hasSelector: selector
        },
        annotationBody: pickBy({
          '@id': createId('cnode', null, getId(action))['@id'],
          '@type': commentType,
          text,
          isBasedOn,
          parentItem: getId(parentItemId)
        })
      }
    );

    if (
      actionAnnotation.annotationBody.isBasedOn &&
      !actionAnnotation.annotationBody.isBasedOn.length
    ) {
      delete actionAnnotation.annotationBody.isBasedOn;
    }

    const meta = {
      graphId,
      actionAnnotationId: getId(actionAnnotation),
      annotationObject: getAnnotationObject(actionAnnotation)
    };

    dispatch({
      type: CREATE_ACTION_ANNOTATION,
      payload: actionAnnotation,
      meta
    });

    return db
      .upsert(action._id, action => {
        const nextAnnotations = arrayify(action.annotation)
          .filter(annotation => getId(annotation) !== getId(actionAnnotation))
          .concat(actionAnnotation);

        return Object.assign({}, action, { annotation: nextAnnotations });
      })
      .then(res => {
        dispatch({
          type: CREATE_ACTION_ANNOTATION_SUCCESS,
          payload: actionAnnotation,
          meta
        });
      })
      .catch(err => {
        dispatch({
          type: CREATE_ACTION_ANNOTATION_ERROR,
          error: err,
          meta
        });
      });
  };
}

/**
 * Note: The PouchDB changes feed will dispatch the success (see
 * pouch-action-creators.js)
 */
export const UPDATE_ACTION_ANNOTATION = 'UPDATE_ACTION_ANNOTATION';
export const UPDATE_ACTION_ANNOTATION_SUCCESS =
  'UPDATE_ACTION_ANNOTATION_SUCCESS';
export const UPDATE_ACTION_ANNOTATION_ERROR = 'UPDATE_ACTION_ANNOTATION_ERROR';

export function updateActionAnnotation(
  graphId,
  actionAnnotationId,
  action,
  { text, isBasedOn } = {}
) {
  return (dispatch, getState) => {
    const {
      pouch: { db }
    } = getState();

    dispatch({
      type: UPDATE_ACTION_ANNOTATION,
      meta: { graphId, actionAnnotationId, actionId: getId(action) }
    });
    return db
      .upsert(action._id, doc => {
        return Object.assign({}, doc, {
          annotation: arrayify(doc.annotation).map(annotation => {
            if (getId(annotation) === actionAnnotationId) {
              const nextAnnotation = Object.assign({}, annotation, {
                annotationBody: Object.assign(
                  {},
                  annotation.annotationBody,
                  text != null
                    ? {
                        text
                      }
                    : undefined,
                  isBasedOn != null
                    ? {
                        isBasedOn
                      }
                    : undefined
                )
              });

              if (
                nextAnnotation.annotationBody.isBasedOn &&
                !nextAnnotation.annotationBody.isBasedOn.length
              ) {
                delete nextAnnotation.annotationBody.isBasedOn;
              }

              return nextAnnotation;
            }

            return annotation;
          })
        });
      })
      .then(res => {
        dispatch({
          type: UPDATE_ACTION_ANNOTATION_SUCCESS,
          meta: { graphId, actionAnnotationId, actionId: getId(action) }
        });
      })
      .catch(err => {
        dispatch({
          type: UPDATE_ACTION_ANNOTATION_ERROR,
          error: err,
          meta: { graphId, actionAnnotationId, actionId: getId(action) }
        });
      });
  };
}

/**
 * Note: The PouchDB changes feed will dispatch the success (see
 * pouch-action-creators.js)
 */
export const DELETE_ACTION_ANNOTATION = 'DELETE_ACTION_ANNOTATION';
export const DELETE_ACTION_ANNOTATION_SUCCESS =
  'DELETE_ACTION_ANNOTATION_SUCCESS';
export const DELETE_ACTION_ANNOTATION_ERROR = 'DELETE_ACTION_ANNOTATION_ERROR';

export function deleteActionAnnotation(
  graphId,
  actionAnnotation,
  action,
  commentActions
) {
  return (dispatch, getState) => {
    const {
      pouch: { db }
    } = getState();

    const meta = {
      graphId,
      actionAnnotationId: getId(actionAnnotation),
      annotationObject: getAnnotationObject(actionAnnotation)
    };

    dispatch({
      type: DELETE_ACTION_ANNOTATION,
      payload: actionAnnotation,
      meta
    });

    return db
      .upsert(action._id, action => {
        const nextAnnotations = arrayify(action.annotation).filter(
          annotation => getId(annotation) !== getId(actionAnnotation)
        );

        return nextAnnotations.length
          ? Object.assign({}, action, { annotation: nextAnnotations })
          : omit(action, ['annotation']);
      })
      .then(res => {
        dispatch({
          type: DELETE_ACTION_ANNOTATION_SUCCESS,
          payload: res,
          meta
        });

        // also delete comment thread
        return Promise.all(
          arrayify(commentActions)
            .map(action => action._id)
            .map(id => {
              return db.upsert(id, doc => {
                if (doc) {
                  return flagDeleted(doc);
                }
              });
            })
        );
      })
      .catch(err => {
        dispatch({
          type: DELETE_ACTION_ANNOTATION_ERROR,
          error: err,
          meta
        });
      });
  };
}

export const FETCH_ACTIVE_COMMENT_ACTIONS = 'FETCH_ACTIVES_COMMENT_ACTIONS';
export const FETCH_ACTIVE_COMMENT_ACTIONS_SUCCESS =
  'FETCH_ACTIVE_COMMENT_ACTIONS_SUCCESS';
export const FETCH_ACTIVE_COMMENT_ACTIONS_ERROR =
  'FETCH_ACTIVE_COMMENT_ACTIONS_ERROR';

export function fetchActiveCommentActions({
  nextUrl,
  baseUrl,
  cookie,
  cache = true
} = {}) {
  return (dispatch, getState) => {
    const { user, fetchActiveCommentActionsStatus } = getState();

    if (fetchActiveCommentActionsStatus.xhr) {
      fetchActiveCommentActionsStatus.xhr.abort();
    }

    let url, append;
    if (nextUrl) {
      url = nextUrl;
      append = true;
    } else {
      append = false;

      const query = `@type:CommentAction AND (participantId:"${escapeLucene(
        getId(user)
      )}" OR agentId:"${escapeLucene(
        getId(user)
      )}") AND actionStatus:ActiveActionStatus`;

      const qs = {
        sort: JSON.stringify('-startTime'),
        addActiveRoleIds: true,
        query: query,
        hydrate: JSON.stringify([
          'agent',
          'recipient',
          'participant',
          'object',
          'isPartOf',
          'mainEntity',
          'scope',
          'instrument'
        ]),
        includeDocs: true,
        potentialActions: 'bare',
        limit: 8,
        cache
      };

      url = `/action?${querystring.stringify(qs)}`;
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
      method: 'GET',
      json: true
    });

    dispatch({
      type: FETCH_ACTIVE_COMMENT_ACTIONS,
      payload: r.xhr
    });

    return r
      .then(({ body: itemList }) => {
        dispatch({
          type: FETCH_ACTIVE_COMMENT_ACTIONS_SUCCESS,
          payload: itemList,
          meta: { append }
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_ACTIVE_COMMENT_ACTIONS_ERROR,
          error: err
        });
      });
  };
}
