import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import isUrl from 'is-url';
import { createSelector } from 'reselect';
import { getRootEncoding, ControlPanel, PaperButton } from '@scipe/ui';
import { getId, arrayify, unrole } from '@scipe/jsonld';
import {
  schema,
  getObject,
  getObjectId,
  getResult,
  getStageId,
  getStageActions,
  WEBIFY_ACTION_TYPES
} from '@scipe/librarian';
import ds3Mime from '@scipe/ds3-mime';
import Encoding from './encoding';
import Annotable from './annotable';
import ProgressLogger from './progress-logger';
import {
  createActionMapSelector,
  createGraphDataSelector,
  createGraphAclSelector
} from '../selectors/graph-selectors';
import { cancelUpload } from '../actions/encoding-action-creators';
import Counter from '../utils/counter';
import {
  ERROR_NEED_PRODUCTION_CONTENT,
  ERROR_NEED_PRODUCTION_CONTENT_OR_SERVICE,
  ERROR_FILE_UPLOAD_NEEDED,
  WARNING_REVISION_UPLOAD_NEEDED,
  ERROR_TYPESETTER_NEED_AUTHOR_REVISION,
  ERROR_TYPESETTER_MUST_REVISE_FILE_BASED_ON_NEW_AUTHOR_CONTENT,
  WARNING_SERVICE_AVAILABLE,
  WARNING_CAN_REVISE_FILE
} from '../constants';
import {
  getInstance,
  getTypesetterRevisionRequestComment
} from '../utils/workflow';

export default class AnnotableEncoding extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    action: PropTypes.shape({
      '@type': PropTypes.oneOf([
        'CreateReleaseAction',
        'TypesettingAction',
        'PublishAction'
      ])
    }).isRequired, // the action providing the resource
    resource: PropTypes.object,
    counter: PropTypes.instanceOf(Counter).isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool.isRequired,

    forceEnableUpdateMainEntityEncoding: PropTypes.bool, // for `TypesettingAction` we only allow to update the main entity encoding (not the parts) => we set `disabled` to `true` this props allows to overwrite that

    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,

    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number
  };

  static defaultProps = {
    action: {}
  };

  render() {
    const { resource } = this.props;

    // handle multi part figures
    const parts = arrayify(resource.hasPart);
    let resources, isFromMultiPartImage;
    if (schema.is(resource, 'Image') && parts.length) {
      isFromMultiPartImage = true;
      resources = parts;
    } else {
      resources = [resource];
      isFromMultiPartImage = false;
    }

    return (
      <ul className="annotable-encoding sa__clear-list-styles">
        {resources.map((resource, i) => {
          return (
            <AnnotableEncodingItem
              key={getId(resource)}
              {...this.props}
              resource={resource}
              isFromMultiPartImage={isFromMultiPartImage}
            />
          );
        })}
      </ul>
    );
  }
}

