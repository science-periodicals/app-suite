import omit from 'lodash/omit';
import { getId, arrayify } from '@scipe/jsonld';
import {
  ERROR,
  WARNING,
  COMMENT,
  REVIEWER_COMMENT,
  ENDORSER_COMMENT,
  REVISION_REQUEST_COMMENT,
  REFERENCE,
  LINK
} from '../constants';
import {
  SET_ANNOTATION_TYPE,
  CREATE_ANNOTATION,
  DELETE_ANNOTATION,
  BULK_ANNOTATIONS,
  FOCUS_ANNOTATION,
  QUEUE_FOCUS_ACTION_ANNOTATION,
  REPOSITION_ANNOTATIONS,
  RE_LAYOUT_ANNOTATIONS,
  UNFOCUS_ANNOTATION,
  POSITION_ANNOTATIONS,
  UPDATE_ANNOTATION_POSITIONS_BUT_DONT_LAYOUT,
  TOGGLE_DISPLAYED_ANNOTATION_TYPE,
  SET_MEASURABLE_REF,
  DELETE_MEASURABLE_REF
} from '../actions/annotation-action-creators';
import {
  CREATE_COMMENT_ACTION_SUCCESS,
  DELETE_COMMENT_ACTION_SUCCESS,
  CREATE_ACTION_ANNOTATION_SUCCESS,
  DELETE_ACTION_ANNOTATION_SUCCESS
} from '../actions/comment-action-creators';
import { POUCH_DATA_DELETED } from '../actions/pouch-action-creators';

const GAP_HEIGHT = 16; // TODO try to remove

/**
 * An annotation is an object of this shape:
 * {
 *   id,
 *   type, // COMMENT, ERROR, WARNING...
 *   object, // for Info this is the info identifier (e.g., ERROR_ALTERNATE_NAME ...) otherwise this is an id (commentId (_not_ commentActionId so commentAction.resultCommentId), or action.annotationId)
 *   isNew,
 *   isBeingRepositioned,
 *   priority: Infinity,
 *   highlightDomNodeId, // sub higlight (currently deprecated)
 *   hash, // the hash part of the URL of the counter
 *   selector: {
 *     node, // the resourceId or actionId
 *     selectedProperty, // a property, if it's an annotation on a part of text will be 'encoding' or 'distribution'
 *     selectedItem, // if selectedProperty point to a list, the @id of the value in the list
 *     hasSubSelector: ...
 *   },
 *   focused,
 *   position: {
 *     rootAbsTop,
 *     targetAbsTop: absTop, //where it should be in the absence of other constraints, also use to sort the labels
 *     targetAbsBottom: absBottom, //where it should be in the absence of other constraints
 *     targetTop: absTop - rootAbsTop,  //where it should be in the absence of other constraints, also use to position the label
 *     absTop, //will change in the future due to constraints
 *     absBottom,  //will change in the future due to constraints
 *     top: absTop - rootAbsTop, //used to position the annotation
 *     height: boxHeight
 *   }
 * }
 */

const initialState = {
  displayedTypes: {
    [COMMENT]: true,
    [REVIEWER_COMMENT]: true,
    [ENDORSER_COMMENT]: true,
    [REVISION_REQUEST_COMMENT]: true,
    [WARNING]: true,
    [ERROR]: true,
    [REFERENCE]: true,
    [LINK]: true
  },
  annotations: [],
  graphId: null
};

export function $measurable(state = null, action) {
  switch (action.type) {
    case SET_MEASURABLE_REF:
      return action.payload;
    case DELETE_MEASURABLE_REF:
      return null;
    default:
      return state;
  }
}

export function queuedFocusActionAnnotationId(state = null, action) {
  switch (action.type) {
    case QUEUE_FOCUS_ACTION_ANNOTATION:
      return action.payload;
    case FOCUS_ANNOTATION:
      return null;
    default:
      return state;
  }
}

