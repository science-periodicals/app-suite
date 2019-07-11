import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, unrole } from '@scipe/jsonld';
import ds3Mime from '@scipe/ds3-mime';
import {
  getObject,
  getResult,
  getLocationIdentifier
} from '@scipe/librarian';
import {
  Dropzone,
  CSS_HEADER_HEIGHT,
  Card,
  PaperButton,
  DateFromNow
} from '@scipe/ui';
import { reviseResource } from '../actions/graph-action-creators';
import {
  createActionMapSelector,
  createGraphAclSelector
} from '../selectors/graph-selectors';
import FilesAttachment from './files-attachment';
import Counter from '../utils/counter';
import AnnotableActionHead from './annotable-action-head';
import { StyleCardBody } from './annotable-action';
import Notice, { NoAccessNotice } from './notice';
import EncodingAttachment from './encoding-attachment';
import { ERROR_NEED_PRODUCTION_CONTENT } from '../constants';
import Annotable from './annotable';
import ReceivedAttachmentContainer from './received-attachment-container';
import {
  getOverwriteNodeMap,
  getTypesetterRevisionRequestComment
} from '../utils/workflow';
import { getSelectorGraphParam, deepSetGraph } from '../utils/annotations';

const FilesAttachmentWithRef = React.forwardRef(function(props, ref) {
  return <FilesAttachment {...props} forwardedRef={ref} />;
});

