import uuid from 'uuid';
import pickBy from 'lodash/pickBy';
import { rangeFromOffsets } from 'web-verse';
import slug from 'slug';
import { getId, arrayify, unprefix, reUuid } from '@scipe/jsonld';
import {
  getScopeId,
  getStageActions,
  getObjectId,
  getResultId,
  getActionOrder,
  needActionAssignment,
  isActionAssigned
} from '@scipe/librarian';
import { getSortedStages, getWorkflowAction } from './workflow';
import {
  ERROR,
  COMMENT,
  REVISION_REQUEST_COMMENT,
  REVIEWER_COMMENT,
  ENDORSER_COMMENT,
  WARNING,
  ERROR_NEED_ASSIGNMENT,
  ERROR_NEED_ASSIGNEE,
  ERROR_NEED_ENDORSER_ASSIGNMENT,
  ERROR_NEED_ENDORSER,
  ERROR_NEED_PRODUCTION_CONTENT,
  ERROR_NEED_PRODUCTION_CONTENT_OR_SERVICE,
  ERROR_FILE_UPLOAD_NEEDED,
  WARNING_REVISION_UPLOAD_NEEDED,
  ERROR_TYPESETTER_NEED_AUTHOR_REVISION,
  WARNING_SERVICE_AVAILABLE,
  WARNING_CAN_REVISE_FILE
} from '../constants';

/**
 * Get the `stageIndex` and `actionIndex` from a `stage` and `action` qs
 * Note: If `stage` or `action` are not specified, we return latest stage and
 * first action of that stage or the next action that the user needs to complete if
 * `user`, and `acl` are provided
 */
export function parseAnnotableQueryParameters(
  query = {},
  actionMap = {},
  { user, acl } = {}
) {
  const stages = getSortedStages(actionMap).reverse();
  let graphId, stageId, actionId, stageIndex, actionIndex;

  if (query.stage) {
    // `query.stage` can be an index or a UUID (action @id)
    if (/^\d+$/.test(query.stage)) {
      const _stageIndex = parseInt(query.stage, 10);
      if (stages[_stageIndex]) {
        stageIndex = _stageIndex;
        stageId = getId(stages[_stageIndex]);
      }
    } else {
      const _stageId = `action:${query.stage}`;
      const _stageIndex = stages.findIndex(stage => getId(stage) === _stageId);
      if (_stageIndex !== -1) {
        stageIndex = _stageIndex;
        stageId = getId(stages[_stageIndex]);
      }
    }
  }

  if (query.action) {
    // `query.action` can be an index or a UUID (action @id)

    if (/^\d+$/.test(query.action)) {
      // if action is an index, a stage must have been specified
      if (stageIndex != null) {
        const _actionIndex = parseInt(query.action, 10);
        const identifier = `${stageIndex}.${_actionIndex}`;
        const stageActions = getStageActions(stages[stageIndex]);
        const action = stageActions.find(
          action => action.identifier === identifier
        );
        if (action) {
          graphId = getGraphId(action, stageActions);
          actionIndex = _actionIndex;
          actionId = getId(action);
        }
      }
    } else {
      // query.action is a UUID (action @id) => we infer the stage from the action and discard value of query.stage
      const _actionId = `action:${query.action}`;

      // find the stage
      for (let _stageIndex = 0; _stageIndex < stages.length; _stageIndex++) {
        const stage = stages[_stageIndex];
        const stageActions = getStageActions(stage);
        let action = stageActions.find(_action => getId(_action) === _actionId);
        if (action) {
          // if actionId is an endorse action we replace it by the endorse action object
          if (action['@type'] === 'EndorseAction') {
            const objectId = getObjectId(action);
            action = stageActions.find(_action => getId(_action) === objectId);
          }

          if (action) {
            graphId = getGraphId(action, stageActions);
            stageId = getId(stage);
            stageIndex = _stageIndex;
            actionIndex = parseInt(action.identifier.split('.')[1], 10);
            actionId = getId(action);
            break;
          }
        }
      }
    }
  }

  // handle defaults
  if (stageId == null && stageIndex == null) {
    // default values
    stageIndex = Math.max(stages.length - 1, 0);
    stageId = getId(stages[stageIndex]);
  }

  if (actionId == null && actionIndex == null) {
    const stageActions = getStageActions(actionMap[stageId]);
    const defaultDisplayedStageActions = stageActions.filter(
      action => action['@type'] !== 'EndorseAction'
    );

    let defaultAction;
    if (user && acl) {
      // smart default: pickup the action requiring the user attention

      // First we check if user can perform an action
      const performableActions = defaultDisplayedStageActions
        .filter(
          action =>
            (action.actionStatus === 'ActiveActionStatus' ||
              action.actionStatus === 'StagedActionStatus' ||
              action.actionStatus === 'EndorsedActionStatus') &&
            acl.checkPermission(user, 'PerformActionPermission', { action })
        )
        .sort((a, b) => {
          return getActionOrder(a) - getActionOrder(b);
        });

      if (performableActions.length) {
        defaultAction = performableActions[0];
        actionIndex = parseInt(defaultAction.identifier.split('.')[1], 10);
      } else {
        // Second we check if user need to endorse an action
        const endorsableActions = stageActions.filter(
          action =>
            action['@type'] === 'EndorseAction' &&
            action.actionStatus === 'ActiveActionStatus' &&
            acl.checkPermission(user, 'PerformActionPermission', { action })
        );

        defaultAction = defaultDisplayedStageActions.find(
          action => getId(action) === getObjectId(endorsableActions[0])
        );

        if (defaultAction) {
          actionIndex = parseInt(defaultAction.identifier.split('.')[1], 10);
        } else {
          // Third we check if user need to assign an action
          const assignableActions = stageActions.filter(
            action =>
              !isActionAssigned(action) &&
              needActionAssignment(action) &&
              acl.checkPermission(user, 'AssignActionPermission', { action })
          );

          if (assignableActions.length) {
            defaultAction = assignableActions[0];
            actionIndex = parseInt(defaultAction.identifier.split('.')[1], 10);
          } else {
            // Last we fallback to first action of the stage
            actionIndex = 0;
            defaultAction = defaultDisplayedStageActions[actionIndex];
          }
        }
      }
    } else {
      // No user is provided we default to first action of the stage
      actionIndex = 0;
      defaultAction = defaultDisplayedStageActions[actionIndex];
    }

    if (defaultAction) {
      graphId = getGraphId(defaultAction, getStageActions(actionMap[stageId]));
      actionId = getId(defaultAction);
    }
  }

  return {
    graphId,
    latestStageId: getId(stages[stages.length - 1]),
    stageId,
    stageIndex,
    actionId,
    actionIndex
  };
}