class _AnnotableEncodingItem extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    action: PropTypes.shape({
      '@type': PropTypes.oneOf([
        'CreateReleaseAction',
        'TypesettingAction',
        'PublishAction'
      ])
    }).isRequired, // the action providing the resource
    resource: PropTypes.object, // in case of multi part figure this is a part, not the top level multi part figure resourcee
    counter: PropTypes.instanceOf(Counter).isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool.isRequired,

    forceEnableUpdateMainEntityEncoding: PropTypes.bool, // for `TypesettingAction` we only allow to update the main entity encoding (not the parts) => we set `disabled` to `true` this props allows to overwrite that

    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,

    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    isFromMultiPartImage: PropTypes.bool.isRequired,

    // redux
    canPerform: PropTypes.bool, // can the user perform `action`. Must be set if `action` is a CreateReleaseAction
    mainEntityId: PropTypes.string,
    ioActions: PropTypes.arrayOf(PropTypes.object), // Array of latest UploadAction, webify action, update action associated with webify action and service actions (typesetting etc.) if any in that order
    cancelUpload: PropTypes.func.isRequired
  };

  static defaultProps = {
    action: {}
  };

  handleCancel = e => {
    const { graphId, action, ioActions, cancelUpload } = this.props;
    const uploadAction = arrayify(ioActions).find(
      ioAction => ioAction['@type'] === 'UploadAction'
    );
    const webifyAction = arrayify(ioActions).find(ioAction =>
      WEBIFY_ACTION_TYPES.has(ioAction['@type'])
    );

    const roleName =
      action['@type'] === 'TypesettingAction' ? 'producer' : 'author';

    cancelUpload(
      graphId,
      [uploadAction, webifyAction].filter(Boolean),
      roleName
    );
  };

  render() {
    const {
      graphId,
      resource,
      action,
      annotable,
      readOnly,
      disabled,
      canPerform,
      forceEnableUpdateMainEntityEncoding,
      displayAnnotations,
      displayPermalink,
      counter,
      createSelector,
      matchingLevel,
      mainEntityId,
      ioActions,
      isFromMultiPartImage
    } = this.props;

    const activeTypesettingAction = arrayify(ioActions).find(
      ioAction =>
        ioAction['@type'] === 'TypesettingAction' &&
        (ioAction.actionStatus === 'ActiveActionStatus' ||
          ioAction.actionStatus === 'StagedActionStatus')
    );

    const uploadAction = arrayify(ioActions).find(
      ioAction => ioAction['@type'] === 'UploadAction'
    );
    const webifyAction = arrayify(ioActions).find(ioAction =>
      WEBIFY_ACTION_TYPES.has(ioAction['@type'])
    );

    let encoding;

    // if there is an ongoing typesetting action, we show the PDF encoding
    // this is because right now we let the typesetter mutating the Graph.
    if (
      activeTypesettingAction &&
      action &&
      action['@type'] !== 'TypesettingAction'
    ) {
      encoding = arrayify(resource.encoding).find(
        encoding => encoding.fileFormat === 'application/pdf'
      );
    } else {
      encoding = getRootEncoding(resource);
    }

    return (
      <li className="annotable-encoding__list-item" key={getId(resource)}>
        {encoding && (
          <Annotable
            graphId={graphId}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: graphId,
                node: getId(resource),
                selectedProperty:
                  'encoding' in resource ? 'encoding' : 'distribution',
                selectedItem: getId(encoding)
              },
              `annotable-encoding-${getId(
                encoding
              )}-${graphId}` /* we need graphId as user can toggle versions */
            )}
            matchingLevel={matchingLevel}
            counter={counter}
            selectable={false}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
            info={getInfo({
              action,
              resource,
              encoding,
              canPerform,
              forceEnableUpdateMainEntityEncoding,
              mainEntityId,
              ioActions
            })}
          >
            <Encoding
              ioActions={ioActions}
              action={action}
              forceEnableUpdateMainEntityEncoding={
                forceEnableUpdateMainEntityEncoding
              }
              graphId={graphId}
              resource={resource}
              isFromMultiPartImage={isFromMultiPartImage}
              encoding={encoding}
              readOnly={readOnly}
              disabled={disabled}
            />
          </Annotable>
        )}

        <ProgressLogger
          action={action}
          ioActions={ioActions}
          resourceId={getId(resource)}
        />

        {!!(
          (uploadAction &&
            (uploadAction.actionStatus === 'PotentialActionStatus' ||
              uploadAction.actionStatus === 'ActiveActionStatus')) ||
          (webifyAction &&
            (webifyAction.actionStatus === 'PotentialActionStatus' ||
              webifyAction.actionStatus === 'ActiveActionStatus') &&
            !(
              uploadAction &&
              uploadAction.actionStatus === 'CanceledActionStatus'
            ))
        ) && (
          <ControlPanel>
            <PaperButton onClick={this.handleCancel}>Cancel</PaperButton>
          </ControlPanel>
        )}
      </li>
    );
  }
}