class AnnotableTypesettingAction extends React.Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    journalId: PropTypes.string.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    graph: PropTypes.object.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    acl: PropTypes.object.isRequired,
    children: PropTypes.element,
    stage: PropTypes.object.isRequired,
    action: PropTypes.object.isRequired, // TypesettingAction
    endorseAction: PropTypes.object,
    serviceActions: PropTypes.arrayOf(PropTypes.object), // instantiated service action for CreateReleaseAction
    blockingActions: PropTypes.array,
    authorizeActions: PropTypes.array,
    isBlocked: PropTypes.bool.isRequired,
    isReadyToBeSubmitted: PropTypes.bool.isRequired,
    canView: PropTypes.bool.isRequired,
    canAssign: PropTypes.bool.isRequired,
    canComment: PropTypes.bool.isRequired,
    canReschedule: PropTypes.bool.isRequired,
    canPerform: PropTypes.bool.isRequired,
    canEndorse: PropTypes.bool.isRequired,

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,
    saveWorkflowAction: PropTypes.func.isRequired,
    memoizeCreateSelector: PropTypes.func.isRequired,

    // redux
    reviseResource: PropTypes.func.isRequired,
    typesetterUploadMatchesLatestAuthorUpload: PropTypes.bool,
    nodeMap: PropTypes.object
  };

  static defaultProps = {
    action: {}
  };

  constructor(props) {
    super(props);

    this.filesAttachmentRef = React.createRef();
  }

  handleFile = files => {
    const { reviseResource, action, graphId } = this.props;
    const encoding = getObject(action);
    if (encoding) {
      reviseResource(
        files[0],
        action,
        graphId,
        getId(encoding.encodesCreativeWork),
        { fileFormat: ds3Mime }
      );
    }
  };

  handleScroll = e => {
    e.preventDefault();

    if (this.filesAttachmentRef.current) {
      const rect = this.filesAttachmentRef.current.getBoundingClientRect();
      window.scroll({
        top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT,
        behavior: 'smooth'
      });
    }
  };

  render() {
    const {
      user,
      acl,
      journalId,
      graphId,
      counter,
      action,
      readOnly,
      disabled,
      annotable,
      blindingData,
      canComment,
      canView,
      canPerform,
      isBlocked,
      nodeMap,
      displayAnnotations,
      saveWorkflowAction,
      memoizeCreateSelector,
      children,
      typesetterUploadMatchesLatestAuthorUpload
    } = this.props;

    const typesetterRevisionRequestComment = getTypesetterRevisionRequestComment(
      action
    );

    return (
      <div className="annotable-typesetting-action">
        <Card
          className="annotable-action__head-card"
          data-testid="annotable-action-body"
        >
          <StyleCardBody>
            <AnnotableActionHead {...this.props} counter={counter} />

            {!canView ? (
              <div className="selectable-indent">
                <NoAccessNotice data-testid="no-access-notice" />
              </div>
            ) : nodeMap &&
              !typesetterRevisionRequestComment &&
              typesetterUploadMatchesLatestAuthorUpload ? (
              <section className="selectable-indent reverse-z-index">
                <Notice>
                  <span className="annotable-typesetting-action__notice-text">
                    {`Scroll down to preview${
                      canPerform && action.actionStatus === 'ActiveActionStatus'
                        ? ' or update'
                        : ''
                    } the typeset document.`}
                  </span>
                  <PaperButton
                    className="annotable-typesetting-action__notice-scroll-button"
                    onClick={this.handleScroll}
                  >
                    View
                  </PaperButton>
                </Notice>
              </section>
            ) : null}

            {canView && canPerform && (
              <div className="annotable-typesetting-action__dropzone-section selectable-indent">
                {typesetterRevisionRequestComment ? (
                  <Notice iconName="time">
                    <span>
                      Revision requested{' '}
                      <DateFromNow>
                        {typesetterRevisionRequestComment.dateCreated}
                      </DateFromNow>
                      . Waiting for author upload.
                    </span>
                  </Notice>
                ) : !nodeMap || !typesetterUploadMatchesLatestAuthorUpload ? (
                  <Annotable
                    graphId={graphId}
                    selector={memoizeCreateSelector(
                      {
                        '@type': 'NodeSelector',
                        graph: getSelectorGraphParam(action),
                        node: getId(action),
                        selectedProperty: 'result'
                      },
                      `annotable-typesetting-action-${getId(action)}-result`
                    )}
                    counter={counter.increment({
                      value: getLocationIdentifier(action['@type'], 'result'),
                      level: 3,
                      key: `annotabe-typesetting-action-${getId(action)}-result`
                    })}
                    selectable={false}
                    annotable={annotable && canComment}
                    displayAnnotations={displayAnnotations}
                    info={ERROR_NEED_PRODUCTION_CONTENT}
                  >
                    <div className="annotable-typesetting-action__dropzone">
                      <Dropzone
                        onFiles={this.handleFile}
                        multiple={false}
                        accept={ds3Mime}
                        disabled={
                          disabled ||
                          !canPerform ||
                          isBlocked ||
                          !!typesetterRevisionRequestComment
                        }
                        readOnly={readOnly}
                        placeholder="Drop typeset file or click to select the file to upload"
                      />
                    </div>
                  </Annotable>
                ) : null}
              </div>
            )}
            {children}
          </StyleCardBody>
        </Card>

        {/* Only show the typeset document if the user can view the TypesettingAction */}
        {/* Note: the FilesAttachment is _always_ readOnly and disabled so that the
            typesetter can only make changes through uploading a new DS3 file
            => we want the DS3 file to contain _everything_
            In particular the dropzone for the parts are never active
          */}
        {!!nodeMap &&
          canView &&
          !typesetterRevisionRequestComment &&
          !!typesetterUploadMatchesLatestAuthorUpload && (
            <Card bevel={true}>
              <FilesAttachmentWithRef
                ref={this.filesAttachmentRef}
                user={user}
                acl={acl}
                journalId={journalId}
                search={counter.search}
                graphId={graphId}
                action={action}
                nodeMap={nodeMap}
                forceEnableUpdateMainEntityEncoding={
                  !disabled &&
                  canPerform &&
                  !typesetterRevisionRequestComment &&
                  (action.actionStatus === 'ActiveActionStatus' ||
                    action.actionStatus === 'StagedActionStatus')
                }
                readOnly={true}
                disabled={true}
                annotable={annotable && canComment}
                displayAnnotations={displayAnnotations}
                createSelector={memoizeCreateSelector(selector => {
                  return {
                    '@type': 'NodeSelector',
                    node: getId(action),
                    graph: getSelectorGraphParam(action),
                    selectedProperty: 'object',
                    hasSubSelector: deepSetGraph(
                      selector,
                      getSelectorGraphParam(action)
                    )
                  };
                }, `annotabe-typesetting-action-${getId(action)}-object`)}
                blindingData={blindingData}
              />
            </Card>
          )}

        {/* Only show the document to typeset if the user can view the TypesettingAction */}
        {canView && (
          <ReceivedAttachmentContainer>
            <Card bevel={true}>
              <EncodingAttachment
                id={
                  'document-to-typeset' /* Needed for the Resource left panel (scroll to behavior) */
                }
                disabled={disabled}
                readOnly={readOnly}
                canPerform={canPerform}
                graphId={graphId}
                action={action}
                encoding={action.object}
                saveWorkflowAction={saveWorkflowAction}
              />
            </Card>
          </ReceivedAttachmentContainer>
        )}
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    (state, props) => props.action,
    createGraphAclSelector(),
    createActionMapSelector(),
    (user, action, acl, actionMap) => {
      const nodeMap = getOverwriteNodeMap(action, { user, actionMap, acl });

      const authorEncoding = getObject(action);

      const latestTypesetterUploadAction = Object.values(actionMap)
        .filter(_action => {
          const encoding = unrole(_action.result, 'result');
          return (
            encoding &&
            _action['@type'] === 'UploadAction' &&
            getId(_action.instrumentOf) === getId(action) &&
            getId(encoding.encodesCreativeWork) ===
              getId(authorEncoding.encodesCreativeWork)
          );
        })
        .sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )[0];

      const typesetterEncoding = getResult(latestTypesetterUploadAction);

      let typesetterUploadMatchesLatestAuthorUpload;
      if (typesetterEncoding && authorEncoding) {
        typesetterUploadMatchesLatestAuthorUpload =
          getId(typesetterEncoding.isBasedOn) === getId(authorEncoding);
      }

      return { nodeMap, typesetterUploadMatchesLatestAuthorUpload };
    }
  ),
  {
    reviseResource
  }
)(AnnotableTypesettingAction);