function getGraphId(action, stageActions) {
  if (
    action['@type'] === 'TypesettingAction' ||
    action['@type'] === 'BuyAction'
  ) {
    // `instrumentOf` points to a workflow action (typically a CreateReleaseAction)
    const instrument = stageActions.find(
      _action => getId(_action) === getId(action.instrumentOf)
    );
    return getObjectId(instrument);
  }

  if (action['@type'] === 'EndorseAction') {
    // `object` points to a workflow action
    const object = stageActions.find(
      _action => getId(_action) === getId(action.object)
    );

    return getGraphId(object, stageActions);
  }

  // `CreateReleaseAction` and `PublishAction` have different `graphId` for `object` and `result` based on the actionStatus. We make sure to return the right one.
  if (
    action['@type'] === 'CreateReleaseAction' ||
    action['@type'] === 'PublishAction'
  ) {
    return action.actionStatus === 'CompletedActionStatus'
      ? getResultId(action)
      : getObjectId(action);
  }

  return getObjectId(action);
}

export function getAnnotableQueryParameters(
  { stageId, actionId } = {},
  actionMap = {}
) {
  const stages = getSortedStages(actionMap).reverse();
  let stageIndex, actionIndex;
  if (stageId != null) {
    stageIndex = Math.max(
      stages.findIndex(stage => getId(stage) === stageId),
      0
    );
  } else {
    stageIndex = 0;
  }

  if (actionId != null) {
    const action = getStageActions(stages[stageIndex]).find(
      action => getId(action) === actionId
    );
    actionIndex = action ? parseInt(action.identifier.split('.')[1], 10) : 0;
  } else {
    actionIndex = 0;
  }

  return {
    stageId,
    actionId,
    stageIndex,
    actionIndex,
    query: {
      stage: stageIndex.toString(),
      action: actionIndex.toString()
    }
  };
}

function getSelectorDepth(selector) {
  let depth = 0;
  if (!selector) {
    return depth;
  }

  let current = selector;
  depth += 1;
  while (current.hasSubSelector) {
    depth += 1;
    current = current.hasSubSelector;
  }
  return depth;
}

