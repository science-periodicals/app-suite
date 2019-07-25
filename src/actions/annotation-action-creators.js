import { arrayify } from '@scipe/jsonld';
import { CSS_HEADER_HEIGHT } from '@scipe/ui';
import { getDomNodeId, getPosition } from '../utils/annotations';
import { REVIEWER_COMMENT, REVISION_REQUEST_COMMENT } from '../constants';

export const SET_ANNOTATION_TYPE = 'SET_ANNOTATION_TYPE';
export function setAnnotationType(annotationId, type) {
  return {
    type: SET_ANNOTATION_TYPE,
    meta: { annotationId },
    payload: type
  };
}

export const TOGGLE_DISPLAYED_ANNOTATION_TYPE =
  'TOGGLE_DISPLAYED_ANNOTATION_TYPE';
export function toggleDisplayedAnnotationType(type, checked) {
  return {
    type: TOGGLE_DISPLAYED_ANNOTATION_TYPE,
    payload: { type, checked }
  };
}

export const CREATE_ANNOTATION = 'CREATE_ANNOTATION';
export function createAnnotation(
  graphId,
  annotation,
  { isNew = true, focused = false, position } = {}
) {
  return (dispatch, getState) => {
    dispatch({
      type: CREATE_ANNOTATION,
      payload: Object.assign({ position, isNew }, annotation, { focused })
    });
  };
}

export const DELETE_ANNOTATION = 'DELETE_ANNOTATION';
export function deleteAnnotation(id) {
  return {
    type: DELETE_ANNOTATION,
    payload: { id }
  };
}

/**
 * When we toggle versions in the Files attachment and try to scroll & focus
 * to an annotation, the focus fails as the annotation hasn't been created by
 * Annotable yet, this allow to fix that by caching the `actionAnnotationId`
 * untill <Annotable /> creates the relevant annotation
 */
export const QUEUE_FOCUS_ACTION_ANNOTATION = 'QUEUE_FOCUS_ACTION_ANNOTATION';
export function queueFocusActionAnnotation(actionAnnotationId) {
  return {
    type: QUEUE_FOCUS_ACTION_ANNOTATION,
    payload: actionAnnotationId
  };
}

export const BULK_ANNOTATIONS = 'BULK_ANNOTATIONS';

export function bulkAnnotations(
  { bulkCreate, bulkDelete }, // { bulkDelete: new Set(annotationIds), bulkCreate: [annotations] }
  { immediate = false, reason } = {}
) {
  return (dispatch, getState) => {
    const { queuedFocusActionAnnotationId } = getState();

    if (queuedFocusActionAnnotationId && bulkCreate) {
      bulkCreate = arrayify(bulkCreate).map(annotation => {
        if (
          annotation.object === queuedFocusActionAnnotationId &&
          (annotation.type === REVIEWER_COMMENT ||
            annotation.type === REVISION_REQUEST_COMMENT)
        ) {
          return Object.assign({}, annotation, { focused: true });
        }
        return annotation;
      });
    }

    dispatch({
      type: BULK_ANNOTATIONS,
      payload: { bulkCreate, bulkDelete },
      immediate,
      meta: { reason }
    });
  };
}

export const UNFOCUS_ANNOTATION = 'UNFOCUS_ANNOTATION';
export function unfocusAnnotation() {
  return function(dispatch, getState) {
    const {
      annotations: { annotations }
    } = getState();
    if (annotations.some(a => a.focused)) {
      dispatch({ type: UNFOCUS_ANNOTATION });
    }
  };
}

export const FOCUS_ANNOTATION = 'FOCUS_ANNOTATION';
export function focusAnnotation(id, { navigate, history, location } = {}) {
  return (dispatch, getState) => {
    const {
      annotations: { annotations, displayedTypes }
    } = getState();

    const annotation = annotations.find(a => a.id === id);

    if (annotation) {
      if (!annotation.focused) {
        if (!displayedTypes[annotation.type]) {
          dispatch(toggleDisplayedAnnotationType(annotation.type, true));
        }

        dispatch({
          type: FOCUS_ANNOTATION,
          payload: id
        });
      }

      if (navigate && history && location) {
        const id = getDomNodeId(annotation.selector);
        // We swap the hash by a human readable one
        // we need to crawl up to the .annotable, then grab the permalink__counter id and swap to that
        const $node = document.getElementById(id);
        if ($node) {
          let $annotable = $node;
          while (
            $annotable &&
            (!$annotable.classList ||
              !$annotable.classList.contains('annotable'))
          ) {
            $annotable = $annotable.parentElement;
          }

          if ($annotable) {
            const $counter = $annotable.querySelector(
              '.permalink__counter[id]'
            );
            if ($counter) {
              const hash = `#${$counter.id}`;

              history.push({
                pathname: location.pathname,
                search: location.search,
                hash
              });

              if (location.hash === hash) {
                const $target = document.getElementById(hash.substring(1));
                if ($target) {
                  const rect = $target.getBoundingClientRect();
                  window.scroll({
                    top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT - 40,
                    behavior: 'smooth'
                  });
                }
              }
            }
          }
        }
      }
    }
  };
}

export const POSITION_ANNOTATIONS = 'POSITION_ANNOTATIONS';
export function positionAnnotations(positions, { immediate = false } = {}) {
  return {
    type: POSITION_ANNOTATIONS,
    payload: {
      positions
    },
    immediate
  };
}

export const UPDATE_ANNOTATION_POSITIONS_BUT_DONT_LAYOUT =
  'UPDATE_ANNOTATION_POSITIONS_BUT_DONT_LAYOUT';
export function positionAnnotationsButDontLayout(
  positions,
  { immediate = true } = {}
) {
  return {
    type: UPDATE_ANNOTATION_POSITIONS_BUT_DONT_LAYOUT,
    payload: {
      positions
    },
    immediate
  };
}

export const RE_LAYOUT_ANNOTATIONS = 'RE_LAYOUT_ANNOTATIONS';
export function reLayoutAnnotations(positions) {
  return (dispatch, getState) => {
    const positions = getState().annotations.annotations.reduce(
      (positions, annotation) => {
        positions[annotation.id] = getPosition(annotation);
        return positions;
      },
      {}
    );

    dispatch({
      type: RE_LAYOUT_ANNOTATIONS,
      payload: {
        positions
      }
    });
  };
}

export const REPOSITION_ANNOTATIONS = 'REPOSITION_ANNOTATIONS';

/**
 * This removes the `position` of the annotations so that  <Annotable /> remeasure them
 */
export function repositionAnnotations({
  reason // (for debugging purpose)
} = {}) {
  return {
    type: REPOSITION_ANNOTATIONS,
    meta: { reason } //  debugging purpose note that meta will be removed by annotation middleware so won't be visible with redux logger...
  };
}

export const SET_MEASURABLE_REF = 'SET_MEASURABLE_REF';
export function setMeasurableRef($measurable) {
  return {
    type: SET_MEASURABLE_REF,
    payload: $measurable
  };
}

export const DELETE_MEASURABLE_REF = 'DELETE_MEASURABLE_REF';
export function deleteMeasurableRef($measurable) {
  return {
    type: DELETE_MEASURABLE_REF
  };
}
