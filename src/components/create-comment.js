import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { getId } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import {
  remapRole,
  getAgentId,
  getMetaActionParticipants
} from '@scipe/librarian';
import {
  ControlPanel,
  PaperSelect,
  RichTextarea,
  PaperButton,
  UserBadgeMenu,
  MenuItem,
  ActionAudience,
  getDisplayName,
  getUserBadgeLabel,
  BemTags
} from '@scipe/ui';
import {
  COMMENT,
  REVIEWER_COMMENT,
  ENDORSER_COMMENT,
  REVISION_REQUEST_COMMENT
} from '../constants';
import Counter from '../utils/counter';
import CommentIsBasedOnEditor from './comment-is-based-on-editor';
import { getPotentialAgents } from '../utils/workflow';

/**
 * Used to create new comment or respond to existing comments
 */
export default class CreateComment extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired, // needed for selector

    counter: PropTypes.instanceOf(Counter),

    annotation: PropTypes.object.isRequired,
    onResize: PropTypes.func,

    user: PropTypes.object.isRequired,
    graph: PropTypes.object,
    acl: PropTypes.object.isRequired,
    roleNameData: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,

    rootCommentAction: PropTypes.object, // if defined, we create a comment in response to `rootCommentAction`
    threadLength: PropTypes.number,
    potentialCommentTypes: PropTypes.arrayOf(PropTypes.string),
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),
    suggestionMapper: PropTypes.func,
    isAuthorResponseComment: PropTypes.bool,
    revisionRequestComment: PropTypes.object, // the `RevisionRequestComment` that the author response will anser

    canEndorse: PropTypes.bool.isRequired,
    createCommentAction: PropTypes.func.isRequired,
    createActionAnnotation: PropTypes.func.isRequired,
    deleteAnnotation: PropTypes.func.isRequired,
    unfocusAnnotation: PropTypes.func.isRequired,

    action: PropTypes.object, // if the resulting comment is within an annotation, `action` hosts that annotation
    actionAnnotationSelector: PropTypes.object,
    isCommentActionOnAnnotation: PropTypes.bool,
    commentActionOnAnnotationSelector: PropTypes.object,
    commentActionObject: PropTypes.object,

    setAnnotationType: PropTypes.func.isRequired
  };

  static defaultProps = {
    onResize: noop
  };

  static getDerivedStateFromProps(props, state) {
    if (
      props.acl !== state.lastAcl ||
      props.threadLength !== state.lastThreadLength ||
      props.commentActionObject !== state.lastCommentActionObject
    ) {
      const nextState = {
        lastAcl: props.acl,
        lastThreadLength: props.threadLength,
        lastCommentActionObject: props.commentActionObject
      };

      if (state.agentId == null) {
        nextState.agentId = getId(
          getPotentialAgents(
            props.user,
            props.acl,
            props.commentActionObject
          )[0]
        );
      }

      // reset comment input
      if (props.threadLength !== state.lastThreadLength) {
        nextState.text = '';
        nextState.isBasedOn = [];
      }

      return nextState;
    }

    return null;
  }

  constructor(props) {
    super(props);

    const { acl, user, commentActionObject, threadLength } = props;

    this.newCommentRef = React.createRef();

    this.state = {
      agentId: getId(getPotentialAgents(user, acl, commentActionObject)[0]),
      text: '',
      isBasedOn: [],
      lastAcl: acl,
      lastThreadLength: threadLength,
      lastCommentActionObject: props.commentActionObject,
      hasBeenFocused: false
    };
  }

  handleFocus = e => {
    this.setState({ hasBeenFocused: true }, () => {
      this.props.onResize();
    });
  };

  handleResize = (height, prevHeight) => {
    if (prevHeight == null || height == null || prevHeight !== height) {
      this.props.onResize();
    }
  };

  handleSelectAgentRole(role, e) {
    e.preventDefault();
    this.setState({
      agentId: getId(role)
    });
  }

  handleChange = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  handleChangeAnnotationType = e => {
    const { setAnnotationType, annotation, threadLength } = this.props;

    if (threadLength <= 1) {
      setAnnotationType(
        annotation.id,
        e.target.value === 'ReviewerComment'
          ? REVIEWER_COMMENT
          : e.target.value === 'RevisionRequestComment'
          ? REVISION_REQUEST_COMMENT
          : e.target.value === 'EndorserComment'
          ? ENDORSER_COMMENT
          : COMMENT
      );
    }
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

  handleCancel = e => {
    const {
      user,
      acl,
      commentActionObject,
      annotation,
      rootCommentAction,
      unfocusAnnotation,
      deleteAnnotation,
      isAuthorResponseComment
    } = this.props;
    e.preventDefault();

    if (rootCommentAction) {
      unfocusAnnotation();
    } else if (!isAuthorResponseComment) {
      deleteAnnotation(annotation.id);
    }

    this.setState(
      {
        agentId: getId(getPotentialAgents(user, acl, commentActionObject)[0]),
        text: '',
        isBasedOn: [],
        hasBeenFocused: false
      },
      () => {
        if (this.newCommentRef.current) {
          this.newCommentRef.current.reset();
        }
      }
    );
  };

  handleSubmit = e => {
    e.preventDefault();

    const {
      graphId,
      acl,
      annotation,
      createCommentAction,
      createActionAnnotation,
      action,
      actionAnnotationSelector,
      commentActionObject,
      rootCommentAction,
      isAuthorResponseComment,
      revisionRequestComment,
      commentActionOnAnnotationSelector,
      isCommentActionOnAnnotation,
      canEndorse
    } = this.props;

    const { agentId, isBasedOn } = this.state;

    const commentType = getCommentType(
      canEndorse,
      isAuthorResponseComment,
      isCommentActionOnAnnotation,
      annotation
    );

    if (this.newCommentRef.current) {
      const htmlNode = this.newCommentRef.current.getNextDefaultValue();

      if (commentType === 'Comment' || commentType === 'EndorserComment') {
        createCommentAction(graphId, {
          annotation,
          commentType,
          agent: remapRole(acl.findRole(agentId), 'agent'),
          text: htmlNode,
          commentActionObject,
          parentItemId: getId(
            rootCommentAction && rootCommentAction.resultComment
          ),
          isCommentActionOnAnnotation,
          actionAnnotationSelector: isCommentActionOnAnnotation
            ? commentActionOnAnnotationSelector
            : undefined
        });
      } else {
        // annotation case
        createActionAnnotation(graphId, annotation, action, {
          selector: actionAnnotationSelector,
          commentType,
          text: htmlNode,
          isBasedOn,
          parentItemId: isAuthorResponseComment
            ? getId(revisionRequestComment)
            : undefined
        });
      }

      this.setState(
        {
          hasBeenFocused: false
        },
        () => {
          this.newCommentRef.current.reset();
        }
      );
    }
  };

  render() {
    const {
      canEndorse,
      graphId,
      action,
      className,
      user,
      acl,
      graph,
      blindingData,
      commentActionObject,
      rootCommentAction,
      locationOptions,
      suggestionMapper,
      annotation,
      potentialCommentTypes,
      isAuthorResponseComment,
      isCommentActionOnAnnotation
    } = this.props;

    const { agentId, text, isBasedOn, hasBeenFocused } = this.state;

    const commentType = getCommentType(
      canEndorse,
      isAuthorResponseComment,
      isCommentActionOnAnnotation,
      annotation
    );

    const agent = acl.findRole(agentId) || {};

    const isSubmitable =
      commentType === 'Comment'
        ? !!(commentActionObject && agentId && text)
        : !!text;

    // get the list of possible persona for the `agent` of the CommentAction
    const roles = getPotentialAgents(user, acl, commentActionObject);

    const displayControls =
      (((commentType === 'Comment' || commentType === 'EndorserComment') &&
        (rootCommentAction || isCommentActionOnAnnotation)) ||
        (commentType === 'AuthorResponseComment' && isAuthorResponseComment)) &&
      (!potentialCommentTypes || potentialCommentTypes.length <= 1)
        ? hasBeenFocused
        : true;

    const bem = BemTags();

    return (
      <div className={classNames(className, bem`create-comment`)}>
        {commentType === 'Comment' && displayControls && (
          <div className={bem`__recipients`}>
            <UserBadgeMenu
              align="left"
              size={24}
              anonymous={blindingData.isBlinded(agent)}
              userId={getAgentId(agent)}
              name={getDisplayName(blindingData, agent, {
                addRoleNameSuffix: true
              })}
              userBadgeLabel={getUserBadgeLabel(blindingData, agent)}
              roleName={agent.roleName}
              subRoleName={agent.name}
              iconName={!agent.roleName ? 'personWarning' : undefined}
            >
              {roles.length > 1 && (
                <Fragment>
                  <MenuItem disabled={true}>Comment as:</MenuItem>
                  {roles.map(role => (
                    <MenuItem
                      key={getId(role)}
                      onClick={this.handleSelectAgentRole.bind(this, role)}
                      icon={{
                        iconName: getId(role) === agentId ? 'check' : 'none',
                        round: false,
                        color: 'black'
                      }}
                    >
                      {role.name
                        ? `${role.name} (${role.roleName})`
                        : role.roleName}
                    </MenuItem>
                  ))}
                </Fragment>
              )}
            </UserBadgeMenu>

            {!rootCommentAction && (
              <Fragment>
                <Iconoclass iconName="arrowOpenRight" />

                <ActionAudience
                  user={user}
                  graph={graph}
                  audienceProp="participant"
                  action={{
                    '@type': 'CommentAction',
                    agent,
                    participant: getMetaActionParticipants(
                      commentActionObject,
                      {
                        addAgent: true,
                        restrictToActiveAndStagedAudiences: true
                      }
                    )
                  }}
                  readOnly={true}
                  disabled={true}
                  blindingData={blindingData}
                />
              </Fragment>
            )}
          </div>
        )}

        {/* We only allow RevisionRequestComment on the files content from an AssessAction and ReviewerComment on the files content of a ReviewAction */}
        <div className={bem`__body`}>
          {!!(potentialCommentTypes && potentialCommentTypes.length > 1) && (
            <PaperSelect
              name="commentType"
              value={commentType}
              onChange={this.handleChangeAnnotationType}
              label="type"
            >
              {potentialCommentTypes.map(commentType => (
                <option key={commentType} value={commentType}>
                  {commentType === 'RevisionRequestComment'
                    ? 'Revision request'
                    : commentType === 'ReviewerComment'
                    ? 'Review annotation'
                    : commentType === 'EndorserComment'
                    ? 'Endorser comment'
                    : 'Comment'}
                </option>
              ))}
            </PaperSelect>
          )}

          <RichTextarea
            defaultValue={''}
            ref={this.newCommentRef}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            name="text"
            options={locationOptions}
            suggestionMapper={suggestionMapper}
            label={
              commentType === 'RevisionRequestComment' ||
              commentType === 'ReviewerComment'
                ? 'Body'
                : commentType === 'AuthorResponseComment'
                ? hasBeenFocused
                  ? 'Response'
                  : 'Respond'
                : hasBeenFocused
                ? 'Comment'
                : 'Add Comment'
            }
            onResize={this.handleResize}
          />

          {commentType === 'RevisionRequestComment' && (
            <CommentIsBasedOnEditor
              graphId={graphId}
              assessAction={action}
              isBasedOn={isBasedOn}
              onAdd={this.handleAddIsBasedOnItem}
              onDelete={this.handleDeleteIsBasedOnItem}
              linkType="shell"
            />
          )}
        </div>

        {displayControls && (
          <ControlPanel>
            <PaperButton onClick={this.handleCancel}>Cancel</PaperButton>
            <PaperButton disabled={!isSubmitable} onClick={this.handleSubmit}>
              Submit
            </PaperButton>
          </ControlPanel>
        )}
      </div>
    );
  }
}

function getCommentType(
  canEndorse,
  isAuthorResponseComment,
  isCommentActionOnAnnotation,
  annotation
) {
  return isAuthorResponseComment
    ? 'AuthorResponseComment'
    : annotation.type === REVIEWER_COMMENT && !isCommentActionOnAnnotation
    ? 'ReviewerComment'
    : annotation.type === REVISION_REQUEST_COMMENT &&
      !isCommentActionOnAnnotation
    ? 'RevisionRequestComment'
    : canEndorse
    ? 'EndorserComment'
    : 'Comment';
}