export function isSelectorEqual(
  selector = {}, // typically from <Annotable />
  _selector = {}, // typically from a CommentAction object
  {
    matchingLevel = 0,
    offsets = true, // if set to false we do not take into account startOffset and endOffset in the comparision
    debug = false
  } = {}
) {
  if (debug) {
    console.log({ selector, _selector });
  }

  // `node` comparison must be first so that we can handle matchingLevel first
  let sameNode;
  if (getId(selector.node) === getId(_selector.node)) {
    sameNode = true;
  } else if (matchingLevel) {
    const depth = getSelectorDepth(selector);
    const _depth = getSelectorDepth(_selector);

    if (depth >= matchingLevel || _depth >= matchingLevel) {
      // Here we handle cases such as review action being embedded into an AssessAction (if the selector for the review action in the assess action page will be "wrapped" into the AsessAction selector)
      // => we unwrap the selector with the longest depth
      if (depth === _depth) {
        return isSelectorEqual(
          unwrapSelector(selector, matchingLevel),
          unwrapSelector(_selector, matchingLevel),
          {
            matchingLevel: 0,
            offsets,
            debug
          }
        );
      } else if (depth > _depth) {
        return isSelectorEqual(
          unwrapSelector(selector, matchingLevel),
          _selector,
          {
            matchingLevel: 0,
            offsets,
            debug
          }
        );
      } else {
        return isSelectorEqual(
          selector,
          unwrapSelector(_selector, matchingLevel),
          {
            matchingLevel: 0,
            offsets,
            debug
          }
        );
      }
    } else {
      sameNode = false;
    }
  } else {
    sameNode = false;
  }

  if (!sameNode) {
    return false;
  }

  const sameType = selector['@type'] === _selector['@type'];
  if (!sameType) {
    return false;
  }

  const sameGraph = selector.graph === _selector.graph;
  if (!sameGraph) {
    return false;
  }

  const sameSelectedProperty =
    selector.selectedProperty === _selector.selectedProperty;
  if (!sameSelectedProperty) {
    return false;
  }

  const sameSelectedItem =
    getId(selector.selectedItem) === getId(_selector.selectedItem);
  if (!sameSelectedItem) {
    return false;
  }

  const sameHtmlId = selector.htmlId === _selector.htmlId;
  if (!sameHtmlId) {
    return false;
  }

  const sameOffsets =
    (offsets === false || selector.startOffset === _selector.startOffset) &&
    (offsets === false || selector.endOffset === _selector.endOffset);

  if (!sameOffsets) {
    return false;
  }

  const sameSubSelector =
    (selector.hasSubSelector == null && _selector.hasSubSelector == null) ||
    isSelectorEqual(selector.hasSubSelector, _selector.hasSubSelector, {
      matchingLevel: 0,
      offsets,
      debug
    });

  return sameSubSelector;
}

export function unwrapSelector(selector, level = 0) {
  let unwrapped = selector;
  while (level > 0 && unwrapped) {
    unwrapped = unwrapped.hasSubSelector;
    level--;
  }

  return unwrapped;
}

export function hasOffsets(selector) {
  let tip = selector;
  while (tip) {
    if (tip.startOffset != null || tip.endOffset != null) {
      return true;
    }
    tip = tip.hasSubSelector;
  }
  return false;
}

export function getInnerMostSelector(selector) {
  let tip = selector;
  let candidate;
  while (tip) {
    candidate = tip;
    tip = tip.hasSubSelector;
  }

  return candidate;
}

export function getInnerMostOffsettedSelector(selector) {
  let tip = selector;
  let candidate;
  while (tip) {
    if (tip.startOffset != null || tip.endOffset != null) {
      candidate = tip;
    }
    tip = tip.hasSubSelector;
  }

  return candidate;
}

/**
 * Note: for selector targeting an encoding or a distribution, we do not take
 * into account the action context
 */
export function getDomNodeId(selector) {
  const pathElements = [];
  let tip = selector;

  let stripFrom = 0;
  while (tip) {
    if (tip.selectedProperty) {
      pathElements.push(tip.selectedProperty);
      if (
        tip.selectedProperty === 'encoding' ||
        tip.selectedProperty === 'distribution'
      ) {
        if (!stripFrom) {
          stripFrom = pathElements.length;
        }
      }
    }

    if (getId(tip.node)) {
      pathElements.push(getId(tip.node));
    }

    if (tip.selectedItem) {
      const value = getId(tip.selectedItem);

      if (value != null) {
        pathElements.push(
          slug(value, {
            symbols: false,
            lower: false
          })
        );
      }
    }

    if (tip.htmlId) {
      pathElements.push(tip.htmlId);
    }

    tip = tip.hasSubSelector;
  }

  return `wv::${pathElements.slice(stripFrom).join('-')}`;
}

export function getWebVerseIdFromSheet(resource, sheet) {
  return `${getId(resource)}-encoding-${sheet.name.replace(/\s+/g, '-')}`;
}

