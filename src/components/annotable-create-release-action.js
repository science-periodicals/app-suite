import React from 'react';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import querystring from 'querystring';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import identity from 'lodash/identity';
import { withRouter } from 'react-router-dom';
import { getId, createValue, arrayify } from '@scipe/jsonld';
import {
  Dropzone,
  CSS_HEADER_HEIGHT,
  PaperButtonLink,
  Card
} from '@scipe/ui';
import {
  getObjectId,
  getResultId,
  getVersion,
  getFileInputAccept,
  getLocationIdentifier,
  getObject
} from '@scipe/librarian';
import { createActionMapSelector } from '../selectors/graph-selectors';
import { createMainEntity } from '../actions/graph-action-creators';
import Counter from '../utils/counter';
import FilesAttachment from './files-attachment';
import Notice, { NoAccessNotice } from './notice';
import { getWorkflowAction } from '../utils/workflow';
import { deepSetGraph, getSelectorGraphParam } from '../utils/annotations';
import AnnotableActionHead from './annotable-action-head';
import { StyleCardBody } from './annotable-action';
import AnnotableAuthorResponseList from './annotable-author-response-list';
import ActionAnnotationPreviewList from './action-annotation-preview-list';
import ReviewAttachment from './review-attachment';
import AssessmentAttachment from './assessment-attachment';
import ReceivedAttachmentContainer from './received-attachment-container';
import ReleaseNotesEditor from './release-notes-editor';
import { openShell } from '../actions/ui-action-creators';
import {
  PREVIOUS_FILES_COLOR,
  ERROR_NEED_PRODUCTION_CONTENT,
  ERROR_NEED_SUBMISSION_CONTENT
} from '../constants';
import Annotable from './annotable';

// NOTE there should _never_ be comments on CreateReleaseAction (as the content is not stable)
// NOTE object of a CreateReleaseAction is _always_ the live graphId

const FilesAttachmentWithRef = React.forwardRef(function(props, ref) {
  return <FilesAttachment {...props} forwardedRef={ref} />;
});

