import flatten from 'lodash/flatten';
import { getResourceInfo } from '@scipe/ui';
import { getId, arrayify, getValue, embed, getNodeMap } from '@scipe/jsonld';
import {
  getStageActions,
  getBlockingActions,
  getActionPotentialAssignee,
  needActionAssignment,
  isActionAssigned,
  getParts,
  getObjectId,
  getResult,
  getAgentId,
  getObject,
  getChecksumValue
} from '@scipe/librarian';
import { getPrice, isFree } from '../utils/payment-utils';

export function getMostRecentCompletedCreateReleaseAction(actionMap = {}) {
  return Object.values(actionMap)
    .filter(action => {
      return (
        action['@type'] === 'CreateReleaseAction' &&
        action.actionStatus === 'CompletedActionStatus'
      );
    })
    .sort((a, b) => {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    })[0];
}

export function getSortedStages(actionMap = {}) {
  return Object.values(actionMap)
    .filter(action => {
      return action['@type'] === 'StartWorkflowStageAction';
    })
    .sort((a, b) => {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
}

export function findWorkflowAction(actionId, stage = {}) {
  const actions = getStageActions(stage);
  return actions.find(action => getId(action) === getId(actionId));
}

export function getStageInviteActions(actionMap = {}, stages = [], opts = {}) {
  // stages sorted, most recent is first
  // if no stageId default to current one (most recent)
  const stageId = getId(opts.stageId) || getId(stages[0]);

  let stageIndex = stages.findIndex(_stage => getId(_stage) === stageId);
  if (stageIndex === -1) {
    stageIndex = stageIndex = 0;
  }
  const stage = stages[stageIndex];
  let nextStage;
  if (stageIndex > 0) {
    nextStage = stages[stageIndex - 1];
  }

  return Object.values(actionMap).filter(action => {
    return (
      action['@type'] === 'InviteAction' &&
      action.startTime >= stage.startTime &&
      (!nextStage || action.startTime < nextStage.startTime)
    );
  });
}

export function getActionsByStage(actionMap = {}, stages) {
  if (!stages) {
    stages = getSortedStages(actionMap);
  }

  return stages.map(stage => {
    // replace by instances when possible
    return {
      stage,
      actions: getStageActions(stage).map(
        action => actionMap[getId(action)] || action
      )
    };
  });
}

export function getInstance(stageAction, { actionMap, user, acl }) {
  // try to replace by instance when the user has performAction perm

  const action = actionMap[getId(stageAction)];
  if (
    action &&
    (acl.checkPermission(user, 'PerformActionPermission', {
      action: stageAction // note: `stageAction` and not `action` as in some cases (like during UnassignAction), the user may not have access to `action` anymore so `action` becomes out of date
    }) ||
      acl.checkPermission(user, 'ViewActionPermission', {
        action: stageAction
      }))
  ) {
    return action;
  }

  return stageAction;
}

export function getWorkflowAction(actionId, { actionMap, user, acl }) {
  actionId = getId(actionId);

  if (actionMap[actionId]) {
    return getInstance(actionMap[actionId], { actionMap, user, acl });
  }

  // we may not have access to the action => we go get it from the stage
  const stages = getSortedStages(actionMap);

  for (const stage of stages) {
    const stageActions = getStageActions(stage);
    const action = stageActions.find(action => getId(action) === actionId);
    if (action) {
      return action;
    }
  }
}

export function getTypesetterRevisionRequestComment(typesettingAction) {
  const encoding = getObject(typesettingAction);
  if (encoding) {
    const sha = getChecksumValue(encoding, 'sha256');
    if (sha) {
      const comment = arrayify(typesettingAction.comment).find(
        comment =>
          comment['@type'] === 'RevisionRequestComment' &&
          comment.ifMatch === sha
      );
      return comment;
    }
  }
}

export function getAnnotableActionData(
  graph,
  stageId,
  actionId,
  user,
  acl,
  actionMap,
  commentMap,
  resources // top level ld stars compliant hydrated resources
) {
  const stages = getSortedStages(actionMap);
  const stageIndex = stages.findIndex(stage => getId(stage) === getId(stageId));
  const stage = stages[stageIndex];

  let stageActions = getStageActions(stage);

  // get authorizeActions (needed to assess the future audiences)
  const authorizeActions = flatten(
    stageActions
      .filter(action => getId(action) === actionId)
      .map(action =>
        arrayify(action.potentialAction).filter(
          action =>
            action['@type'] === 'AuthorizeAction' &&
            action.actionStatus !== 'CompletedActionStatus' &&
            action.actionStatus !== 'FailedActionStatus'
        )
      )
  )
    .filter(Boolean)
    .map(action => getInstance(action, { actionMap, user, acl }));

  // try to replace by instance when the user has performAction perm
  stageActions = stageActions.map(stageAction =>
    getInstance(stageAction, { actionMap, user, acl })
  );

  const action = stageActions.find(action => getId(action) === getId(actionId));

  if (!action) return;

  const blockingActions = getBlockingActions(action, stage);

  const endorseAction = stageActions.find(
    stageAction =>
      stageAction['@type'] == 'EndorseAction' &&
      getObjectId(stageAction) === getId(action)
  );

  const serviceActions = stageActions.filter(stageAction =>
    getId(stageAction.serviceOutputOf)
  );

  const pendingActions = stageActions.filter(action =>
    acl.checkPermission(user, 'PerformActionPermission', {
      action
    })
  );

  const canEndorse =
    !!endorseAction &&
    acl.checkPermission(user, 'PerformActionPermission', {
      action: endorseAction
    });

  const canViewEndorse =
    !!endorseAction &&
    acl.checkPermission(user, 'ViewActionPermission', {
      action: endorseAction
    });

  const canPerform = acl.checkPermission(user, 'PerformActionPermission', {
    action
  });

  const canView = acl.checkPermission(user, 'ViewActionPermission', {
    action
  });

  const canComment =
    action.actionStatus === 'StagedActionStatus' && (canPerform || canView); // Note canEndorse and canViewEndorse is already covered by canView (adding them would create false positive when the action is in ActiveActionStatus

  const nComments = Object.values(commentMap).reduce((count, commentAction) => {
    if (getObjectId(commentAction) === getId(action)) {
      count++;
    }
    return count;
  }, 0);

  return {
    stage,
    action,
    nComments,
    endorseAction,
    serviceActions,
    authorizeActions,
    blockingActions,
    typesettingAction: serviceActions.find(
      action => action['@type'] === 'TypesettingAction'
    ),
    completeImpliesSubmit: pendingActions.length === 1,
    isBlocked: !!blockingActions.length,
    isReadyToBeSubmitted: checkIsReadyToBeSubmitted(
      graph,
      action,
      resources,
      actionMap
    ),
    canEndorse,
    canViewEndorse,
    canComment,
    canView,
    canPerform,
    canAssign: acl.checkPermission(user, 'AssignActionPermission', {
      action
    }),
    canAssignEndorseAction: endorseAction
      ? acl.checkPermission(user, 'AssignActionPermission', {
          action: endorseAction
        })
      : undefined,
    canReschedule: acl.checkPermission(user, 'RescheduleActionPermission', {
      action
    }),
    canCancel: acl.checkPermission(user, 'CancelActionPermission', {
      action,
      workflowActions: stageActions
    })
  };
}

export function checkIsReadyToBeSubmitted(
  graph,
  action,
  resources = [], // top level hydrated resources
  actionMap = {}
) {
  switch (action['@type']) {
    case 'CreateReleaseAction': {
      const stageActions = getStageActions(
        actionMap[getId(action.resultOf)]
      ).map(action => actionMap[getId(action)] || action);

      const serviceActions = stageActions.filter(stageAction =>
        getId(stageAction.serviceOutputOf)
      );

      const mainEntity = resources.find(
        resource => getId(resource) === getId(graph.mainEntity)
      );

      const hasReleaseRequirement =
        action.releaseRequirement === 'ProductionReleaseRequirement'
          ? mainEntity &&
            arrayify(mainEntity.encoding).some(
              encoding => encoding.fileFormat === 'text/html' // HTML and not DS3 to be sure that document worker runned
            )
          : true;

      const hasPendingServiceActions = serviceActions.some(serviceAction => {
        return (
          serviceAction.actionStatus !== 'CompletedActionStatus' &&
          serviceAction.actionStatus !== 'FailedActionStatus' &&
          serviceAction.actionStatus !== 'CanceledActionStatus'
        );
      });

      const uploadActions = Object.values(actionMap).filter(
        _action =>
          _action['@type'] === 'UploadAction' &&
          getId(_action.instrumentOf) === getId(action) &&
          _action.actionStatus !== 'FailedActionStatus'
      );

      const hasActiveUploadActions = uploadActions.some(
        _action => _action.actionStatus === 'ActiveActionStatus'
      );

      const hasCompletedUploadActions = uploadActions.some(
        _action => _action.actionStatus === 'CompletedActionStatus'
      );

      const hasAllContentUrl = resources.every(resource => {
        const parts = getParts(resource);
        return ![resource].concat(parts).some(resource => {
          return arrayify(resource.encoding)
            .concat(arrayify(resource.distribution))
            .some(
              encoding =>
                encoding.contentUrl && encoding.contentUrl.startsWith('file:')
            );
        });
      });

      const hasReleaseNotes =
        action.releaseNotes != null && action.releaseNotes != '';

      const hasAllContributorIdentity = arrayify(
        mainEntity && mainEntity.author
      )
        .concat(arrayify(mainEntity && mainEntity.contributor))
        .every(contributor => {
          const agentId = getAgentId(contributor);
          return (
            agentId &&
            (agentId.startsWith('user:') ||
              agentId.startsWith('org:') ||
              agentId.startsWith('team:'))
          );
        });

      return !!(
        mainEntity &&
        resources.length &&
        (action.releaseRequirement !== 'ProductionReleaseRequirement' ||
          (action.releaseRequirement === 'ProductionReleaseRequirement' &&
            hasAllContributorIdentity)) &&
        hasReleaseRequirement &&
        hasReleaseNotes &&
        hasAllContentUrl &&
        !hasPendingServiceActions &&
        !hasActiveUploadActions
      );
    }

    case 'TypesettingAction': {
      const uploadActions = Object.values(actionMap).filter(
        _action =>
          _action['@type'] === 'UploadAction' &&
          getId(_action.instrumentOf) === getId(action)
      );

      // if there is a RevisionRequestComment we block
      const comment = getTypesetterRevisionRequestComment(action);

      return !!(
        !comment &&
        uploadActions.length &&
        uploadActions.some(uploadAction => {
          const baseEncodingId = getObjectId(action);
          const uploadedEncoding = getResult(uploadAction);
          return (
            uploadAction.actionStatus === 'CompletedActionStatus' &&
            uploadedEncoding &&
            baseEncodingId === getId(uploadedEncoding.isBasedOn)
          );
        }) &&
        uploadActions.every(
          uploadAction =>
            uploadAction.actionStatus === 'CompletedActionStatus' ||
            uploadAction.actionStatus === 'CanceledActionStatus' ||
            uploadAction.actionStatus === 'FailedActionStatus'
        )
      );
    }

    case 'AssessAction': {
      const hasDecision = !!action.result;

      // validate decision letter
      const informAction = Object.values(actionMap).find(_action => {
        return (
          _action['@type'] === 'InformAction' &&
          getId(action.result) &&
          getId(_action.ifMatch) === getId(action.result)
        );
      });

      if (!informAction) {
        return hasDecision;
      }

      const emailMessage = informAction.instrument;
      if (!emailMessage) {
        return hasDecision;
      }

      return hasDecision && !!getValue(emailMessage.text);
    }

    case 'DeclareAction':
      return !arrayify(action.question).some(
        question =>
          question['@type'] === 'Question' &&
          !arrayify(action.result).some(
            answer =>
              answer['@type'] === 'Answer' &&
              getId(answer.parentItem) === getId(question) &&
              answer.text
          )
      );

    case 'ReviewAction':
      return !!(
        action.resultReview &&
        action.resultReview.reviewBody &&
        action.resultReview.reviewRating &&
        action.resultReview.reviewRating.ratingValue &&
        !arrayify(action.answer).some(answer => {
          return (
            answer['@type'] === 'Answer' &&
            answer.parentItem &&
            answer.parentItem['@type'] === 'Question' &&
            !answer.text
          );
        })
      );

    case 'PublishAction': {
      const checkActions = Object.values(actionMap).filter(
        action => action['@type'] === 'CheckAction'
      );

      const hasSlug = !!(
        action.result && typeof action.result.slug === 'string'
      );

      return (
        hasSlug &&
        checkActions.every(
          action => action.actionStatus === 'CompletedActionStatus'
        )
      );
    }

    case 'BuyAction':
      return true;

    default:
      return true;
  }
}

export function getStageReleaseId(stageId, actionMap = {}) {
  stageId = getId(stageId);
  const stages = getSortedStages(actionMap); // sorted in reverse chronological order (first stage is most recent)
  const stageIndex = stages.findIndex(stage => getId(stage) === stageId);
  if (stageIndex === -1) {
    return;
  }

  const prevStages = stages.slice(stageIndex);

  // find latest relevant release, start from stage corresponding to stageId, and keep going back in time
  let releaseId;
  for (let stage of prevStages) {
    const actions = getStageActions(stage).map(
      action => actionMap[getId(action)] || action
    );

    const createReleaseAction = actions.find(
      action =>
        action['@type'] === 'CreateReleaseAction' && getId(action.result)
    );
    if (createReleaseAction) {
      releaseId = getId(createReleaseAction.result);
      break;
    }
  }

  return releaseId;
}

export function checkIsAutoEndorsedAction(action, endorseAction) {
  return (
    (action['@type'] === 'PayAction' &&
      (action.priceSpecification == null ||
        isFree(action.priceSpecification) ||
        (action.requestedPrice != null &&
          action.requestedPrice >= getPrice(action.priceSpecification)))) ||
    (endorseAction &&
      endorseAction.actionStatus === 'CompletedActionStatus' &&
      getId(endorseAction.agent) === 'bot:scipe')
  );
}

export function getWorkflowStatusIcon(user, acl, action, stage) {
  let statusIcon;

  const workflowActions = getStageActions(stage);

  const blockingActions = getBlockingActions(action, stage);

  const endorseAction = workflowActions.find(
    stageAction =>
      stageAction['@type'] == 'EndorseAction' &&
      getObjectId(stageAction) === getId(action)
  );

  const canPerform = acl.checkPermission(user, 'PerformActionPermission', {
    action
  });

  const canView = acl.checkPermission(user, 'ViewActionPermission', {
    action
  });

  const canAssign = acl.checkPermission(user, 'AssignActionPermission', {
    action
  });

  const canAssignEndorseAction = endorseAction
    ? acl.checkPermission(user, 'AssignActionPermission', {
        action: endorseAction
      })
    : undefined;

  const canEndorse =
    !!endorseAction &&
    acl.checkPermission(user, 'PerformActionPermission', {
      action: endorseAction
    });

  const canViewEndorse =
    !!endorseAction &&
    acl.checkPermission(user, 'ViewActionPermission', {
      action: endorseAction
    });

  const canComment =
    action.actionStatus === 'StagedActionStatus' && (canPerform || canView); // Note canEndorse and canViewEndorse is already covered by canView (adding them would create false positive when the action is in ActiveActionStatus

  const isAutoEndorsedAction = checkIsAutoEndorsedAction(action, endorseAction);

  if (action.actionStatus === 'CanceledActionStatus') {
    statusIcon = 'statusError';
  } else if (
    (canAssign &&
      ((!isActionAssigned(action) && needActionAssignment(action)) ||
        (!isActionAssigned(action) &&
          !getActionPotentialAssignee(action, acl.getScope(), {
            workflowActions
          }).length))) ||
    (canAssignEndorseAction &&
      !isAutoEndorsedAction &&
      ((!isActionAssigned(endorseAction) &&
        needActionAssignment(endorseAction)) ||
        (!isActionAssigned(endorseAction) &&
          !getActionPotentialAssignee(endorseAction, acl.getScope(), {
            workflowActions
          }).length)))
  ) {
    statusIcon = 'personWarning';
  } else if (
    (canPerform ||
      canEndorse ||
      (!!endorseAction &&
        endorseAction.actionStatus !== 'CompletedActionStatus' &&
        canViewEndorse)) &&
    action.actionStatus !== 'CompletedActionStatus'
  ) {
    statusIcon = blockingActions.length ? 'warningTriangle' : 'warning';
  } else if (action.actionStatus === 'CompletedActionStatus') {
    statusIcon =
      endorseAction && !isAutoEndorsedAction ? 'checkDouble' : 'check';
  } else if (canComment) {
    statusIcon = 'feedback';
  } else {
    statusIcon = 'time';
  }

  return statusIcon;
}

export function getPotentialAgents(user, acl, action = {}) {
  const roles = acl
    .getActiveRoles(user)
    .filter(
      role =>
        acl.checkAudience(role, action) ||
        (getId(role) && getId(role) === getId(action.agent))
    );

  return roles;
}

export function pluralizeAudienceType(audienceType) {
  return audienceType === 'public' ? 'the public' : `${audienceType}s`;
}

export function getHydratedTopLevelResources(graph, nodeMap) {
  const resourceInfo = getResourceInfo(graph, nodeMap, { sort: true });

  const resources = arrayify(resourceInfo.resourceTree).map(resource => {
    return embed(
      nodeMap[getId(resource)] || { '@id': getId(resource) },
      nodeMap,
      {
        keys: [
          'license',
          'encoding',
          'distribution',
          'hasPart',
          'author',
          'contributor'
        ],
        blacklist: [
          'resourceOf',
          'isNodeOf',
          'exampleOfWork',
          'editor',
          'producer',
          'funder',
          'sponsor',
          'citation',
          'isPartOf',
          'encodesCreativeWork',
          'isBasedOn'
        ]
      }
    );
  });

  return resources;
}

/**
 * Get the overwrite `nodeMap` associated with `actionId` (typically a
 * `TypesettingAction`)
 */
export function getOverwriteNodeMap(actionId, { user, actionMap, acl }) {
  actionId = getId(actionId);
  if (!actionId) {
    return;
  }
  const action = getWorkflowAction(actionId, { actionMap, user, acl });
  if (!action || action['@type'] !== 'TypesettingAction') {
    return;
  }

  // We get the latest updateAction associated with a webify action `resultOf`
  // the typesetting action (`action`)
  // find the latest upload action associated with the typesetting action
  const uploadAction = Object.values(actionMap)
    .filter(
      action =>
        action['@type'] === 'UploadAction' &&
        getId(action.instrumentOf) === actionId &&
        (action.actionStatus === 'ActiveActionStatus' ||
          action.actionStatus === 'CompletedActionStatus')
    )
    .sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

  let nodeMap;

  // find the associated webify action (`instrument`)
  let updateAction, webifyAction;
  if (uploadAction) {
    nodeMap = { [getId(uploadAction.object)]: uploadAction.object }; // TODO add uploadAction.result instead ?

    webifyAction = getWorkflowAction(getId(uploadAction.instrument), {
      user,
      acl,
      actionMap
    });

    if (webifyAction) {
      // get the updateAction (result of the webify action)
      updateAction = actionMap[getId(webifyAction.result)];

      if (updateAction) {
        nodeMap = getNodeMap(updateAction.object);
      }
    }
  }

  return nodeMap;
}

export function getFileAction(action = {}, { user, actionMap, acl }) {
  if (
    action['@type'] === 'PublishAction' ||
    action['@type'] === 'CreateReleaseAction'
  ) {
    return action;
  }

  const attachments = arrayify(action.instrument)
    .map(instrument =>
      getWorkflowAction(getId(instrument), {
        user,
        actionMap,
        acl
      })
    )
    .filter(Boolean);

  return attachments.find(
    attachment => attachment['@type'] === 'CreateReleaseAction'
  );
}