export function createAnnotationData(
  type, // annotation type (see constants COMMENT, ERROR, WARNING)
  selector = {},
  counter,
  object, // An  identifier from constants (e.g., ERROR_ALTERNATE_NAME ...) or a uuid.v4() making the first part of a cnode: for a comment (commentAction.resultComment or an action.annotation)
  priority = new Date().getTime() // an index (higher => higher priority)
) {
  // Tweak the priority so the annotation sorts nicely
  if (
    (type === COMMENT ||
      type === REVIEWER_COMMENT ||
      type === ENDORSER_COMMENT ||
      type === REVISION_REQUEST_COMMENT) &&
    !reUuid.test(object)
  ) {
    console.warn(
      'createAnnotationData',
      `invalid object for type ${type} (expected a uuid.v4: got ${object})`
    );
  }

  // ERROR > WARNING > REVISION_REQUEST_COMMENT > REVIEWER_COMMENT > ENDORSER_COMMENT > COMMENT
  const BASE = 365 * 24 * 60 * 60 * 1000;
  const priorityTypeOffsetMap = {
    [ERROR]: BASE * 600,
    [WARNING]: BASE * 500,
    [REVISION_REQUEST_COMMENT]: BASE * 400,
    [REVIEWER_COMMENT]: BASE * 300,
    [ENDORSER_COMMENT]: BASE * 200,
    [COMMENT]: BASE * 100
  };

  // some special cases (we need to add user to submission before assigning them etc.)
  // Add to this everytime an <Annotable /> can have multiple info
  const priorityObjectOffsetMap = {
    [ERROR_NEED_ASSIGNEE]: BASE * 20,
    [ERROR_NEED_ASSIGNMENT]: BASE * 10,

    [ERROR_NEED_ENDORSER]: BASE * 20,
    [ERROR_NEED_ENDORSER_ASSIGNMENT]: BASE * 10,

    [ERROR_NEED_PRODUCTION_CONTENT]: BASE * 40,
    [ERROR_NEED_PRODUCTION_CONTENT_OR_SERVICE]: BASE * 30,
    [ERROR_TYPESETTER_NEED_AUTHOR_REVISION]: BASE * 20,
    [ERROR_FILE_UPLOAD_NEEDED]: BASE * 10,

    [WARNING_REVISION_UPLOAD_NEEDED]: BASE * 30,
    [WARNING_CAN_REVISE_FILE]: BASE * 20,
    [WARNING_SERVICE_AVAILABLE]: BASE * 10
  };

  priority =
    (priorityTypeOffsetMap[type] || 0) +
    (priorityObjectOffsetMap[object] || 0) +
    priority;

  return {
    id: uuid.v4(),
    type,
    object,
    hash: counter.getUrl().hash,
    selector: pickBy(selector),
    priority
  };
}

export function getPosition(annotation) {
  if (
    annotation.selector.node == null ||
    annotation.selector.selectedProperty == null
  ) {
    return;
  }

  const $scope = document.getElementById(getDomNodeId(annotation.selector));
  if (!$scope) {
    return;
  }

  let $annotable = $scope;
  while (!$annotable.classList.contains('annotable')) {
    $annotable = $annotable.parentElement;
    if ($annotable.tagName === 'BODY') {
      return;
    }
  }

  let $el = $annotable;
  let scrollTop = window.scrollY;
  while ($el.tagName !== 'BODY') {
    if ($el.scrollTop) {
      scrollTop += $el.scrollTop;
    }
    $el = $el.parentElement;
  }

  const offsetTop = ($annotable.getBoundingClientRect() || {}).top; // TODO investigate why getBoundingClientRect can return undefined
  const rootAbsTop = offsetTop + scrollTop;

  let range;
  const offsettedSelector = getInnerMostOffsettedSelector(annotation.selector);

  if (
    offsettedSelector &&
    offsettedSelector.startOffset != null &&
    offsettedSelector.endOffset != null
  ) {
    range = rangeFromOffsets(
      $scope.firstChild,
      offsettedSelector.startOffset,
      offsettedSelector.endOffset
    );
  } else {
    range = document.createRange();
    range.setStart($annotable, 0);
    range.setEnd($annotable, $annotable.childNodes.length);
  }

  // measure annotation height
  const $annotation = document.getElementById(annotation.id);
  const annotationHeight = $annotation
    ? $annotation.getBoundingClientRect().height
    : 0;

  const clientRects = range.getClientRects();
  const firstSelRect = clientRects ? clientRects[0] || {} : {}; // TODO investigate why getClientRects() can return undefined
  let absTop = firstSelRect.top + scrollTop;
  const absBottom = absTop + annotationHeight;

  let targetTop = absTop - rootAbsTop;

  // detect if this is a section level annotation to fix the Edge bug with getClientRects and getBoundingClientRect
  // this will force the top of the label and annotation to the top of the section annotatable highlight block
  if (
    !offsettedSelector ||
    (offsettedSelector.startOffset == null &&
      offsettedSelector.endOffset == null)
  ) {
    targetTop = 0;
    absTop = rootAbsTop;
  }

  return {
    rootAbsTop,
    targetAbsTop: absTop, //where it should be in the absence of other constraints, also use to sort the labels
    targetAbsBottom: absBottom, //where it should be in the absence of other constraints
    targetTop: targetTop, //where it should be in the absence of other constraints, also use to position the label
    absTop, //will change in the future due to constraints
    absBottom, //will change in the future due to constraints
    top: absTop - rootAbsTop, //used to position the annotation
    height: annotationHeight
  };
}

