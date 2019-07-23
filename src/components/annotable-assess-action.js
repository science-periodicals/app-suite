import React, { Fragment } from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import querystring from 'querystring';
import identity from 'lodash/identity';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { createSelector } from 'reselect';
import {
  getObjectId,
  getResultId,
  getVersion,
  createId
} from '@scipe/librarian';
import { arrayify, getId } from '@scipe/jsonld';
import {
  PaperActionButton,
  Card,
  PaperButtonLink,
  CSS_HEADER_HEIGHT
} from '@scipe/ui';
import Counter from '../utils/counter';
import FilesAttachment from './files-attachment';
import Notice, { NoAccessNotice } from './notice';
import AnnotableActionHead from './annotable-action-head';
import { StyleCardBody } from './annotable-action';
import ActionAnnotationPreviewList from './action-annotation-preview-list';
import {
  createActionMapSelector,
  createCommentMapSelector
} from '../selectors/graph-selectors';
import AnnotableRevisionRequestCommentList from './annotable-revision-request-comment-list';
import AssessmentEditor from './assessment-editor';
import { getWorkflowAction } from '../utils/workflow';
import ReceivedAttachmentContainer from './received-attachment-container';
import AuthorNotesAttachment from './author-notes-attachment';
import ReviewAttachment from './review-attachment';
import { PREVIOUS_FILES_COLOR } from '../constants';
import { getSelectorGraphParam } from '../utils/annotations';

const FilesAttachmentWithRef = React.forwardRef(function(props, ref) {
  return <FilesAttachment {...props} forwardedRef={ref} />;
});

// TODO `DeclareAction` & `PayAction` attachment (following the instrument trail)

