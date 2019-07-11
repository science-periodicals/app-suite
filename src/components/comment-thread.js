import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { createSelector } from 'reselect';
import { arrayify, getId } from '@scipe/jsonld';
import { Divider } from '@scipe/ui';
import {
  getObjectId,
  getStageId,
  getStageActions,
  getVersion
} from '@scipe/librarian';
import { getWorkflowAction } from '../utils/workflow';
import {
  createGraphDataSelector,
  createGraphAclSelector,
  createCommentMapSelector,
  createActionMapSelector,
  annotationLocationAutocompleteDataSelector
} from '../selectors/graph-selectors';
import { createReadOnlyUserSelector } from '../selectors/user-selectors';
import {
  deleteAnnotation,
  unfocusAnnotation,
  setAnnotationType
} from '../actions/annotation-action-creators';
import {
  createCommentAction,
  updateCommentAction,
  activateCommentAction,
  deleteCommentAction,
  createActionAnnotation,
  updateActionAnnotation,
  deleteActionAnnotation
} from '../actions/comment-action-creators';
import Comment from './comment';
import CreateComment from './create-comment';
import {
  isSelectorEqual,
  unwrapSelector,
  isFilesAttachmentSelector,
  getSelectorGraphParam,
  getRelativeLocationLink,
  prettifyLocation,
  getAnnotationObject,
  getCommentActionOnAnnotationSelector
} from '../utils/annotations';
import Counter from '../utils/counter';
import { COMMENT, ENDORSER_COMMENT } from '../constants';
import AnnotationHeader from './annotation-header';
import ShellLink from './shell/shell-link';