/**
 * Check if `selector` targets a Graph encoding / resource
 */
export function isFilesAttachmentSelector(selector = {}) {
  const nodeId = getId(selector.node);

  // Note: the check on `node:` should be sufficient as anything targeting a
  // file should do it through a resource (hence the `node:` prefix)
  if (typeof nodeId === 'string' && nodeId.startsWith('node:')) {
    return true;
  }
  if (selector.hasSubSelector) {
    return isFilesAttachmentSelector(selector.hasSubSelector);
  }
}

export function getAnnotationLabel(annotation) {
  let label =
    annotation.type === ERROR
      ? 'Required Action'
      : annotation.type === WARNING
      ? 'Potential Action'
      : annotation.type === REVISION_REQUEST_COMMENT
      ? 'Revision Request'
      : annotation.type === REVIEWER_COMMENT
      ? 'Reviewer Comment'
      : annotation.type === ENDORSER_COMMENT
      ? 'Endorser Comment'
      : annotation.type === COMMENT
      ? 'Comment'
      : 'Annotation';
  const s = getInnerMostOffsettedSelector(annotation.selector);

  if (s) {
    label += ` (char. ${s.startOffset} - ${s.endOffset})`;
  }

  return label;
}

export function deepSetGraph(selector, graphId) {
  return Object.assign(
    {},
    selector,
    { graph: graphId },
    selector.hasSubSelector && selector.hasSubSelector.graph
      ? {
          hasSubSelector: deepSetGraph(selector.hasSubSelector, graphId)
        }
      : undefined
  );
}

/**
 * Get the value needed for the `graph` parameter of a `Selector`
 * `graph` takes the value of the graph snapshot when `action` is completed
 */
export function getSelectorGraphParam(action) {
  switch (action['@type']) {
    case 'CreateReleaseAction':
    case 'PublishAction':
      return getResultId(action);

    case 'TypesettingAction':
      return getId(action.targetedRelease);

    default:
      return getObjectId(action);
  }
}

export function getRelativeLocationLink(version = '', location = '') {
  const [major, minor] = version.split('.');

  return `[v${major}.${minor}⋮${location}](#v${major}.${minor}:${location}.0)`;
}

export function prettifyLocation(
  identifier = '', // can be a hash starting with `#` or an identifier (no `#`)
  { preserveHash = false } = {}
) {
  if (!preserveHash && identifier.startsWith('#')) {
    identifier = identifier.substring(1);
  }

  identifier = identifier.replace(':', '⋮');
  if (identifier.endsWith('.0')) {
    identifier = identifier.replace(/\.0$/, '');
  }

  return identifier;
}

/**
 * The `annotation.object` need to be equal to the @id of the comment or
 * annotation so that we don't need to update it when a comment is saved. However,
 * user can change comment type => we can switch from an action annotation to a
 * commentAction.resultComment => the second part of the cnode: @id (the one after
 * the @) changes when we change the @type. To avoid that we only return the first
 * part of the cnode: @id ¯\_(ツ)_/¯
 */
export function getAnnotationObject(
  item // CommentAction or Annotation
) {
  if (item['@type'] !== 'CommentAction' && item['@type'] !== 'Annotation') {
    console.warn(
      `getAnnotationObject was called with invalid item of @type ${
        item['@type']
      }`
    );
  }

  const cnodeId =
    item['@type'] === 'CommentAction' ? getId(item.resultComment) : getId(item);

  if (!cnodeId || !cnodeId.startsWith('cnode:')) {
    throw new Error(`getAnnotationObject, invalid item ${cnodeId}`);
  }

  return unprefix(cnodeId.split('@')[0]);
}

