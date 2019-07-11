import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import querystring from 'querystring';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { createSelector } from 'reselect';
import identity from 'lodash/identity';
import { getId, arrayify } from '@scipe/jsonld';
import {
  createId,
  getObjectId,
  getResultId,
  getVersion
} from '@scipe/librarian';
import {
  PaperButtonLink,
  Card,
  CSS_HEADER_HEIGHT,
  PaperActionButton
} from '@scipe/ui';
import Counter from '../utils/counter';
import ReviewEditor from './review-editor';
import FilesAttachment from './files-attachment';
import AnnotableActionHead from './annotable-action-head';
import Notice, { NoAccessNotice, CanceledNotice } from './notice';
import { StyleCardBody } from './annotable-action';
import ActionAnnotationPreviewList from './action-annotation-preview-list';
import { createActionMapSelector } from '../selectors/graph-selectors';
import AnnotableReviewerCommentList from './annotable-reviewer-comment-list';
import ReceivedAttachmentContainer from './received-attachment-container';
import AuthorNotesAttachment from './author-notes-attachment';
import AssessmentAttachment from './assessment-attachment';
import { PREVIOUS_FILES_COLOR } from '../constants';
import { getSelectorGraphParam } from '../utils/annotations';
import { getWorkflowAction } from '../utils/workflow';

const FilesAttachmentWithRef = React.forwardRef(function(props, ref) {
  return <FilesAttachment {...props} forwardedRef={ref} />;
});