export function annotations(state = initialState, action) {
  switch (action.type) {
    case SET_ANNOTATION_TYPE: {
      const { annotationId } = action.meta;
      const type = action.payload;

      return Object.assign({}, state, {
        annotations: state.annotations.map(annotation => {
          if (annotation.id === annotationId) {
            return Object.assign({}, annotation, { type });
          }
          return annotation;
        })
      });
    }

    case DELETE_ACTION_ANNOTATION_SUCCESS:
    case DELETE_COMMENT_ACTION_SUCCESS: {
      const { annotationObject } = action.meta;
      const nextAnnotations = state.annotations.filter(a => {
        return a.object !== annotationObject;
      });

      return Object.assign({}, state, {
        annotations: layout(nextAnnotations)
      });
    }

    case POUCH_DATA_DELETED: {
      const payload = action.buffered
        ? action.payload
        : arrayify(action.payload);

      const commentActionIds = new Set(
        payload
          .map(data => data.master)
          .filter(
            action =>
              action && action['@type'] === 'CommentAction' && getId(action)
          )
      );

      if (commentActionIds.size) {
        const nextAnnotations = state.annotations.filter(a => {
          return !commentActionIds.has(a.object);
        });

        return Object.assign({}, state, {
          annotations: layout(nextAnnotations)
        });
      }
      return state;
    }

    case CREATE_ACTION_ANNOTATION_SUCCESS:
    case CREATE_COMMENT_ACTION_SUCCESS: {
      const { annotationObject } = action.meta;

      return Object.assign({}, state, {
        annotations: state.annotations.map(annotation => {
          if (annotation.isNew && annotation.object === annotationObject) {
            return omit(annotation, ['isNew']);
          }

          return annotation;
        })
      });
    }

    case REPOSITION_ANNOTATIONS: {
      return Object.assign({}, state, {
        annotations: state.annotations.map(annotation =>
          Object.assign({}, annotation, { isBeingRepositioned: true })
        )
      });
    }

    case TOGGLE_DISPLAYED_ANNOTATION_TYPE: {
      const displayedType = action.payload.type;

      return Object.assign({}, state, {
        displayedTypes: Object.assign({}, state.displayedTypes, {
          [displayedType]: action.payload.checked
        })
      });
    }

    case CREATE_ANNOTATION: {
      const annotation = action.payload;
      let nextAnnotations = state.annotations;
      if (annotation.focused) {
        nextAnnotations = nextAnnotations.map(a => {
          if (a.focused) {
            return Object.assign({}, a, { focused: false });
          } else {
            return a;
          }
        });
      }
      nextAnnotations = nextAnnotations.concat(annotation);
      return Object.assign({}, state, {
        // creating a new annotation automatically activates the displayed type
        displayedTypes: Object.assign({}, state.displayedTypes, {
          [annotation.type]: true
        }),
        annotations: layout(nextAnnotations)
      });
    }

    case DELETE_ANNOTATION: {
      const nextAnnotations = state.annotations.filter(a => {
        if (a.id === action.payload.id) {
          return false;
        } else {
          return true;
        }
      });

      return Object.assign({}, state, {
        annotations: layout(nextAnnotations)
      });
    }

    case BULK_ANNOTATIONS: {
      // handle deletion
      const nextAnnotations = state.annotations.filter(a => {
        if (action.payload.bulkDelete && action.payload.bulkDelete.has(a.id)) {
          return false;
        } else {
          return true;
        }
      });

      // handle creation
      if (action.payload.bulkCreate) {
        action.payload.bulkCreate.forEach(a => {
          nextAnnotations.push(a);
        });
      }

      return Object.assign({}, state, {
        annotations: layout(nextAnnotations)
      });
    }

    case RE_LAYOUT_ANNOTATIONS:
    case POSITION_ANNOTATIONS: {
      const nextAnnotations = state.annotations.map(a => {
        if (a.id in action.payload.positions) {
          return Object.assign(omit(a, ['isBeingRepositioned']), {
            position: action.payload.positions[a.id]
          });
        } else {
          return a;
        }
      });

      return Object.assign({}, state, {
        annotations: layout(nextAnnotations)
      });
    }

    case UPDATE_ANNOTATION_POSITIONS_BUT_DONT_LAYOUT: {
      const nextAnnotations = state.annotations.map(a => {
        if (a.id in action.payload.positions) {
          return Object.assign(omit(a, ['isBeingRepositioned']), {
            position: action.payload.positions[a.id]
          });
        } else {
          return a;
        }
      });

      return Object.assign({}, state, {
        annotations: nextAnnotations
      });
    }

    case UNFOCUS_ANNOTATION: {
      return Object.assign({}, state, {
        annotations: state.annotations.map(a => {
          if (a.focused) {
            return Object.assign({}, a, { focused: false });
          } else {
            return a;
          }
        })
      });
    }

    case FOCUS_ANNOTATION: {
      const nextAnnotations = state.annotations.map(a => {
        if (a.id === action.payload) {
          return Object.assign({}, a, { focused: true });
        } else if (a.focused) {
          return Object.assign({}, a, { focused: false });
        } else {
          return a;
        }
      });
      return Object.assign({}, state, {
        annotations: layout(nextAnnotations)
      });
    }

    default:
      return state;
  }
}