export function getCommentActionOnAnnotationSelector({
  action, // the action currently rendered on screen
  annotation, // the annotation (UI sense) of the right column
  user,
  acl,
  actionMap, // from the redux store
  revisionRequestCommentHostAction, // the action hosting a revision request comment (general, not in context) (in revisionRequestCommentHostAction.comment)
  revisionRequestCommentHostAnnotation, // the action hosting a revision request anntation (in context) (in revisionRequestCommentHostAnnotation.annotation)
  reviewerCommentHostAction, // the action hosting a reviewer comment  (general, not in context) (in reviewerCommentHostAction.comment)
  reviewerCommentHostAnnotation // the action hosting a reviwer comment annotation (in context) (in reviewerCommentHostAnnotation.annotation)
}) {
  // We construct the matching commentAction selector based on the host action type
  // The reasoning is from `action` (the host action) how can one get to the
  // actionAnnotation (`RevisionRequestComment` or `ReviewerComment`)
  // Note: when multiple paths are available we always biais toward the shortest one
  // For example in case where we have:
  // C1+R1+A1 -> C2+R2+A2
  // the instrument of R2 is [C2, A1]
  // => 2 different paths can lead to A1 from R2 (R2.instrument(A1) or R2.instrument(C2).instrument), we bias toward the shortest one

  let commentActionOnAnnotationSelector;
  switch (action['@type']) {
    case 'CreateReleaseAction': {
      if (
        revisionRequestCommentHostAction &&
        revisionRequestCommentHostAnnotation
      ) {
        commentActionOnAnnotationSelector = {
          '@type': 'NodeSelector',
          graph: annotation.selector.graph,
          node: annotation.selector.node,
          selectedProperty: 'instrument',
          selectedItem: getId(action.instrument),
          // subselector for the assessAction
          hasSubSelector: {
            '@type': 'NodeSelector',
            graph: getSelectorGraphParam(revisionRequestCommentHostAction),
            node: getId(revisionRequestCommentHostAction),
            selectedProperty: 'annotation',
            selectedItem: getId(revisionRequestCommentHostAnnotation)
          }
        };
      } else if (reviewerCommentHostAction && reviewerCommentHostAnnotation) {
        const assessAction = getWorkflowAction(getId(action.instrument), {
          user,
          acl,
          actionMap
        });

        commentActionOnAnnotationSelector = {
          '@type': 'NodeSelector',
          graph: annotation.selector.graph,
          node: annotation.selector.node,
          selectedProperty: 'instrument',
          selectedItem: getId(action.instrument),
          // subselector for the assessAction
          hasSubSelector: {
            '@type': 'NodeSelector',
            graph: getSelectorGraphParam(assessAction),
            node: getId(assessAction),
            selectedProperty: 'instrument',
            selectedItem: getId(reviewerCommentHostAction),
            // subselector for the review action
            hasSubSelector: {
              '@type': 'NodeSelector',
              graph: getSelectorGraphParam(reviewerCommentHostAction),
              node: getId(reviewerCommentHostAction),
              selectedProperty: 'annotation',
              selectedItem: getId(reviewerCommentHostAnnotation)
            }
          }
        };
      }
      break;
    }

    case 'AssessAction': {
      // !! comments can be on the assessed version or the previous one...
      if (
        revisionRequestCommentHostAction &&
        revisionRequestCommentHostAnnotation
      ) {
        if (getId(revisionRequestCommentHostAction) === getId(action)) {
          // comment is on assessed Version
          commentActionOnAnnotationSelector = {
            '@type': 'NodeSelector',
            graph: getSelectorGraphParam(action),
            node: getId(action),
            selectedProperty: 'annotation',
            selectedItem: getId(revisionRequestCommentHostAnnotation)
          };
        } else {
          // comment is on previous assessed version
          const createReleaseAction = arrayify(action.instrument)
            .map(instrument =>
              getWorkflowAction(getId(instrument), {
                user,
                acl,
                actionMap
              })
            )
            .find(
              instrument =>
                instrument && instrument['@type'] === 'CreateReleaseAction'
            );

          if (createReleaseAction && getId(createReleaseAction.instrument)) {
            const assessAction = getWorkflowAction(
              getId(createReleaseAction.instrument),
              { user, acl, actionMap }
            );

            if (assessAction) {
              commentActionOnAnnotationSelector = {
                '@type': 'NodeSelector',
                graph: annotation.selector.graph,
                node: annotation.selector.node,
                selectedProperty: 'instrument',
                selectedItem: getId(createReleaseAction),
                hasSubSelector: {
                  '@type': 'NodeSelector',
                  graph: getSelectorGraphParam(createReleaseAction),
                  node: getId(createReleaseAction),
                  selectedProperty: 'instrument',
                  selectedItem: getId(assessAction),
                  hasSubSelector: {
                    '@type': 'NodeSelector',
                    graph: getSelectorGraphParam(assessAction),
                    node: getId(assessAction),
                    selectedProperty: 'annotation',
                    selectedItem: getId(revisionRequestCommentHostAnnotation)
                  }
                }
              };
            }
          }
        }
      } else if (reviewerCommentHostAction && reviewerCommentHostAnnotation) {
        if (getObjectId(reviewerCommentHostAction) === getObjectId(action)) {
          commentActionOnAnnotationSelector = {
            '@type': 'NodeSelector',
            graph: annotation.selector.graph,
            node: annotation.selector.node,
            selectedProperty: 'instrument',
            selectedItem: getId(reviewerCommentHostAction),
            hasSubSelector: {
              '@type': 'NodeSelector',
              graph: getSelectorGraphParam(reviewerCommentHostAction),
              node: getId(reviewerCommentHostAction),
              selectedProperty: 'annotation',
              selectedItem: getId(reviewerCommentHostAnnotation)
            }
          };
        } else {
          const createReleaseAction = arrayify(action.instrument)
            .map(instrument =>
              getWorkflowAction(getId(instrument), {
                user,
                acl,
                actionMap
              })
            )
            .find(
              instrument =>
                instrument && instrument['@type'] === 'CreateReleaseAction'
            );

          if (createReleaseAction && getId(createReleaseAction.instrument)) {
            const assessAction = getWorkflowAction(
              getId(createReleaseAction.instrument),
              { user, acl, actionMap }
            );

            if (assessAction) {
              commentActionOnAnnotationSelector = {
                '@type': 'NodeSelector',
                graph: annotation.selector.graph,
                node: annotation.selector.node,
                selectedProperty: 'instrument',
                selectedItem: getId(createReleaseAction),
                hasSubSelector: {
                  '@type': 'NodeSelector',
                  graph: getSelectorGraphParam(createReleaseAction),
                  node: getId(createReleaseAction),
                  selectedProperty: 'instrument',
                  selectedItem: getId(assessAction),
                  hasSubSelector: {
                    '@type': 'NodeSelector',
                    graph: getSelectorGraphParam(assessAction),
                    node: getId(assessAction),
                    selectedProperty: 'instrument',
                    selectedItem: getId(reviewerCommentHostAction),
                    hasSubSelector: {
                      '@type': 'NodeSelector',
                      graph: getSelectorGraphParam(reviewerCommentHostAction),
                      node: getId(reviewerCommentHostAction),
                      selectedProperty: 'annotation',
                      selectedItem: getId(reviewerCommentHostAnnotation)
                    }
                  }
                }
              };
            }
          }
        }
      }
      break;
    }

    case 'ReviewAction': {
      if (
        revisionRequestCommentHostAction &&
        revisionRequestCommentHostAnnotation
      ) {
        // instrument of the ReviewAction can be a createRelease and / or the AsessAction leading to the instantiation of ReviewAction
        const instruments = arrayify(action.instrument)
          .map(instrument =>
            getWorkflowAction(getId(instrument), {
              user,
              acl,
              actionMap
            })
          )
          .filter(Boolean);

        const createReleaseAction = instruments.find(
          instrument => instrument['@type'] === 'CreateReleaseAction'
        );

        const assessAction = instruments.find(
          instrument => instrument['@type'] === 'AssessAction'
        );

        if (getId(assessAction) === getId(revisionRequestCommentHostAction)) {
          commentActionOnAnnotationSelector = {
            '@type': 'NodeSelector',
            graph: annotation.selector.graph,
            node: annotation.selector.node,
            selectedProperty: 'instrument',
            selectedItem: getId(assessAction),
            hasSubSelector: {
              '@type': 'NodeSelector',
              graph: getSelectorGraphParam(revisionRequestCommentHostAction),
              node: getId(revisionRequestCommentHostAction),
              selectedProperty: 'annotation',
              selectedItem: getId(revisionRequestCommentHostAnnotation)
            }
          };
        } else if (
          createReleaseAction &&
          getId(createReleaseAction.instrument)
        ) {
          const assessAction = getWorkflowAction(
            getId(createReleaseAction.instrument),
            { user, acl, actionMap }
          );

          if (assessAction) {
            commentActionOnAnnotationSelector = {
              '@type': 'NodeSelector',
              graph: annotation.selector.graph,
              node: annotation.selector.node,
              selectedProperty: 'instrument',
              selectedItem: getId(createReleaseAction),
              hasSubSelector: {
                '@type': 'NodeSelector',
                graph: getSelectorGraphParam(createReleaseAction),
                node: getId(createReleaseAction),
                selectedProperty: 'instrument',
                selectedItem: getId(assessAction),
                hasSubSelector: {
                  '@type': 'NodeSelector',
                  graph: getSelectorGraphParam(assessAction),
                  node: getId(assessAction),
                  selectedProperty: 'instrument',
                  selectedItem: getId(revisionRequestCommentHostAction),
                  hasSubSelector: {
                    '@type': 'NodeSelector',
                    graph: getSelectorGraphParam(
                      revisionRequestCommentHostAction
                    ),
                    node: getId(revisionRequestCommentHostAction),
                    selectedProperty: 'annotation',
                    selectedItem: getId(revisionRequestCommentHostAnnotation)
                  }
                }
              }
            };
          }
        }
      } else if (reviewerCommentHostAction && reviewerCommentHostAnnotation) {
        if (getId(reviewerCommentHostAction) === getId(action)) {
          commentActionOnAnnotationSelector = {
            '@type': 'NodeSelector',
            graph: getSelectorGraphParam(action),
            node: getId(action),
            selectedProperty: 'annotation',
            selectedItem: getId(reviewerCommentHostAnnotation)
          };
        }

        // Note: we don't backport other reviewers review annotations
      }
      break;
    }
  }

  return commentActionOnAnnotationSelector;
}