class AnnotableReviewAction extends React.Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    graphId: PropTypes.string,
    journalId: PropTypes.string.isRequired,
    graph: PropTypes.object,
    acl: PropTypes.object.isRequired,
    saveWorkflowAction: PropTypes.func.isRequired,
    displayedVersion: PropTypes.string,
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
    canCancel: PropTypes.bool,
    canPerform: PropTypes.bool.isRequired,
    canEndorse: PropTypes.bool.isRequired,
    children: PropTypes.element,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,

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

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,

    // react-router
    location: PropTypes.object.isRequired,

    // redux
    createReleaseAction: PropTypes.object,
    prevCreateReleaseAction: PropTypes.object,
    assessAction: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.filesAttachmentRef = React.createRef();
  }

  handleScroll = e => {
    if (this.filesAttachmentRef.current) {
      const rect = this.filesAttachmentRef.current.getBoundingClientRect();
      window.scroll({
        top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT,
        behavior: 'smooth'
      });
    }
  };

  handleAddGeneralReviewerComment = e => {
    const { action, graphId, saveWorkflowAction } = this.props;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).concat({
        '@id': createId('cnode', null, getId(action))['@id'],
        '@type': 'ReviewerComment'
      })
    });
  };

  render() {
    const {
      user,
      acl,
      journalId,
      graphId,
      action,
      graph,
      canView,
      readOnly,
      disabled,
      canPerform,
      canComment,
      isBlocked,
      counter,
      annotable,
      displayAnnotations,
      blindingData,
      saveWorkflowAction,
      assessAction,
      createReleaseAction,
      prevCreateReleaseAction,
      location,
      displayedVersion,
      children,
      locationOptions,
      memoizeCreateSelector
    } = this.props;

    const prevVersion =
      prevCreateReleaseAction &&
      getVersion(getResultId(prevCreateReleaseAction));

    const isViewingPreviousFiles =
      displayedVersion && prevVersion && prevVersion === displayedVersion;

    const isCanceled = action.actionStatus === 'CanceledActionStatus';

    const displayFilesAttachment = !!(
      canView &&
      !isCanceled &&
      createReleaseAction &&
      createReleaseAction.actionStatus === 'CompletedActionStatus' &&
      getId(graph.mainEntity)
    );

    return (
      <div className="annotable-review-action">
        <Card
          className="annotable-action__head-card"
          active={action.actionStatus !== 'CanceledActionStatus'}
          data-testid="annotable-action-body"
        >
          <StyleCardBody>
            <AnnotableActionHead {...this.props} counter={counter} />

            {isCanceled ? (
              <div className="selectable-indent">
                <CanceledNotice data-testid="canceled-notice" />
              </div>
            ) : !canView ? (
              <div className="selectable-indent">
                <NoAccessNotice data-testid="no-access-notice" />
              </div>
            ) : (
              <Fragment>
                <ReviewEditor
                  counter={counter}
                  graphId={getId(graph)}
                  action={action}
                  locationOptions={locationOptions}
                  saveWorkflowAction={saveWorkflowAction}
                  readOnly={readOnly}
                  disabled={disabled || !canPerform || isBlocked}
                  createSelector={memoizeCreateSelector(identity)}
                  annotable={annotable && canComment}
                  displayAnnotations={displayAnnotations}
                />

                {displayFilesAttachment && (
                  <div className="selectable-indent">
                    {!!(canPerform || arrayify(action.comment).length) && (
                      <section>
                        <h4 className="annotable-action__sub-title">
                          General Review Notes
                        </h4>

                        <AnnotableReviewerCommentList
                          graphId={graphId}
                          counter={counter}
                          createSelector={memoizeCreateSelector(identity)}
                          action={action}
                          locationOptions={locationOptions}
                          readOnly={readOnly}
                          disabled={disabled || !canPerform || isBlocked}
                          annotable={annotable && canComment}
                          displayAnnotations={displayAnnotations}
                        />

                        {!readOnly && (
                          <div className="annotable-review-action__add-general-comment">
                            <PaperActionButton
                              iconName="add"
                              disabled={disabled || !canPerform || isBlocked}
                              large={false}
                              onClick={this.handleAddGeneralReviewerComment}
                            />
                          </div>
                        )}
                      </section>
                    )}

                    {!!(canPerform || arrayify(action.annotation).length) && (
                      <section>
                        <h4 className="annotable-action__sub-title">
                          Contextual Review Notes
                        </h4>

                        {canPerform && (
                          <Notice iconName="attachment">
                            <span className="annotable-create-review__notice-text">
                              Go to the files section to add contextual notes
                              (review annotations)
                            </span>
                            <PaperButtonLink
                              className="annotable-review-action__notice-scroll-button"
                              onClick={this.handleScroll}
                              to={{
                                pathname: location.pathname,
                                search: `?${querystring.stringify(
                                  omit(
                                    querystring.parse(
                                      location.search.substring(1)
                                    ),
                                    ['version']
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
                          search={counter.search}
                          action={action}
                          graphId={getId(graph)}
                          readOnly={readOnly}
                          disabled={disabled || !canPerform || isBlocked}
                          commentType="ReviewerComment"
                          counter={counter}
                          displayAnnotations={displayAnnotations}
                          createSelector={memoizeCreateSelector(identity)}
                        />
                      </section>
                    )}
                  </div>
                )}
              </Fragment>
            )}

            {children}
          </StyleCardBody>
        </Card>

        {displayFilesAttachment && (
          <Card
            bevel={true}
            className="annotable-action__card"
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
              graphId={getObjectId(action)}
              action={createReleaseAction}
              displayedVersion={displayedVersion}
              prevCreateReleaseAction={prevCreateReleaseAction}
              readOnly={true}
              disabled={true}
              annotable={
                annotable &&
                !isViewingPreviousFiles &&
                (canComment || canPerform)
              }
              displayAnnotations={displayAnnotations}
              createSelector={memoizeCreateSelector(
                isViewingPreviousFiles
                  ? selector => {
                      return {
                        '@type': 'NodeSelector',
                        node: getId(action),
                        graph: getSelectorGraphParam(action),
                        selectedProperty: 'instrument',
                        selectedItem: getId(createReleaseAction),
                        hasSubSelector: {
                          '@type': 'NodeSelector',
                          node: getId(createReleaseAction),
                          graph: getResultId(createReleaseAction),
                          selectedProperty: 'instrument',
                          selectedItem: getId(assessAction),
                          hasSubSelector: {
                            '@type': 'NodeSelector',
                            node: getId(assessAction),
                            graph: getObjectId(assessAction),
                            selectedProperty: 'object',
                            hasSubSelector: selector
                          }
                        }
                      };
                    }
                  : selector => {
                      return {
                        '@type': 'NodeSelector',
                        node: getId(action),
                        graph: getObjectId(action),
                        selectedProperty: 'object',
                        hasSubSelector: selector
                      };
                    },
                `annotable-review-action-files-attachment-${displayedVersion ||
                  'current'}-${getId(action)}`
              )}
              matchingLevel={isViewingPreviousFiles ? 3 : 1}
              blindingData={blindingData}
            />
          </Card>
        )}

        {!!(
          canView &&
          ((createReleaseAction &&
            createReleaseAction.actionStatus === 'CompletedActionStatus') ||
            (assessAction &&
              assessAction.actionStatus === 'CompletedActionStatus')) &&
          !isCanceled
        ) && (
          <ReceivedAttachmentContainer>
            {!!assessAction &&
              assessAction.actionStatus === 'CompletedActionStatus' && (
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
                    }, `annotable-review-action-assessment-attachment-${getId(action)}`)}
                    acl={acl}
                    readOnly={readOnly}
                    disabled={disabled}
                    annotable={annotable && canComment}
                    displayAnnotations={displayAnnotations}
                    reviewAttachmentLinkType="transition"
                    blindingData={blindingData}
                  />
                </Card>
              )}

            {!!createReleaseAction &&
              createReleaseAction.actionStatus === 'CompletedActionStatus' && (
                <Card>
                  <AuthorNotesAttachment
                    user={user}
                    journalId={journalId}
                    graph={graph}
                    search={counter.search}
                    graphId={graphId}
                    createReleaseActionId={getId(createReleaseAction)}
                    acl={acl}
                    canComment={canComment}
                    readOnly={readOnly}
                    disabled={disabled}
                    createSelector={memoizeCreateSelector(selector => {
                      return {
                        '@type': 'NodeSelector',
                        node: getId(action),
                        graph: getSelectorGraphParam(action),
                        selectedProperty: 'instrument',
                        selectedItem: getId(createReleaseAction),
                        hasSubSelector: selector
                      };
                    }, `annotable-review-action-author-notes-attachment-${getId(action)}`)}
                    annotable={annotable && canComment}
                    displayAnnotations={displayAnnotations}
                    reviewAttachmentLinkType="transition"
                    blindingData={blindingData}
                  />
                </Card>
              )}
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
      (state, props) => props.action,
      createActionMapSelector(),
      (user, acl, reviewAction, actionMap) => {
        // Received attachments:
        // get the author notes (CretaeReleaseAction) and the decision (AssessAction) (if it was a revision)
        let createReleaseAction, assessAction, prevCreateReleaseAction;

        arrayify(reviewAction.instrument).forEach(instrument => {
          instrument = getWorkflowAction(getId(instrument), {
            actionMap,
            user,
            acl
          });
          if (instrument) {
            if (instrument['@type'] === 'CreateReleaseAction') {
              createReleaseAction = instrument;
            } else if (instrument['@type'] === 'AssessAction') {
              assessAction = instrument;
            }
          }
        });

        // find the `prevCreateReleaseAction` (if any)
        if (createReleaseAction && getId(createReleaseAction.instrument)) {
          const prevAssessAction = getWorkflowAction(
            getId(createReleaseAction.instrument),
            {
              actionMap,
              user,
              acl
            }
          );

          if (prevAssessAction && prevAssessAction.instrument) {
            prevCreateReleaseAction = arrayify(prevAssessAction.instrument)
              .map(instrument =>
                getWorkflowAction(getId(instrument), {
                  actionMap,
                  user,
                  acl
                })
              )
              .find(
                instrument =>
                  instrument && instrument['@type'] === 'CreateReleaseAction'
              );
          }
        }

        return {
          createReleaseAction,
          prevCreateReleaseAction,
          assessAction
        };
      }
    )
  )(AnnotableReviewAction)
);
