import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import noop from 'lodash/noop';
import Iconoclass from '@scipe/iconoclass';
import { getAgentId } from '@scipe/librarian';
import { getId, arrayify } from '@scipe/jsonld';
import {
  ControlPanel,
  RichTextarea,
  PaperButton,
  UserBadgeMenu,
  Menu,
  MenuItem,
  Value,
  ActionAudience,
  getDisplayName,
  getUserBadgeLabel,
  bemify
} from '@scipe/ui';
import CommentIsBasedOnEditor from './comment-is-based-on-editor';

// TODO? add option to re-anchor comment

export default class Comment extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired, // needed for selector
    user: PropTypes.object,
    isOffline: PropTypes.bool,
    graph: PropTypes.object,
    acl: PropTypes.object.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,

    commentAction: PropTypes.object,
    commentActionObject: PropTypes.object,
    isRespondingToRevisionRequest: PropTypes.bool,
    revisionRequestCommentHostAnnotation: PropTypes.object,
    authorResponseCommentHostAnnotation: PropTypes.object,
    reviewerCommentHostAnnotation: PropTypes.object,
    revisionRequestCommentHostAction: PropTypes.object,
    authorResponseCommentHostAction: PropTypes.object,
    reviewerCommentHostAction: PropTypes.object,
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),
    suggestionMapper: PropTypes.func,

    updateActionAnnotation: PropTypes.func,
    updateCommentAction: PropTypes.func,
    activateCommentAction: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
    onResize: PropTypes.func.isRequired
  };

  static defaultProps = {
    updateActionAnnotation: noop,
    onDelete: noop,
    updateCommentAction: noop
  };

  static getDerivedStateFromProps(props, state) {
    const nextSource =
      props.commentAction ||
      props.authorResponseCommentHostAnnotation ||
      props.revisionRequestCommentHostAnnotation ||
      props.reviewerCommentHostAnnotation;

    if (nextSource !== state.lastSource) {
      const comment = nextSource
        ? nextSource.resultComment || nextSource.annotationBody
        : null;

      const isBasedOn =
        comment['@type'] === 'RevisionRequestComment'
          ? arrayify(comment.isBasedOn)
          : comment['@type'] === 'AuthorResponseComment'
          ? arrayify(
              props.revisionRequestCommentHostAnnotation &&
                props.revisionRequestCommentHostAnnotation.annotationBody &&
                props.revisionRequestCommentHostAnnotation.annotationBody
                  .isBasedOn
            )
          : [];

      return {
        lastSource: nextSource,
        value: (comment && comment.text) || '',
        isBasedOn
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    const comment = this.getComment(props);
    this.textarea = React.createRef();

    this.state = {
      value: comment.text || '',
      isBasedOn:
        comment['@type'] === 'RevisionRequestComment'
          ? arrayify(comment.isBasedOn)
          : comment['@type'] === 'AuthorResponseComment'
          ? arrayify(
              props.revisionRequestCommentHostAnnotation &&
                props.revisionRequestCommentHostAnnotation.annotationBody &&
                props.revisionRequestCommentHostAnnotation.annotationBody
                  .isBasedOn
            )
          : [],
      isBeingEdited: false,
      lastSource:
        props.commentAction ||
        props.authorResponseCommentHostAnnotation ||
        props.revisionRequestCommentHostAnnotation ||
        props.reviewerCommentHostAnnotation
    };
  }

  handleResize = (height, prevHeight) => {
    if (prevHeight == null || height == null || prevHeight !== height) {
      this.props.onResize();
    }
  };

  handleEdit = e => {
    e.preventDefault();
    this.setState({ isBeingEdited: true }, () => {
      this.textarea.current.focus();
      this.props.onResize();
    });
  };

  handleDelete = e => {
    e.preventDefault();
    const { onDelete } = this.props;
    onDelete();
  };

  handleCancel = e => {
    e.preventDefault();
    this.setState({ isBeingEdited: false }, () => {
      this.props.onResize();
    });
  };

  handleAddIsBasedOnItem = itemId => {
    this.setState({ isBasedOn: this.state.isBasedOn.concat(itemId) }, () => {
      this.props.onResize();
    });
  };

  handleDeleteIsBasedOnItem = itemId => {
    this.setState(
      {
        isBasedOn: this.state.isBasedOn.filter(uri => uri !== itemId)
      },
      () => {
        this.props.onResize();
      }
    );
  };

  handleActivateCommentAction = e => {
    const { activateCommentAction, graphId, commentAction } = this.props;
    activateCommentAction(graphId, getId(commentAction));
  };

  handleSubmit = e => {
    e.preventDefault();
    const {
      commentAction,
      revisionRequestCommentHostAction,
      revisionRequestCommentHostAnnotation,
      authorResponseCommentHostAction,
      authorResponseCommentHostAnnotation,
      reviewerCommentHostAction,
      reviewerCommentHostAnnotation,
      graph,
      updateCommentAction,
      updateActionAnnotation,
      onResize
    } = this.props;

    const { isBasedOn } = this.state;
    const nextValue = this.textarea.current.getNextDefaultValue();

    const comment = this.getComment();

    switch (comment['@type']) {
      case 'AuthorResponseComment':
        updateActionAnnotation(
          getId(graph),
          getId(authorResponseCommentHostAnnotation),
          authorResponseCommentHostAction,
          { text: nextValue }
        );
        break;

      case 'RevisionRequestComment':
        updateActionAnnotation(
          getId(graph),
          getId(revisionRequestCommentHostAnnotation),
          revisionRequestCommentHostAction,
          { text: nextValue, isBasedOn }
        );
        break;

      case 'ReviewerComment':
        updateActionAnnotation(
          getId(graph),
          getId(reviewerCommentHostAnnotation),
          reviewerCommentHostAction,
          { text: nextValue }
        );
        break;

      default:
        updateCommentAction(getId(graph), commentAction, nextValue);
        break;
    }

    this.setState({ isBeingEdited: false, value: nextValue }, () => {
      onResize();
    });
  };

  getComment(props) {
    props = props || this.props;
    const {
      commentAction,
      revisionRequestCommentHostAnnotation,
      authorResponseCommentHostAnnotation,
      reviewerCommentHostAnnotation
    } = props;

    const host =
      commentAction ||
      reviewerCommentHostAnnotation ||
      authorResponseCommentHostAnnotation ||
      revisionRequestCommentHostAnnotation;

    return host.resultComment || host.annotationBody;
  }

  render() {
    const {
      isOffline,
      graphId,
      acl,
      className,
      commentAction,
      blindingData,
      disabled,
      readOnly,
      user,
      graph,
      commentActionObject,
      revisionRequestCommentHostAction,
      authorResponseCommentHostAction,
      revisionRequestCommentHostAnnotation,
      reviewerCommentHostAction,
      isRespondingToRevisionRequest,
      locationOptions,
      suggestionMapper
    } = this.props;
    const { value, isBasedOn, isBeingEdited } = this.state;

    const comment = this.getComment();
    const revisionRequestComment =
      revisionRequestCommentHostAnnotation &&
      revisionRequestCommentHostAnnotation.annotationBody;

    const isThreadParent =
      (comment['@type'] === 'Comment' ||
        comment['@type'] === 'EndorserComment') &&
      !getId(comment.parentItem);

    let canComment, canEditComment, canDeleteComment;
    switch (comment['@type']) {
      case 'RevisionRequestComment': {
        canComment = canEditComment = canDeleteComment =
          (revisionRequestCommentHostAction.actionStatus ===
            'ActiveActionStatus' ||
            revisionRequestCommentHostAction.actionStatus ===
              'StagedActionStatus') &&
          acl.checkPermission(user, 'PerformActionPermission', {
            action: revisionRequestCommentHostAction
          });
        break;
      }

      case 'ReviewerComment': {
        canComment = canEditComment = canDeleteComment =
          (reviewerCommentHostAction.actionStatus === 'ActiveActionStatus' ||
            reviewerCommentHostAction.actionStatus === 'StagedActionStatus') &&
          acl.checkPermission(user, 'PerformActionPermission', {
            action: reviewerCommentHostAction
          });
        break;
      }

      case 'AuthorResponseComment': {
        canComment = canEditComment = canDeleteComment =
          (authorResponseCommentHostAction.actionStatus ===
            'ActiveActionStatus' ||
            authorResponseCommentHostAction.actionStatus ===
              'StagedActionStatus') &&
          acl.checkPermission(user, 'PerformActionPermission', {
            action: authorResponseCommentHostAction
          });
        break;
      }

      default: {
        // CommentAction
        canComment =
          commentActionObject.actionStatus === 'StagedActionStatus' &&
          (acl.checkPermission(user, 'PerformActionPermission', {
            action: commentActionObject
          }) ||
            acl.checkPermission(user, 'ViewActionPermission', {
              action: commentActionObject
            }));

        canEditComment =
          canComment &&
          acl.checkPermission(user, 'PerformActionPermission', {
            action: commentAction
          });

        canDeleteComment =
          canComment &&
          acl.checkPermission(user, 'DeleteActionPermission', {
            action: commentAction
          });

        break;
      }
    }

    const bem = bemify('comment');

    return (
      <div className={classNames(bem``, className)}>
        <header>
          <div className={bem`__header`}>
            {(comment['@type'] === 'Comment' ||
              comment['@type'] === 'EndorserComment') && (
              <div className={bem`__header-left`}>
                <UserBadgeMenu
                  size={24}
                  align="left"
                  statusIconName={
                    comment['@type'] === 'EndorserComment'
                      ? 'thumbUp'
                      : undefined
                  }
                  anonymous={blindingData.isBlinded(commentAction.agent)}
                  userId={getAgentId(blindingData.resolve(commentAction.agent))}
                  name={getDisplayName(blindingData, commentAction.agent, {
                    addRoleNameSuffix: true
                  })}
                  userBadgeLabel={getUserBadgeLabel(
                    blindingData,
                    commentAction.agent
                  )}
                  roleName={
                    commentAction &&
                    commentAction.agent &&
                    commentAction.agent.roleName
                  }
                  subRoleName={
                    commentAction &&
                    commentAction.agent &&
                    commentAction.agent.name
                  }
                />
                {isThreadParent && (
                  <Fragment>
                    <Iconoclass iconName="arrowOpenRight" />
                    <ActionAudience
                      user={user}
                      graph={graph}
                      audienceProp="participant"
                      action={commentAction}
                      readOnly={true}
                      disabled={true}
                      blindingData={blindingData}
                    />
                  </Fragment>
                )}
              </div>
            )}

            {(canEditComment || canDeleteComment) && (
              <div className={bem`__header-right`}>
                {comment['@type'] === 'RevisionRequestComment' ||
                comment['@type'] === 'AuthorResponseComment' ||
                comment['@type'] === 'ReviewerComment' ? null : (
                  <Menu align="right" portal={true}>
                    {!!canEditComment && (
                      <MenuItem
                        disabled={disabled}
                        readOnly={readOnly}
                        onClick={this.handleEdit}
                        icon={{ iconName: 'pencil', color: 'black' }}
                      >
                        Edit
                      </MenuItem>
                    )}
                    {!!canDeleteComment && (
                      <MenuItem
                        disabled={disabled}
                        readOnly={readOnly}
                        onClick={this.handleDelete}
                        icon={{ iconName: 'trash', color: 'black' }}
                      >
                        Delete
                      </MenuItem>
                    )}
                  </Menu>
                )}
              </div>
            )}
          </div>

          {/*<DateFromNow>{commentAction.startTime}</DateFromNow>*/}

          {!isBeingEdited &&
            !!commentAction &&
            canComment &&
            commentAction.actionStatus === 'PotentialActionStatus' && (
              <div className={bem`__status`}>
                <Iconoclass iconName="warningTriangle" iconSize={16} />
                Offline draft
                {!isOffline && (
                  <PaperButton onClick={this.handleActivateCommentAction}>
                    Submit
                  </PaperButton>
                )}
              </div>
            )}

          {!canComment &&
            !!commentAction &&
            commentActionObject.actionStatus === 'CompletedActionStatus' &&
            commentAction.actionStatus === 'PotentialActionStatus' && (
              <div className={bem`__status`}>
                <Iconoclass iconName="warningTriangle" iconSize={16} />
                Comment was not shared
              </div>
            )}
        </header>

        {/*In case of AuthorResponseComment we display the RevisionRequestComment as context*/}
        {!!(
          (comment['@type'] === 'AuthorResponseComment' ||
            isRespondingToRevisionRequest) &&
          revisionRequestComment
        ) && (
          <div className={bem`__request-context`}>
            <Value locationLinksType="shell" className="sa__ui-user-type">
              {revisionRequestComment.text}
            </Value>
            <CommentIsBasedOnEditor
              graphId={graphId}
              assessAction={revisionRequestCommentHostAction}
              isBasedOn={isBasedOn}
              disabled={true}
              readOnly={true}
              onAdd={this.handleAddIsBasedOnItem}
              onDelete={this.handleDeleteIsBasedOnItem}
              linkType="shell"
            />
          </div>
        )}

        {isBeingEdited ? (
          <div className={bem`__form`}>
            <RichTextarea
              ref={this.textarea}
              defaultValue={comment.text}
              name="comment"
              label="Comment"
              onResize={this.handleResize}
              options={locationOptions}
              suggestionMapper={suggestionMapper}
              floatLabel={false}
            />

            {comment['@type'] === 'RevisionRequestComment' && (
              <CommentIsBasedOnEditor
                graphId={graphId}
                assessAction={revisionRequestCommentHostAction}
                isBasedOn={isBasedOn}
                onAdd={this.handleAddIsBasedOnItem}
                onDelete={this.handleDeleteIsBasedOnItem}
                linkType="shell"
              />
            )}

            <ControlPanel>
              <PaperButton onClick={this.handleCancel}>Cancel</PaperButton>
              <PaperButton onClick={this.handleSubmit}>Submit</PaperButton>
            </ControlPanel>
          </div>
        ) : isRespondingToRevisionRequest ? null : (
          <div className={bem`__comment-text`}>
            <Value locationLinksType="shell" className="sa__ui-user-type">
              {value || comment.text /* value is to fake optimistic updates */}
            </Value>
            {comment['@type'] === 'RevisionRequestComment' && (
              <CommentIsBasedOnEditor
                graphId={graphId}
                assessAction={revisionRequestCommentHostAction}
                isBasedOn={isBasedOn}
                onAdd={this.handleAddIsBasedOnItem}
                onDelete={this.handleDeleteIsBasedOnItem}
                disabled={true}
                readOnly={true}
                linkType="shell"
              />
            )}
          </div>
        )}

        {canEditComment && (
          <div className={bem`__footer-right`}>
            {comment['@type'] === 'RevisionRequestComment' ||
            comment['@type'] === 'AuthorResponseComment' ||
            comment['@type'] === 'ReviewerComment' ? (
              isBeingEdited ? null : (
                <div className={bem`__annotation-control`}>
                  <PaperButton disabled={disabled} onClick={this.handleEdit}>
                    {comment['@type'] === 'AuthorResponseComment'
                      ? 'Edit Response'
                      : 'Edit'}
                  </PaperButton>
                  <PaperButton disabled={disabled} onClick={this.handleDelete}>
                    Delete
                  </PaperButton>
                </div>
              )
            ) : null}
          </div>
        )}
      </div>
    );
  }
}