function makeSelector() {
  return createSelector(
    state => state.user,
    createGraphDataSelector(),
    createGraphAclSelector(),
    (state, props) => props.action,
    createActionMapSelector(),
    (state, props) => getId(props.resource),
    (user, graphData, acl, action, actionMap, resourceId) => {
      let ioActions;

      if (!action || action.actionStatus === 'CompletedActionStatus') {
        ioActions = [];
      } else {
        const actions = Object.values(actionMap);

        let uploadAction, webifyAction, updateAction;

        // keep latest upload action corresponding to the resourceId
        uploadAction = actions
          .filter(_action => {
            const encoding = unrole(_action.result, 'result');
            return (
              encoding &&
              _action['@type'] === 'UploadAction' &&
              getId(_action.instrumentOf) === getId(action) &&
              (getId(encoding) == resourceId ||
                getId(encoding.encodesCreativeWork) === resourceId)
            );
          })
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )[0];

        // grab related webify action
        if (uploadAction) {
          webifyAction = actions.find(_action => {
            return (
              WEBIFY_ACTION_TYPES.has(_action['@type']) &&
              getId(_action.instrumentOf) == getId(uploadAction)
            );
          });
        }

        // Show the UpdateAction:
        // Note that we wait that the webify action is completed before showing the UpdateAction
        // Note that we do _not_ show it for `TypesettingAction` as the
        // `UpdateAction` is applied later on the completion of the `TypesettingAction`
        if (
          action['@type'] !== 'TypesettingAction' &&
          webifyAction &&
          webifyAction.actionStatus === 'CompletedActionStatus'
        ) {
          updateAction = actions.find(_action => {
            return (
              _action['@type'] === 'UpdateAction' &&
              getId(_action.resultOf) === getId(webifyAction)
            );
          });
        }

        const stage = actionMap[getStageId(action)];
        const serviceActions = getStageActions(stage)
          .map(stageAction =>
            getInstance(stageAction, { actionMap, user, acl })
          )
          .filter(_action => {
            // restrict to service action targeting the `resourceId`
            const object = getObject(_action);

            return (
              getId(_action.serviceOutputOf) &&
              (getId(_action.instrumentOf) === getId(action) ||
                getId(_action) === getId(action)) &&
              (getId(object) == resourceId ||
                getId(object.encodesCreativeWork) === resourceId)
            );
          });

        ioActions = [uploadAction, webifyAction, updateAction]
          .concat(serviceActions)
          .filter(Boolean)
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
      }

      const canPerform = action
        ? acl.checkPermission(user, 'PerformActionPermission', {
            action
          })
        : undefined;

      return {
        canPerform,
        ioActions,
        mainEntityId:
          graphData && graphData.graph && getId(graphData.graph.mainEntity)
      };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

const AnnotableEncodingItem = connect(
  makeMapStateToProps,
  { cancelUpload }
)(_AnnotableEncodingItem);

function getInfo({
  action,
  resource, // hydrated so has the embedded encoding
  encoding,
  canPerform,
  forceEnableUpdateMainEntityEncoding,
  ioActions,
  mainEntityId
} = {}) {
  const types = [];

  const encodings = arrayify(resource && resource.encoding).concat(
    arrayify(resource && resource.distribution)
  );

  const isDocumentObject =
    encodings.length &&
    encodings.some(encoding => encoding['@type'] === 'DocumentObject');

  const hasDs3Upload =
    encodings.length &&
    encodings.some(encoding => encoding.fileFormat === ds3Mime);

  const hasPurchasedService = arrayify(ioActions).some(
    action =>
      getId(action.serviceOutputOf) &&
      action.actionStatus !== 'PotentialActionStatus'
  );

  let typesetterRevisionRequestComment;
  if (action['@type'] === 'TypesettingAction') {
    typesetterRevisionRequestComment = getTypesetterRevisionRequestComment(
      action
    );
  } else {
    const typesettingAction = ioActions.find(
      action => action['@type'] === 'TypesettingAction'
    );
    typesetterRevisionRequestComment = getTypesetterRevisionRequestComment(
      typesettingAction
    );
  }

  if (
    canPerform &&
    isDocumentObject &&
    (action['@type'] === 'TypesettingAction' ||
      action.releaseRequirement === 'ProductionReleaseRequirement') &&
    !hasDs3Upload &&
    !hasPurchasedService &&
    !typesetterRevisionRequestComment
  ) {
    types.push(
      arrayify(action.potentialService).length
        ? ERROR_NEED_PRODUCTION_CONTENT_OR_SERVICE
        : ERROR_NEED_PRODUCTION_CONTENT
    );
  }

  if (
    action['@type'] === 'CreateReleaseAction' &&
    canPerform &&
    arrayify(action.potentialService).length &&
    // there is a document uploaded but it's not DS3:
    isDocumentObject &&
    !hasDs3Upload &&
    // exclude purchased serviceAction already
    !hasPurchasedService
  ) {
    types.push(WARNING_SERVICE_AVAILABLE);
  }

  const hasFileContentUrl = encodings.some(encoding => {
    return (
      encoding && encoding.contentUrl && encoding.contentUrl.startsWith('file:')
    );
  });

  if (action['@type'] === 'CreateReleaseAction' && hasFileContentUrl) {
    types.push(ERROR_FILE_UPLOAD_NEEDED);
  } else if (
    action['@type'] === 'CreateReleaseAction' &&
    (action.actionStatus === 'ActiveActionStatus' ||
      action.actionStatus === 'StagedActionStatus') &&
    canPerform &&
    mainEntityId &&
    mainEntityId === getId(resource) &&
    !ioActions.some(ioAction => ioAction['@type'] === 'UploadAction')
  ) {
    types.push(WARNING_REVISION_UPLOAD_NEEDED);
  } else if (
    (action['@type'] === 'CreateReleaseAction' ||
      (action['@type'] === 'TypesettingAction' &&
        forceEnableUpdateMainEntityEncoding)) &&
    (action.actionStatus === 'ActiveActionStatus' ||
      action.actionStatus === 'StagedActionStatus') &&
    canPerform &&
    mainEntityId &&
    encoding &&
    encoding.contentUrl &&
    !isUrl(encoding.contentUrl) // don't re-upload hyperlinks
  ) {
    if (action['@type'] === 'TypesettingAction') {
      const latestTypesetterUploadAction = ioActions.find(
        action => action['@type'] === 'UploadAction'
      );
      const authorEncodingId = getObjectId(action);
      const typesetterUploadedEncoding = getResult(
        latestTypesetterUploadAction
      );
      if (
        authorEncodingId &&
        typesetterUploadedEncoding &&
        getId(typesetterUploadedEncoding.isBasedOn) !== authorEncodingId
      ) {
        types.push(
          ERROR_TYPESETTER_MUST_REVISE_FILE_BASED_ON_NEW_AUTHOR_CONTENT
        );
      } else {
        types.push(WARNING_CAN_REVISE_FILE);
      }
    } else if (action['@type'] === 'CreateReleaseAction') {
      // Technically the author can upload revision after he purchased a
      // TypesettingAction and that invalidates the work of the typesetter (the
      // typesetter must re-upload a typeset document based on the latest author
      // upload but we don't encourage it here
      if (
        !ioActions.some(
          action =>
            action['@type'] === 'TypesettingAction' &&
            action.actionStatus === 'ActiveActionStatus'
        )
      ) {
        types.push(WARNING_CAN_REVISE_FILE);
      }
    }
  }

  const typesetterNeedsAuthorUpload =
    action['@type'] === 'CreateReleaseAction' &&
    canPerform &&
    arrayify(ioActions).some(action => {
      return (
        action['@type'] === 'TypesettingAction' &&
        (action.actionStatus === 'ActiveActionStatus' ||
          action.actionStatus === 'StagedActionStatus') &&
        typesetterRevisionRequestComment
      );
    });

  if (typesetterNeedsAuthorUpload) {
    types.push(ERROR_TYPESETTER_NEED_AUTHOR_REVISION);
  }

  return types.length === 0 ? undefined : types.length === 1 ? types[0] : types;
}