class AnnotableCreateReleaseAction extends React.Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    journalId: PropTypes.string.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    graph: PropTypes.object.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    acl: PropTypes.object.isRequired,
    displayedVersion: PropTypes.string,
    children: PropTypes.element,
    stage: PropTypes.object.isRequired,
    action: PropTypes.object.isRequired,
    endorseAction: PropTypes.object,
    serviceActions: PropTypes.arrayOf(PropTypes.object), // instantiated service action for CreateReleaseAction
    blockingActions: PropTypes.array,
    authorizeActions: PropTypes.array,
    completeImpliesSubmit: PropTypes.bool.isRequired,
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

    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    memoizeCreateSelector: PropTypes.func.isRequired,

    // react-router
    location: PropTypes.object.isRequired,

    // redux
    createMainEntity: PropTypes.func.isRequired,
    uploadActions: PropTypes.arrayOf(
      PropTypes.shape({
        '@type': PropTypes.oneOf(['UploadAction'])
      })
    ).isRequired,
    // in case of revision:
    assessAction: PropTypes.object,
    reviewActionAttachments: PropTypes.arrayOf(PropTypes.object),
    prevCreateReleaseAction: PropTypes.object,
    openShell: PropTypes.func
  };

  static defaultProps = {
    action: {}
  };

  constructor(props) {
    super(props);

    this.filesAttachmentRef = React.createRef();
    this.cache = {};
  }

  handleFile = files => {
    const { action, graphId, createMainEntity } = this.props;
    createMainEntity(files[0], getId(action), graphId);
  };

  handleSubmit = e => {
    const { action, graph, saveWorkflowAction } = this.props;
    const upd = {
      '@id': getId(action),
      result: Object.assign({}, action.result, {
        description:
          e.target.value === '<p></p>' ? '' : createValue(e.target.value) // TODO handle that better in rich textarea ?
      })
    };

    saveWorkflowAction(getId(graph), upd);
  };

  handleScroll = e => {
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
      graph,
      counter,
      action,
      readOnly,
      disabled,
      annotable,
      displayAnnotations,
      blindingData,
      assessAction,
      canComment,
      canView,
      canPerform,
      isBlocked,
      prevCreateReleaseAction,
      displayedVersion,
      saveWorkflowAction,
      reviewActionAttachments,
      openShell,
      location,
      locationOptions,
      memoizeCreateSelector,
      uploadActions,
      children
    } = this.props;

    const prevVersion =
      prevCreateReleaseAction &&
      getVersion(getResultId(prevCreateReleaseAction));

    const isViewingPreviousFiles =
      displayedVersion && prevVersion && prevVersion === displayedVersion;

    // TODO inline serviceType to be more precise and only take into account typesetting services
    const effectiveReleaseRequirement = arrayify(action.potentialService).length
      ? 'SubmissionReleaseRequirement'
      : action.releaseRequirement;

    return (
      <div className="annotable-create-release-action">
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
            ) : (
              <div className="reverse-z-index">
                {canPerform && getId(graph.mainEntity) && (
                  <div className="selectable-indent ">
                    <Notice>
                      <span className="annotable-create-release-action__notice-text">
                        Go to the files section to{' '}
                        {assessAction ? 'revise' : 'make changes to'} the
                        submission.
                      </span>
                      <PaperButtonLink
                        className="annotable-create-release-action__notice-scroll-button"
                        onClick={this.handleScroll}
                        to={{
                          pathname: location.pathname,
                          search: `?${querystring.stringify(
                            omit(
                              querystring.parse(location.search.substring(1)),
                              ['version']
                            )
                          )}`
                        }}
                      >
                        View
                      </PaperButtonLink>
                    </Notice>
                  </div>
                )}

                <ReleaseNotesEditor
                  graphId={graphId}
                  graph={graph}
                  counter={counter}
                  action={action}
                  isBlocked={isBlocked}
                  canComment={canComment}
                  canPerform={canPerform}
                  readOnly={readOnly}
                  disabled={disabled}
                  annotable={annotable}
                  locationOptions={locationOptions}
                  displayAnnotations={displayAnnotations}
                  saveWorkflowAction={saveWorkflowAction}
                  createSelector={memoizeCreateSelector(identity)}
                />

                {!!arrayify(assessAction && assessAction.comment).length && (
                  <section className="selectable-indent">
                    <h4 className="annotable-action__sub-title">Responses</h4>

                    <AnnotableAuthorResponseList
                      graphId={graphId}
                      selectable={false}
                      counter={counter}
                      annotable={annotable && canComment}
                      displayAnnotations={displayAnnotations}
                      createSelector={memoizeCreateSelector(identity)}
                      assessAction={assessAction}
                      createReleaseAction={action}
                      locationOptions={locationOptions}
                      readOnly={readOnly}
                      disabled={disabled || !canPerform || isBlocked}
                      reviewAttachmentLinkType="shell"
                      saveWorkflowAction={saveWorkflowAction}
                      openShell={openShell}
                    />
                  </section>
                )}

                {!!(
                  assessAction && arrayify(assessAction.annotation).length
                ) && (
                  <section className="selectable-indent">
                    <h4 className="annotable-action__sub-title">
                      In context responses
                    </h4>

                    {canPerform && (
                      <Notice iconName="feedbackWrite">
                        <span className="annotable-create-release-action__notice-text">
                          Go to the files section to answer to revision request
                          in context.
                        </span>
                        <PaperButtonLink
                          className="annotable-create-release-action__notice-scroll-button"
                          onClick={this.handleScroll}
                          to={{
                            pathname: location.pathname,
                            search: `?${querystring.stringify(
                              Object.assign(
                                querystring.parse(location.search.substring(1)),
                                {
                                  version: getVersion(getObjectId(assessAction))
                                }
                              )
                            )}`
                          }}
                        >
                          View
                        </PaperButtonLink>
                      </Notice>
                    )}

                    <ActionAnnotationPreviewList
                      user={user}
                      journalId={journalId}
                      search={
                        prevVersion
                          ? counter.search
                            ? `?${querystring.stringify(
                                Object.assign(
                                  querystring.parse(
                                    counter.search.substring(1)
                                  ),
                                  { version: prevVersion }
                                )
                              )}`
                            : `?version=${prevVersion}`
                          : counter.search
                      }
                      action={assessAction}
                      graphId={getId(graph)}
                      addAuthorResponses={true}
                      readOnly={readOnly}
                      disabled={disabled || !canPerform || isBlocked}
                      counter={counter}
                      reviewAttachmentLinkType="shell"
                      displayAnnotations={displayAnnotations}
                      createSelector={memoizeCreateSelector(identity)}
                    />
                  </section>
                )}
              </div>
            )}

            {/* Only display once to get the main entity, never displayed
                again. Note that we rely on the presence of an upload action to
                allow retries: we can successfuly create a main entity _but_ the
                upload action can then fail or be canceled => in this case we need
                to be able to retry */}
            {canView &&
              canPerform &&
              !prevCreateReleaseAction &&
              (!getId(graph.mainEntity) ||
                (!uploadActions.length ||
                  (uploadActions.length > 0 &&
                    uploadActions.every(
                      uploadAction =>
                        uploadAction.actionStatus === 'CanceledActionStatus' ||
                        uploadAction.actionStatus === 'FailedActionStatus'
                    )))) && (
                <div className="annotable-create-release-action__dropzone-section selectable-indent">
                  <Annotable
                    graphId={graphId}
                    selector={memoizeCreateSelector(
                      {
                        '@type': 'NodeSelector',
                        graph: getSelectorGraphParam(action),
                        node: getId(action),
                        selectedProperty: 'result'
                      },
                      `annotabe-create-release-action-${getId(action)}-result`
                    )}
                    counter={counter.increment({
                      value: getLocationIdentifier(action['@type'], 'result'),
                      level: 3,
                      key: `annotabe-create-release-action-${getId(
                        action
                      )}-result`
                    })}
                    selectable={false}
                    annotable={annotable && canComment}
                    displayAnnotations={displayAnnotations}
                    info={
                      effectiveReleaseRequirement ===
                      'ProductionReleaseRequirement'
                        ? ERROR_NEED_PRODUCTION_CONTENT
                        : ERROR_NEED_SUBMISSION_CONTENT
                    }
                  >
                    <div className="annotable-create-release-action__dropzone">
                      <Dropzone
                        accept={getFileInputAccept(
                          { '@type': 'DocumentObject' },
                          effectiveReleaseRequirement
                        )}
                        onFiles={this.handleFile}
                        multiple={false}
                        disabled={disabled || !canPerform || isBlocked}
                        readOnly={readOnly}
                      />
                    </div>
                  </Annotable>
                </div>
              )}

            {children}
          </StyleCardBody>
        </Card>

        {canView &&
          getId(graph.mainEntity) &&
          (!canPerform ||
            (canPerform &&
              (uploadActions.length > 0 || !!prevCreateReleaseAction))) && (
            <Card
              bevel={true}
              noticeColor={
                isViewingPreviousFiles ? PREVIOUS_FILES_COLOR : undefined
              }
            >
              <FilesAttachmentWithRef
                ref={this.filesAttachmentRef}
                user={user}
                acl={acl}
                journalId={journalId}
                search={counter.search}
                graphId={
                  action.actionStatus === 'CompletedActionStatus'
                    ? getResultId(action)
                    : getObjectId(action)
                }
                action={action}
                displayedVersion={displayedVersion}
                prevCreateReleaseAction={prevCreateReleaseAction}
                readOnly={readOnly}
                disabled={disabled || !canPerform || isBlocked}
                annotable={annotable && canComment}
                displayAnnotations={displayAnnotations}
                createSelector={memoizeCreateSelector(
                  isViewingPreviousFiles
                    ? selector => {
                        return {
                          '@type': 'NodeSelector',
                          node: getId(action),
                          graph: getSelectorGraphParam(action),
                          selectedProperty: 'instrument',
                          selectedItem: getId(assessAction),
                          hasSubSelector: {
                            '@type': 'NodeSelector',
                            node: getId(assessAction),
                            graph: getSelectorGraphParam(assessAction),
                            selectedProperty: 'object',
                            hasSubSelector: deepSetGraph(
                              selector,
                              getSelectorGraphParam(assessAction)
                            )
                          }
                        };
                      }
                    : selector => {
                        return {
                          '@type': 'NodeSelector',
                          node: getId(action),
                          graph: getSelectorGraphParam(action),
                          selectedProperty: 'result',
                          hasSubSelector: deepSetGraph(
                            selector,
                            getSelectorGraphParam(action)
                          )
                        };
                      },
                  `annotable-create-release-action-files-attachment-${displayedVersion ||
                    'current'}-${getId(action)}`
                )}
                matchingLevel={isViewingPreviousFiles ? 2 : 1}
                blindingData={blindingData}
              />
            </Card>
          )}

        {!!(
          canView &&
          (assessAction ||
            (reviewActionAttachments &&
              arrayify(reviewActionAttachments).length))
        ) && (
          <ReceivedAttachmentContainer>
            {assessAction ? (
              <Card>
                <AssessmentAttachment
                  user={user}
                  graph={graph}
                  journalId={journalId}
                  graphId={graphId}
                  search={counter.search}
                  action={assessAction}
                  createSelector={memoizeCreateSelector(selector => {
                    return {
                      '@type': 'NodeSelector',
                      graph: getSelectorGraphParam(action),
                      node: getId(action),
                      selectedProperty: 'instrument',
                      selectedItem: getId(assessAction),
                      hasSubSelector: selector
                    };
                  }, `annotable-create-release-action-assessment-attachment-${getId(action)}`)}
                  acl={acl}
                  readOnly={readOnly}
                  disabled={disabled}
                  annotable={annotable && canComment}
                  displayAnnotations={displayAnnotations}
                  reviewAttachmentLinkType="shell"
                  blindingData={blindingData}
                />
              </Card>
            ) : null}

            {reviewActionAttachments &&
            arrayify(reviewActionAttachments).length ? (
              <ul className="sa__clear-list-styles">
                {arrayify(reviewActionAttachments).map(reviewAction => (
                  <li key={getId(reviewAction)}>
                    <Card>
                      <ReviewAttachment
                        reviewActionId={getId(reviewAction)}
                        user={user}
                        journalId={journalId}
                        graphId={graphId}
                        graph={graph}
                        search={counter.search}
                        createSelector={memoizeCreateSelector(selector => {
                          return {
                            '@type': 'NodeSelector',
                            graph: getSelectorGraphParam(action),
                            node: getId(action),
                            selectedProperty: 'instrument',
                            selectedItem: getId(reviewAction),
                            hasSubSelector: selector
                          };
                        }, `annotable-create-release-action-review-attachment-${getId(reviewAction)}-${getId(action)}`)}
                        blindingData={blindingData}
                        acl={acl}
                        readOnly={readOnly}
                        disabled={disabled}
                        displayAnnotations={displayAnnotations}
                        annotable={annotable && canComment}
                      />
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}
          </ReceivedAttachmentContainer>
        )}
      </div>
    );
  }
}

export default withRouter(
  connect(
    createSelector(
      state => state.user,
      (state, props) => props.acl,
      (state, props) => getId(props.graph.mainEntity),
      (state, props) => getId(props.action),
      (state, props) => {
        const assessActionId = getId(
          arrayify(props.action && props.action.instrument)[0]
        );
        return assessActionId;
      },
      createActionMapSelector(),
      (user, acl, mainEntityId, actionId, assessActionId, actionMap = {}) => {
        let assessAction =
          assessActionId &&
          getWorkflowAction(assessActionId, {
            user,
            actionMap,
            acl
          });

        const uploadActions = Object.values(actionMap).filter(
          action =>
            action['@type'] === 'UploadAction' &&
            getId(action.instrumentOf) === actionId &&
            getId(getObject(action).encodesCreativeWork) === mainEntityId
        );

        let reviewActionAttachments, prevCreateReleaseAction;
        if (assessAction) {
          const attachments = arrayify(assessAction.instrument)
            .map(instrument =>
              getWorkflowAction(getId(instrument), {
                user,
                actionMap,
                acl
              })
            )
            .filter(Boolean);

          prevCreateReleaseAction = attachments.find(
            attachment =>
              attachment['@type'] === 'CreateReleaseAction' &&
              attachment.actionStatus === 'CompletedActionStatus'
          );

          reviewActionAttachments = attachments.filter(
            attachment =>
              attachment['@type'] === 'ReviewAction' &&
              attachment.actionStatus === 'CompletedActionStatus'
          );
        }

        return {
          assessAction,
          uploadActions,
          reviewActionAttachments,
          prevCreateReleaseAction
        };
      }
    ),
    {
      createMainEntity,
      openShell
    }
  )(AnnotableCreateReleaseAction)
);