class CommentThread extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired, // needed for selector

    counter: PropTypes.instanceOf(Counter),

    matchingLevel: PropTypes.number,
    annotation: PropTypes.object.isRequired,
    onResize: PropTypes.func,

    //redux
    isOffline: PropTypes.bool,
    user: PropTypes.object.isRequired,
    graph: PropTypes.object,
    readOnlyUser: PropTypes.bool.isRequired,
    canRespond: PropTypes.bool.isRequired,
    canEndorse: PropTypes.bool.isRequired,

    acl: PropTypes.object.isRequired,
    roleNameData: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,
    action: PropTypes.object, // the host action (displayed on the screen)

    thread: PropTypes.arrayOf(
      PropTypes.shape({
        commentAction: PropTypes.object,
        // or
        revisionRequestCommentHostAnnotation: PropTypes.object,
        authorResponseCommentHostAnnotation: PropTypes.object, // may not be there
        // or
        reviewerCommentHostAnnotation: PropTypes.object
      })
    ).isRequired,
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),
    suggestionMapper: PropTypes.func,

    commentActionObject: PropTypes.object,
    actionAnnotationSelector: PropTypes.object,
    commentActionOnAnnotationSelector: PropTypes.object,
    revisionRequestCommentHostAction: PropTypes.object,
    authorResponseCommentHostAction: PropTypes.object,
    reviewerCommentHostAction: PropTypes.object,
    potentialCommentTypes: PropTypes.arrayOf(PropTypes.string),
    newCommentIsAuthorResponseComment: PropTypes.bool,

    createActionAnnotation: PropTypes.func.isRequired,
    updateActionAnnotation: PropTypes.func.isRequired,
    deleteActionAnnotation: PropTypes.func.isRequired,
    createCommentAction: PropTypes.func.isRequired,
    activateCommentAction: PropTypes.func.isRequired,
    updateCommentAction: PropTypes.func.isRequired,
    deleteCommentAction: PropTypes.func.isRequired,
    deleteAnnotation: PropTypes.func.isRequired,
    unfocusAnnotation: PropTypes.func.isRequired,
    setAnnotationType: PropTypes.func.isRequired
  };

  static defaultProps = {
    onResize: noop
  };

  handleDeleteThreadItem(threadItem) {
    const {
      thread,
      graphId,
      deleteCommentAction,
      deleteActionAnnotation,
      revisionRequestCommentHostAction,
      authorResponseCommentHostAction,
      reviewerCommentHostAction
    } = this.props;

    const host =
      threadItem.commentAction ||
      threadItem.reviewerCommentHostAnnotation ||
      threadItem.authorResponseCommentHostAnnotation ||
      threadItem.revisionRequestCommentHostAnnotation;

    const comment = host.resultComment || host.annotationBody;
    switch (comment['@type']) {
      case 'AuthorResponseComment':
        deleteActionAnnotation(
          graphId,
          host,
          authorResponseCommentHostAction,
          thread
            .slice(1)
            .map(item => item.commentAction)
            .filter(Boolean)
        );
        break;

      case 'RevisionRequestComment':
        deleteActionAnnotation(
          graphId,
          host,
          revisionRequestCommentHostAction,
          thread
            .slice(1)
            .map(item => item.commentAction)
            .filter(Boolean)
        );
        break;

      case 'ReviewerComment':
        deleteActionAnnotation(
          graphId,
          host,
          reviewerCommentHostAction,
          thread
            .slice(1)
            .map(item => item.commentAction)
            .filter(Boolean)
        );
        break;

      case 'EndorserComment':
      case 'Comment':
        deleteCommentAction(graphId, host);
        break;
    }
  }

  renderAnnotationThread() {
    const {
      canRespond,
      canEndorse,
      user,
      isOffline,
      graphId,
      acl,
      counter,
      graph,
      action,
      commentActionObject,
      actionAnnotationSelector,
      commentActionOnAnnotationSelector,
      revisionRequestCommentHostAction,
      authorResponseCommentHostAction,
      reviewerCommentHostAction,
      potentialCommentTypes,
      newCommentIsAuthorResponseComment,
      thread,
      blindingData,
      roleNameData,
      unfocusAnnotation,
      onResize,
      annotation,
      readOnlyUser,
      locationOptions,
      suggestionMapper,
      createActionAnnotation,
      updateActionAnnotation,
      createCommentAction,
      updateCommentAction,
      activateCommentAction,
      deleteAnnotation,
      setAnnotationType
    } = this.props;

    const isNewComment = !readOnlyUser && thread.length === 0;

    const rootItem = thread[0];
    const commentThread = thread.slice(1);

    const isRespondingToRevisionRequest = !!(
      rootItem && newCommentIsAuthorResponseComment
    );

    const canCommentOnAnnotation = !!(
      potentialCommentTypes.length &&
      (isNewComment || (canRespond && annotation.focused))
    );

    return (
      <div className="comment-thread--annotation-thread">
        {/* The annotation */}
        {!!rootItem && (
          <Comment
            className={classNames({
              'comment--author-response-comment':
                rootItem.authorResponseCommentHostAnnotation,
              'comment--revision-request-comment':
                rootItem.revisionRequestCommentHostAnnotation &&
                !rootItem.authorResponseCommentHostAnnotation,
              'comment--reviewer-comment':
                rootItem.reviewerCommentHostAnnotation
            })}
            isOffline={isOffline}
            graphId={graphId}
            readOnly={readOnlyUser}
            disabled={readOnlyUser}
            onResize={onResize}
            isRespondingToRevisionRequest={isRespondingToRevisionRequest}
            revisionRequestCommentHostAnnotation={
              rootItem.revisionRequestCommentHostAnnotation
            }
            authorResponseCommentHostAnnotation={
              rootItem.authorResponseCommentHostAnnotation
            }
            reviewerCommentHostAnnotation={
              rootItem.reviewerCommentHostAnnotation
            }
            revisionRequestCommentHostAction={revisionRequestCommentHostAction}
            authorResponseCommentHostAction={authorResponseCommentHostAction}
            reviewerCommentHostAction={reviewerCommentHostAction}
            locationOptions={locationOptions}
            suggestionMapper={suggestionMapper}
            user={user}
            graph={graph}
            acl={acl}
            blindingData={blindingData}
            updateActionAnnotation={updateActionAnnotation}
            activateCommentAction={activateCommentAction}
            onDelete={this.handleDeleteThreadItem.bind(this, rootItem)}
          />
        )}

        {/* Control to respond to the revision request when `newCommentIsAuthorResponseComment`. That control needs to look like part of the annotation (its a response to the annotation _not_ the comment thread */}
        {(isRespondingToRevisionRequest || !rootItem) && (
          <CreateComment
            user={user}
            canEndorse={canEndorse}
            acl={acl}
            graphId={graphId}
            annotation={annotation}
            counter={counter}
            graph={graph}
            blindingData={blindingData}
            roleNameData={roleNameData}
            threadLength={thread.length}
            potentialCommentTypes={potentialCommentTypes}
            action={action}
            isAuthorResponseComment={newCommentIsAuthorResponseComment}
            revisionRequestComment={
              rootItem &&
              rootItem.revisionRequestCommentHostAnnotation.annotationBody
            }
            locationOptions={locationOptions}
            suggestionMapper={suggestionMapper}
            actionAnnotationSelector={actionAnnotationSelector}
            onResize={onResize}
            createCommentAction={createCommentAction}
            createActionAnnotation={createActionAnnotation}
            deleteAnnotation={deleteAnnotation}
            unfocusAnnotation={unfocusAnnotation}
            setAnnotationType={setAnnotationType}
          />
        )}

        {/* The comment thread (commenting on the `actionAnnotation` */}
        {(!!commentThread.length || (rootItem && canCommentOnAnnotation)) && (
          <div className="comment-thread__thread">
            {!!commentThread.length && (
              <ul className="comment-thread__thread-list">
                {commentThread.map(item => (
                  <li
                    className="comment-thread__thread-item"
                    key={getId(
                      item.commentAction ||
                        item.revisionRequestCommentHostAnnotation ||
                        item.reviewerCommentHostAnnotation
                    )}
                  >
                    <Comment
                      className="comment--threaded comment--comment"
                      isOffline={isOffline}
                      graphId={graphId}
                      readOnly={readOnlyUser}
                      disabled={readOnlyUser}
                      onResize={onResize}
                      commentAction={item.commentAction}
                      commentActionObject={commentActionObject}
                      revisionRequestCommentHostAnnotation={
                        item.revisionRequestCommentHostAnnotation
                      }
                      authorResponseCommentHostAnnotation={
                        item.authorResponseCommentHostAnnotation
                      }
                      reviewerCommentHostAnnotation={
                        item.reviewerCommentHostAnnotation
                      }
                      revisionRequestCommentHostAction={
                        revisionRequestCommentHostAction
                      }
                      authorResponseCommentHostAction={
                        authorResponseCommentHostAction
                      }
                      reviewerCommentHostAction={reviewerCommentHostAction}
                      locationOptions={locationOptions}
                      suggestionMapper={suggestionMapper}
                      user={user}
                      graph={graph}
                      acl={acl}
                      blindingData={blindingData}
                      updateCommentAction={updateCommentAction}
                      activateCommentAction={activateCommentAction}
                      updateActionAnnotation={updateActionAnnotation}
                      onDelete={this.handleDeleteThreadItem.bind(this, item)}
                    />
                    <Divider />
                  </li>
                ))}
              </ul>
            )}

            {/* Control to add new comment to the comment thread */}
            {canCommentOnAnnotation && (
              <CreateComment
                className="create-comment--threaded"
                user={user}
                acl={acl}
                graphId={graphId}
                annotation={annotation}
                counter={counter}
                graph={graph}
                canEndorse={canEndorse}
                blindingData={blindingData}
                roleNameData={roleNameData}
                threadLength={thread.length}
                rootCommentAction={
                  thread[1] && thread[1].commentAction
                    ? thread[1].commentAction
                    : undefined
                }
                locationOptions={locationOptions}
                suggestionMapper={suggestionMapper}
                potentialCommentTypes={potentialCommentTypes}
                action={action}
                isAuthorResponseComment={newCommentIsAuthorResponseComment}
                actionAnnotationSelector={actionAnnotationSelector}
                isCommentActionOnAnnotation={
                  !!(
                    thread.length &&
                    !newCommentIsAuthorResponseComment &&
                    !thread[0].commentAction
                  )
                }
                commentActionOnAnnotationSelector={
                  commentActionOnAnnotationSelector
                }
                commentActionObject={action}
                onResize={onResize}
                createCommentAction={createCommentAction}
                createActionAnnotation={createActionAnnotation}
                deleteAnnotation={deleteAnnotation}
                unfocusAnnotation={unfocusAnnotation}
                setAnnotationType={setAnnotationType}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  renderCommentThread() {
    const {
      canRespond,
      canEndorse,
      user,
      isOffline,
      graphId,
      acl,
      counter,
      graph,
      action,
      commentActionObject,
      potentialCommentTypes,

      thread,
      blindingData,
      roleNameData,
      unfocusAnnotation,
      deleteAnnotation,
      onResize,
      annotation,
      readOnlyUser,
      locationOptions,
      suggestionMapper,
      createCommentAction,
      updateCommentAction,
      activateCommentAction,
      setAnnotationType
    } = this.props;

    const isNewComment = !readOnlyUser && thread.length === 0;

    return (
      <div className="comment-thread--comments-thread">
        <ul>
          {thread.map(item => (
            <li
              className="comment-thread__item"
              key={getId(
                item.commentAction ||
                  item.revisionRequestCommentHostAnnotation ||
                  item.reviewerCommentHostAnnotation
              )}
            >
              <Comment
                className="comment--comment"
                graphId={graphId}
                isOffline={isOffline}
                readOnly={readOnlyUser}
                disabled={readOnlyUser}
                onResize={onResize}
                commentAction={item.commentAction}
                commentActionObject={commentActionObject}
                locationOptions={locationOptions}
                suggestionMapper={suggestionMapper}
                user={user}
                graph={graph}
                acl={acl}
                blindingData={blindingData}
                activateCommentAction={activateCommentAction}
                updateCommentAction={updateCommentAction}
                onDelete={this.handleDeleteThreadItem.bind(this, item)}
              />
              <Divider />
            </li>
          ))}
        </ul>

        {potentialCommentTypes.length &&
        (isNewComment || (canRespond && annotation.focused)) ? (
          <CreateComment
            className={
              thread.length ? 'create-comment--comment-thread' : undefined
            }
            user={user}
            acl={acl}
            canEndorse={canEndorse}
            graphId={graphId}
            annotation={annotation}
            counter={counter}
            graph={graph}
            blindingData={blindingData}
            roleNameData={roleNameData}
            threadLength={thread.length}
            rootCommentAction={
              thread[0] && thread[0].commentAction
                ? thread[0].commentAction
                : undefined
            }
            locationOptions={locationOptions}
            suggestionMapper={suggestionMapper}
            potentialCommentTypes={potentialCommentTypes}
            action={action}
            commentActionObject={action}
            onResize={onResize}
            createCommentAction={createCommentAction}
            createActionAnnotation={createActionAnnotation}
            deleteAnnotation={deleteAnnotation}
            unfocusAnnotation={unfocusAnnotation}
            setAnnotationType={setAnnotationType}
          />
        ) : null}
      </div>
    );
  }

  render() {
    const {
      thread,
      annotation,
      counter,
      commentActionObject,
      action,
      revisionRequestCommentHostAction,
      reviewerCommentHostAction
    } = this.props;

    const identifierHostAction =
      reviewerCommentHostAction ||
      // for the author responses, we use the revision request host action
      revisionRequestCommentHostAction ||
      commentActionObject; // `commentActionObject` must be last as always defined

    const identifier = (
      <span>
        {getId(action) === getId(identifierHostAction) ? (
          identifierHostAction.identifier
        ) : (
          <ShellLink
            type="attachment"
            nodeId={getId(identifierHostAction)}
            hash={`#${identifierHostAction.identifier}`}
          >
            {identifierHostAction.identifier}
          </ShellLink>
        )}
        <span>→</span>
        <span>{prettifyLocation(counter.getUrl().hash.substring(1))}</span>
      </span>
    );

    return (
      <div className="comment-thread">
        <AnnotationHeader annotation={annotation} identifier={identifier} />

        <div className="comment-thread__body">
          {(thread[0] && thread[0].commentAction) ||
          (!thread.length &&
            (annotation.type === COMMENT ||
              annotation.type === ENDORSER_COMMENT))
            ? this.renderCommentThread()
            : this.renderAnnotationThread()}
        </div>
      </div>
    );
  }
}

function makeSelector() {
  const graphDataSelector = createGraphDataSelector();
  const commentMapSelector = createCommentMapSelector();
  const actionMapSelector = createActionMapSelector();

  return createSelector(
    state => state.isOffline,
    state => state.user,
    createReadOnlyUserSelector(),
    createGraphAclSelector(),
    (state, props) => {
      const graphData = graphDataSelector(state, props);
      return graphData && graphData.graph;
    },
    commentMapSelector,
    actionMapSelector,
    annotationLocationAutocompleteDataSelector,
    (state, props) => props.annotation,
    (state, props) => props.matchingLevel,
    (
      isOffline,
      user,
      readOnlyUser,
      acl,
      graph,
      commentMap,
      actionMap,
      locationOptions,
      annotation,
      matchingLevel
    ) => {
      const action = getWorkflowAction(getId(annotation.selector.node), {
        user,
        acl,
        actionMap
      });

      const stageActions = getStageActions(actionMap[getStageId(action)]);
      const endorseAction = stageActions.find(
        stageAction =>
          stageAction['@type'] == 'EndorseAction' &&
          getObjectId(stageAction) === getId(action)
      );

      const canEndorse =
        !!endorseAction &&
        action.actionStatus === 'StagedActionStatus' &&
        acl.checkPermission(user, 'PerformActionPermission', {
          action: endorseAction
        });

      let thread = [];

      let actionAnnotationSelector,
        commentActionOnAnnotationSelector,
        revisionRequestCommentHostAction,
        revisionRequestCommentHostAnnotation,
        authorResponseCommentHostAction,
        authorResponseCommentHostAnnotation,
        reviewerCommentHostAction,
        reviewerCommentHostAnnotation;

      const commentActionObject = action;

      // `annotation.object` is `resultComment` of a `CommentAction` or an `Annotation`
      if (annotation.type === COMMENT || annotation.type === ENDORSER_COMMENT) {
        if (annotation.isNew) {
          // Nothing to do as commentActionObject was already set
        } else {
          const commentAction = Object.values(commentMap).find(
            commentAction =>
              getAnnotationObject(commentAction) === annotation.object
          );
          if (commentAction) {
            thread.push({ commentAction });
            if (getId(commentAction.resultComment)) {
              const responses = Object.values(commentMap)
                .filter(
                  _commentAction =>
                    getId(
                      _commentAction.resultComment &&
                        _commentAction.resultComment.parentItem
                    ) === getId(commentAction.resultComment)
                )
                .sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime()
                );
              if (responses.length) {
                thread.push(
                  ...responses.map(response => ({ commentAction: response }))
                );
              }
            }
          }
        }
      } else {
        // annotation
        // Note: annotations only operate on the files attachment

        // we get to the files selector level by using `matchingLevel`
        actionAnnotationSelector = unwrapSelector(
          annotation.selector,
          matchingLevel
        );

        if (annotation.isNew) {
          // isNew is not possible for AuthorResponseComment are those are made in response to a RevisionRequestComment
          switch (action['@type']) {
            case 'AssessAction':
              revisionRequestCommentHostAction = action;
              break;
            case 'ReviewAction':
              reviewerCommentHostAction = action;
              break;
          }
        } else {
          const actionAnnotationHostAction = Object.values(actionMap).find(
            action =>
              arrayify(action.annotation).some(
                actionAnnotation =>
                  getAnnotationObject(actionAnnotation) === annotation.object
              )
          );

          if (actionAnnotationHostAction) {
            const actionAnnotation = arrayify(
              actionAnnotationHostAction.annotation
            ).find(
              actionAnnotation =>
                getAnnotationObject(actionAnnotation) === annotation.object
            );

            if (actionAnnotation && actionAnnotation.annotationBody) {
              switch (actionAnnotation.annotationBody['@type']) {
                case 'RevisionRequestComment': {
                  revisionRequestCommentHostAction = actionAnnotationHostAction;
                  revisionRequestCommentHostAnnotation = actionAnnotation;

                  const createReleaseAction = Object.values(actionMap).find(
                    action =>
                      action['@type'] === 'CreateReleaseAction' &&
                      arrayify(action.annotation).some(
                        actionAnnotation =>
                          getId(
                            actionAnnotation.annotationBody &&
                              actionAnnotation.annotationBody.parentItem
                          ) ===
                          getId(
                            revisionRequestCommentHostAnnotation.annotationBody
                          )
                      )
                  );

                  // TODO restrict so that response don't make it to assess or reviews _before_ the response CRA
                  if (createReleaseAction) {
                    authorResponseCommentHostAction = createReleaseAction;
                    authorResponseCommentHostAnnotation = arrayify(
                      authorResponseCommentHostAction.annotation
                    ).find(
                      actionAnnotation =>
                        getId(actionAnnotation.annotationBody.parentItem) ===
                        getId(
                          revisionRequestCommentHostAnnotation.annotationBody
                        )
                    );
                    thread.push({
                      revisionRequestCommentHostAnnotation,
                      authorResponseCommentHostAnnotation
                    });
                  } else {
                    thread.push({
                      revisionRequestCommentHostAnnotation
                    });
                  }

                  break;
                }

                case 'ReviewerComment': {
                  reviewerCommentHostAction = actionAnnotationHostAction;
                  reviewerCommentHostAnnotation = actionAnnotation;
                  thread.push({ reviewerCommentHostAnnotation });
                  break;
                }
              }

              // get the commentActions
              commentActionOnAnnotationSelector = getCommentActionOnAnnotationSelector(
                {
                  action,
                  annotation,
                  user,
                  acl,
                  actionMap,
                  revisionRequestCommentHostAction,
                  revisionRequestCommentHostAnnotation,
                  reviewerCommentHostAction,
                  reviewerCommentHostAnnotation
                }
              );

              if (commentActionOnAnnotationSelector) {
                const rootCommentAction = Object.values(commentMap).find(
                  commentAction => {
                    return (
                      // only top level comment not comment response
                      (!commentAction.resultComment ||
                        !getId(commentAction.resultComment.parentItem)) &&
                      commentAction.object &&
                      commentAction.object.hasSelector &&
                      isSelectorEqual(
                        commentActionOnAnnotationSelector,
                        commentAction.object.hasSelector,
                        {
                          offsets: false
                        }
                      )
                    );
                  }
                );

                if (rootCommentAction) {
                  thread.push({ commentAction: rootCommentAction });
                  if (getId(rootCommentAction.resultComment)) {
                    const responses = Object.values(commentMap)
                      .filter(
                        commentAction =>
                          getId(
                            commentAction.resultComment &&
                              commentAction.resultComment.parentItem
                          ) === getId(rootCommentAction.resultComment)
                      )
                      .sort(
                        (a, b) =>
                          new Date(a.startTime).getTime() -
                          new Date(b.startTime).getTime()
                      );
                    if (responses.length) {
                      thread.push(
                        ...responses.map(response => ({
                          commentAction: response
                        }))
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }

      const canPerform = acl.checkPermission(user, 'PerformActionPermission', {
        action
      });
      const canView = acl.checkPermission(user, 'ViewActionPermission', {
        action
      });

      const canComment =
        action.actionStatus === 'StagedActionStatus' && (canPerform || canView); // Note canEndorse and canViewEndorse are already covered by canView (adding them would create false positive when the action is in ActiveActionStatus

      const newCommentIsAuthorResponseComment =
        thread.length === 1 &&
        thread[0].revisionRequestCommentHostAnnotation &&
        !thread[0].authorResponseCommentHostAnnotation &&
        action['@type'] === 'CreateReleaseAction' &&
        (action.actionStatus === 'ActiveActionStatus' ||
          action.actionStatus === 'StagedActionStatus') &&
        canPerform;

      const canRespond =
        !readOnlyUser &&
        thread &&
        thread.length > 0 &&
        !newCommentIsAuthorResponseComment &&
        canComment;

      const isFilesSelector = isFilesAttachmentSelector(annotation.selector);
      const potentialCommentTypes = [];

      if (!thread.length) {
        switch (action['@type']) {
          case 'AssessAction':
            if (
              (action.actionStatus === 'ActiveActionStatus' ||
                action.actionStatus === 'StagedActionStatus') &&
              canPerform &&
              isFilesSelector
            ) {
              potentialCommentTypes.push('RevisionRequestComment');
            }
            if (canComment) {
              potentialCommentTypes.push(
                canEndorse ? 'EndorserComment' : 'Comment'
              );
            }
            break;

          case 'ReviewAction':
            if (
              (action.actionStatus === 'ActiveActionStatus' ||
                action.actionStatus === 'StagedActionStatus') &&
              canPerform &&
              isFilesSelector
            ) {
              potentialCommentTypes.push('ReviewerComment');
            }
            if (canComment) {
              potentialCommentTypes.push(
                canEndorse ? 'EndorserComment' : 'Comment'
              );
            }
            break;

          default:
            if (canComment) {
              potentialCommentTypes.push(
                canEndorse ? 'EndorserComment' : 'Comment'
              );
            }
            break;
        }
      } else if (canRespond) {
        switch (action['@type']) {
          case 'CreateReleaseAction':
            if (
              thread[0].revisionRequestCommentHostAction &&
              !thread[0].authorResponseCommentHostAction &&
              (action.actionStatus === 'ActiveActionStatus' ||
                action.actionStatus === 'StagedActionStatus') &&
              canPerform &&
              isFilesSelector
            ) {
              potentialCommentTypes.push('AuthorResponseComment');
            }
            if (canComment) {
              potentialCommentTypes.push(
                canEndorse ? 'EndorserComment' : 'Comment'
              );
            }
            break;

          default:
            if (canComment) {
              potentialCommentTypes.push(
                canEndorse ? 'EndorserComment' : 'Comment'
              );
            }
            break;
        }
      }

      return {
        isOffline,
        canRespond,
        canEndorse,
        user,
        readOnlyUser,
        graph,
        acl,
        roleNameData:
          acl &&
          acl.getRoleNameData(user, {
            ignoreEndDateOnPublicationOrRejection: true
          }),
        blindingData:
          acl &&
          acl.getBlindingData(user, {
            ignoreEndDateOnPublicationOrRejection: true
          }),
        thread,
        locationOptions,
        action,
        suggestionMapper: location =>
          getRelativeLocationLink(
            getVersion(getSelectorGraphParam(action)),
            location
          ),
        newCommentIsAuthorResponseComment,
        commentActionObject,
        revisionRequestCommentHostAction,
        authorResponseCommentHostAction,
        reviewerCommentHostAction,
        potentialCommentTypes,
        actionAnnotationSelector,
        commentActionOnAnnotationSelector
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

export default connect(
  makeMapStateToProps,
  {
    createActionAnnotation,
    updateActionAnnotation,
    deleteActionAnnotation,
    createCommentAction,
    updateCommentAction,
    activateCommentAction,
    deleteCommentAction,
    deleteAnnotation,
    unfocusAnnotation,
    setAnnotationType
  }
)(CommentThread);