/**
 * Checks if the selector targets content that exists
 * this is useful to filter out comment action made on content that has
 * been updated since then
 * e.g. user comment on a paragraph and author upload a revision with that
 * paragraph deleted
 */
export function checkIfSelectorTargetExists(
  selector = {},
  { actionMap = {}, graphMap = {} } = {}, // scopeData from redux store
  contentMap = {},
  // used for recursion
  _value,
  _nodeMap,
  _parentSelector
) {
  if (selector['@type'] == 'NodeSelector') {
    const graphData =
      graphMap[getId(selector.graph)] ||
      graphMap[getScopeId(selector.graph)] ||
      {}; // When the user make a comment in the context of an active CreateReleaseAction the `selector.graph` point to a graph that doesn't exists yet => we fallback to the live graph
    if (!_nodeMap) {
      _nodeMap = graphData.nodeMap || {};
    }

    const nodeId = getId(selector.node);

    _value =
      actionMap[nodeId] ||
      _nodeMap[nodeId] ||
      (graphData[nodeId] && graphData[nodeId].graph) ||
      _value;

    if (selector.selectedProperty) {
      _value = typeof _value === 'object' && _value[selector.selectedProperty];
      if (selector.selectedItem != null) {
        _value = arrayify(_value).find(value => {
          if (getId(value) != null || getId(selector.selectedItem) != null) {
            return getId(value) === getId(selector.selectedItem);
          }
        });
        const valueId = getId(_value);
        if (valueId) {
          _value = actionMap[valueId] || _nodeMap[valueId] || _value;
        }
      }
    }

    if (selector.hasSubSelector) {
      return checkIfSelectorTargetExists(
        selector.hasSubSelector,
        { actionMap, graphMap },
        contentMap,
        _value,
        _nodeMap,
        selector
      );
    } else {
      const hasValue = !!_value;
      if (hasValue) {
        return true;
      } else {
        // if we didn't find a value we may still return `true` if the targeted
        // property is one of action guaranteed to exists (so any action prop _but_
        // `comment` and `annotation`)
        if (
          nodeId &&
          nodeId.startsWith('action:') &&
          selector.selectedProperty !== 'comment' &&
          selector.selectedProperty !== 'annotation'
        ) {
          return true;
        } else {
          return false;
        }
      }
    }
  } else if (selector['@type'] === 'HtmlSelector') {
    // HtmlSelector can only be used at the tip so there won't be another sub selector
    if (
      _parentSelector &&
      (_parentSelector.selectedProperty === 'encoding' ||
        _parentSelector.selectedProperty === 'distribution')
    ) {
      const resourceId = getId(_parentSelector.node);
      const resource = _nodeMap[resourceId];
      if (resource) {
        let contentData;

        const encodingIds = arrayify(resource.encoding).concat(
          arrayify(resource.distribution)
        );
        for (const encodingId of encodingIds) {
          const content = contentMap[encodingId];
          if (
            content &&
            content.$nodeMap &&
            content.$nodeMap[selector.htmlId]
          ) {
            contentData = content.$nodeMap[selector.htmlId];
            if (contentData) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}