class AnnotableAssessAction extends React.Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graph: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    potentialAttachments: PropTypes.arrayOf(PropTypes.object),
    saveWorkflowAction: PropTypes.func.isRequired,
    displayedVersion: PropTypes.string,
    counter: PropTypes.instanceOf(Counter).isRequired,
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

    acl: PropTypes.object.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,

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
    createReleaseAction: PropTypes.object,
    reviewActions: PropTypes.arrayOf(PropTypes.object),
    prevAssessAction: PropTypes.object,
    prevCreateReleaseAction: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.filesAttachmentRef = React.createRef();
  }

  handleScroll = e => {
    if (this.filesAttachmentRef.current) {
      const el =
        findDOMNode(this.filesAttachmentRef.current) || // Note: this should not be needed but React.forwardRef doesn't seem to work here ??
        this.filesAttachmentRef.current;
      const rect = el.getBoundingClientRect();
      window.scroll({
        top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT,
        behavior: 'smooth'
      });
    }
  };

  handleAddGeneralRevisionRequest = e => {
    const { action, graphId, saveWorkflowAction } = this.props;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).concat({
        '@id': createId('cnode', null, getId(action))['@id'],
        '@type': 'RevisionRequestComment'
      })
    });
  };

  render() {
    const {
      user,
      acl,
      journalId,
      displayedVersion,
      action,
      graph,
      graphId,
      readOnly,
      disabled,
      annotable,
      displayAnnotations,
      counter,
      blindingData,
      canView,
      canComment,
      canPerform,
      isBlocked,
      saveWorkflowAction,
      createReleaseAction,
      prevAssessAction,
      prevCreateReleaseAction,
      reviewActions,
      locationOptions,
      location,
      children,
      memoizeCreateSelector
    } = this.props;

    const prevVersion =
      prevCreateReleaseAction &&
      getVersion(getResultId(prevCreateReleaseAction));

    const isViewingPreviousFiles =
      displayedVersion && prevVersion && prevVersion === displayedVersion;

    const generalRevisionRequestComments = arrayify(action.comment);

    const displayFilesAttachment = !!(
      canView &&
      createReleaseAction &&
      createReleaseAction.actionStatus === 'CompletedActionStatus' &&
      getId(graph.mainEntity)
    );

    return (
      <div className="annotable-assess-action">
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
              <Fragment>
                <AssessmentEditor
                  journalId={journalId}
                  graph={graph}
                  graphId={graphId}
                  saveWorkflowAction={saveWorkflowAction}
                  counter={counter}
                  action={action}
                  isBlocked={isBlocked}
                  canComment={canComment}
                  canPerform={canPerform}
                  readOnly={readOnly}
                  disabled={disabled}
                  createSelector={memoizeCreateSelector(identity)}
                  annotable={annotable}
                  locationOptions={locationOptions}
                  displayAnnotations={displayAnnotations}
                  blindingData={blindingData}
                />

                {/* Revision Requests */}
                {displayFilesAttachment && (
                  <section>
                    <div className="selectable-indent">
                      {!!(
                        canPerform || generalRevisionRequestComments.length
                      ) && (
                        <section>
                          <h4 className="annotable-action__sub-title">
                            General revision requests
                          </h4>

                          <AnnotableRevisionRequestCommentList
                            graphId={graphId}
                            counter={counter}
                            createSelector={memoizeCreateSelector(identity)}
                            action={action}
                            readOnly={readOnly}
                            disabled={disabled || !canPerform || isBlocked}
                            locationOptions={locationOptions}
                            annotable={annotable && canComment}
                            displayAnnotations={displayAnnotations}
                            reviewAttachmentLinkType="shell"
                          />

                          {!readOnly && (
                            <div className="annotable-assess-action__add-revision-request">
                              <PaperActionButton
                                iconName="add"
                                disabled={disabled || !canPerform || isBlocked}
                                large={false}
                                onClick={this.handleAddGeneralRevisionRequest}
                              />
                            </div>
                          )}
                        </section>
                      )}

                      {!!(canPerform || arrayify(action.annotation).length) && (
                        <section>
                          <h4 className="annotable-action__sub-title">
                            In context revision requests
                          </h4>

                          {canPerform && (
                            <Notice iconName="feedbackWrite">
                              <span className="annotable-create-release-action__notice-text">
                                Go to the files section to add revision request
                                as annotations
                              </span>
                              <PaperButtonLink
                                className="annotable-create-release-action__notice-scroll-button"
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
                            counter={counter}
                            displayAnnotations={displayAnnotations}
                            reviewAttachmentLinkType="shell"
                            createSelector={memoizeCreateSelector(identity)}
                          />
                        </section>
                      )}
                    </div>
                  </section>
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
              graphId={getObjectId(action)}
              search={counter.search}
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
                        graph: getSelectorGraphParam(action),
                        node: getId(action),
                        selectedProperty: 'instrument',
                        selectedItem: getId(createReleaseAction),
                        hasSubSelector: {
                          '@type': 'NodeSelector',
                          graph: getSelectorGraphParam(createReleaseAction),
                          node: getId(createReleaseAction),
                          selectedProperty: 'instrument',
                          selectedItem: getId(prevAssessAction),
                          hasSubSelector: {
                            '@type': 'NodeSelector',
                            node: getId(prevAssessAction),
                            graph: getSelectorGraphParam(prevAssessAction),
                            selectedProperty: 'object',
                            hasSubSelector: selector
                          }
                        }
                      };
                    }
                  : selector => {
                      return {
                        '@type': 'NodeSelector',
                        graph: getSelectorGraphParam(action),
                        node: getId(action),
                        selectedProperty: 'object',
                        hasSubSelector: selector
                      };
                    },
                `annotable-assess-action-files-attachment-${displayedVersion ||
                  'current'}-${getId(action)}`
              )}
              matchingLevel={isViewingPreviousFiles ? 3 : 1}
              blindingData={blindingData}
            />
          </Card>
        )}

        {!!(
          canView &&
          (createReleaseAction ||
            (reviewActions && arrayify(reviewActions).length))
        ) && (
          <ReceivedAttachmentContainer>
            {!!createReleaseAction && (
              <Card>
                <AuthorNotesAttachment
                  user={user}
                  journalId={journalId}
                  graph={graph}
                  search={counter.search}
                  graphId={graphId}
                  createReleaseActionId={getId(createReleaseAction)}
                  acl={acl}
                  readOnly={readOnly}
                  disabled={disabled}
                  canComment={canComment}
                  createSelector={memoizeCreateSelector(selector => {
                    return {
                      '@type': 'NodeSelector',
                      node: getId(action),
                      graph: getSelectorGraphParam(action),
                      selectedProperty: 'instrument',
                      selectedItem: getId(createReleaseAction),
                      hasSubSelector: selector
                    };
                  }, `annotable-assess-action-author-notes-attachment-${getId(action)}`)}
                  annotable={annotable && canComment}
                  displayAnnotations={displayAnnotations}
                  reviewAttachmentLinkType="shell"
                  blindingData={blindingData}
                />
              </Card>
            )}

            {!!(reviewActions && arrayify(reviewActions).length) && (
              <ul className="sa__clear-list-styles">
                {arrayify(reviewActions).map(reviewAction => (
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
                        }, `annotable-assess-action-review-attachment-${getId(action)}-${reviewAction}`)}
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
      createCommentMapSelector(),
      (user, acl, assessAction, actionMap, commentMap) => {
        let reviewActions,
          createReleaseAction,
          prevAssessAction,
          prevCreateReleaseAction;

        const attachments = arrayify(assessAction.instrument)
          .map(instrument =>
            getWorkflowAction(getId(instrument), {
              user,
              actionMap,
              acl
            })
          )
          .filter(Boolean);

        reviewActions = attachments.filter(
          attachment =>
            attachment['@type'] === 'ReviewAction' &&
            attachment.actionStatus === 'CompletedActionStatus'
        );

        createReleaseAction = attachments.find(
          attachment =>
            attachment['@type'] === 'CreateReleaseAction' &&
            attachment.actionStatus === 'CompletedActionStatus'
        );

        // find the `prevCreateReleaseAction` (if any)
        if (createReleaseAction && getId(createReleaseAction.instrument)) {
          prevAssessAction = getWorkflowAction(
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
          reviewActions,
          createReleaseAction,
          prevAssessAction,
          prevCreateReleaseAction
        };
      }
    )
  )(AnnotableAssessAction)
);