function layout(annotations) {
  const toBeLayout = annotations.filter(a => a.position);
  if (!toBeLayout.length) return annotations;

  const unchanged = annotations.filter(a => !a.position);
  return unchanged.concat(updatePosition(toBeLayout));
}

function updatePosition(annotations) {
  //reset position
  annotations = annotations.map(a => {
    if (
      a.position.absTop !== a.position.targetAbsTop ||
      a.position.absBottom !== a.position.targetAbsBottom ||
      a.position.top !== a.position.targetAbsTop - a.position.rootAbsTop
    ) {
      return Object.assign({}, a, {
        position: Object.assign({}, a.position, {
          absTop: a.position.targetAbsTop,
          absBottom: a.position.targetAbsBottom,
          top: a.position.targetAbsTop - a.position.rootAbsTop
        })
      });
    } else {
      return a;
    }
  });

  // sort by target abs pos or priority in case of equality
  annotations.sort((a, b) => {
    if (a.position.targetAbsTop == b.position.targetAbsTop) {
      const aSubSelector = a.selector.hasSubSelector || {};
      const bSubSelector = b.selector.hasSubSelector || {};
      if ((aSubSelector.startOffset || 0) === (bSubSelector.startOffset || 0)) {
        return b.priority - a.priority;
      } else {
        return (
          (aSubSelector.startOffset || 0) - (bSubSelector.startOffset || 0)
        );
      }
    } else {
      return a.position.targetAbsTop - b.position.targetAbsTop;
    }
  });

  // get the focused annotation or the first one
  let i,
    indFocused = 0;
  for (i = 0; i < annotations.length; i++) {
    if (annotations[i].focused) {
      indFocused = i;
      break;
    }
  }

  // push everything that conflicts (up and down form the focused element) (can cascade)
  // push up
  let ref, current;
  for (i = indFocused - 1; i >= 0; i--) {
    ref = annotations[i + 1];
    current = annotations[i];
    //    console.log({
    //      ref,
    //      current,
    //      test: current.position.absBottom + GAP_HEIGHT > ref.position.absTop
    //    });

    if (current.position.absBottom + GAP_HEIGHT > ref.position.absTop) {
      const nextPosition = getPushedUpPosition(current, ref, GAP_HEIGHT);

      annotations[i] = Object.assign({}, annotations[i], {
        position: Object.assign({}, annotations[i].position, nextPosition)
      });
    }
  }

  // push down
  for (i = indFocused + 1; i < annotations.length; i++) {
    ref = annotations[i - 1];
    current = annotations[i];
    //    console.log({
    //      ref,
    //      current,
    //      test: ref.position.absBottom + GAP_HEIGHT > current.position.absTop
    //    });
    if (ref.position.absBottom + GAP_HEIGHT > current.position.absTop) {
      const nextPosition = getPushedDownPosition(current, ref, GAP_HEIGHT);

      annotations[i] = Object.assign({}, annotations[i], {
        position: Object.assign({}, annotations[i].position, nextPosition)
      });
    }
  }

  return annotations;
}

function getPushedUpPosition(target, ref, gapHeight = GAP_HEIGHT) {
  const absBottom = ref.position.absTop - gapHeight;
  const absTop = absBottom - target.position.height;
  const top = absTop - target.position.rootAbsTop;

  return { absBottom, absTop, top };
}

function getPushedDownPosition(target, ref, gapHeight) {
  const absTop = ref.position.absBottom + gapHeight;
  const absBottom = absTop + target.position.height;
  const top = absTop - target.position.rootAbsTop;

  return { absBottom, absTop, top };
}
