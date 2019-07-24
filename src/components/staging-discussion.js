import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import Iconoclass from '@scipe/iconoclass';
import { getId, textify, unprefix } from '@scipe/jsonld';
import {
  getLocationIdentifier,
  getObjectId,
  getActiveAudience,
  getScopeId,
  getVersion,
  getAgentId,
  getStageActions,
  getStageId,
  remapRole
} from '@scipe/librarian';
import {
  AutoAbridge,
  RichTextarea,
  UserBadgeMenu,
  getDisplayName,
  getUserBadgeLabel,
  MenuItem,
  ControlPanel,
  PaperButton,
  Tooltip,
  bemify
} from '@scipe/ui';
import {
  createCommentMapSelector,
  createActionMapSelector,
  createGraphAclSelector,
  locationAutocompleteDataSelector
} from '../selectors/graph-selectors';
import Notice from './notice';
import Annotable from './annotable';
import { getWorkflowAction, getPotentialAgents } from '../utils/workflow';
import ScrollLink from './scroll-link';
import {
  createCommentAction,
  updateCommentAction,
  deleteCommentAction
} from '../actions/comment-action-creators';
import {
  getInnerMostSelector,
  getSelectorGraphParam,
  getRelativeLocationLink,
  prettifyLocation,
  checkIfSelectorTargetExists
} from '../utils/annotations';
import { compareCommentsByIdentifiersAndDateCreated } from '../utils/sort';
import Counter from '../utils/counter';
import { WARNING_ACTIVATE_OFFLINE_COMMENT_ACTION } from '../constants';

class StagingDiscussion extends React.Component {
  static propTypes = {
    shellified: PropTypes.bool,
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired,
    blindingData: PropTypes.object.isRequired,

    counter: PropTypes.instanceOf(Counter).isRequired,

    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,

    search: PropTypes.string,

    // redux
    user: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,
    action: PropTypes.object.isRequired,

    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    generalCommentActions: PropTypes.arrayOf(PropTypes.object).isRequired,
    inContextCommentActions: PropTypes.arrayOf(PropTypes.object).isRequired,
    canEndorse: PropTypes.bool,
    canComment: PropTypes.bool,

    createCommentAction: PropTypes.func.isRequired,
    updateCommentAction: PropTypes.func.isRequired,
    deleteCommentAction: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (
      props.action !== state.lastAction ||
      props.user !== state.lastUser ||
      props.acl !== state.lastAcl
    ) {
      return {
        agentId: getId(
          getPotentialAgents(props.user, props.acl, props.action)[0]
        ),
        text: '',
        lastAction: props.action,
        lastUser: props.user,
        lastAcl: props.acl
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    const { acl, user, action } = props;

    this.newCommentRef = React.createRef();

    this.state = {
      agentId: getId(getPotentialAgents(user, acl, action)[0]),
      text: '',
      lastAction: action,
      lastAcl: acl,
      lastUser: user
    };
  }

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

  handleCancel = e => {
    const { user, acl, action } = this.props;

    this.setState({
      agentId: getId(getPotentialAgents(user, acl, action)[0]),
      text: ''
    });
    if (this.newCommentRef.current) {
      this.newCommentRef.current.reset();
    }
  };

  handleUpdate(commentAction, e) {
    const { graphId, updateCommentAction } = this.props;
    updateCommentAction(graphId, commentAction, e.target.value);
  }

  handleDelete(commentAction, e) {
    const { graphId, deleteCommentAction } = this.props;
    deleteCommentAction(graphId, commentAction);
  }

  handleSubmit = e => {
    const {
      graphId,
      user,
      acl,
      action,
      createCommentAction,
      canEndorse
    } = this.props;
    const { agentId } = this.state;

    if (this.newCommentRef.current) {
      createCommentAction(graphId, {
        agent: remapRole(acl.findRole(agentId), 'agent'),
        commentType: canEndorse ? 'EndorserComment' : 'Comment',
        text: this.newCommentRef.current.getNextDefaultValue(),
        commentActionObject: action
      });

      this.setState({
        agentId: getId(getPotentialAgents(user, acl, action)[0]),
        text: ''
      });

      this.newCommentRef.current.reset();
    }
  };

  render() {
    const {
      user,
      counter,
      shellified,
      acl,
      disabled,
      readOnly,
      journalId,
      graphId,
      canEndorse,
      canComment,
      action,
      generalCommentActions,
      inContextCommentActions,
      blindingData,
      search,
      locationOptions
    } = this.props;

    const { agentId, text } = this.state;

    const audiences = getActiveAudience(action);

    const roles = getPotentialAgents(user, acl, action);
    const agent = acl.findRole(agentId) || {};

    const bem = bemify('staging-discussion');

    const commentActionCounter = counter.increment({
      level: 3,
      value: getLocationIdentifier(action['@type'], 'potentialAction'),
      key: `staging-discussion-${getId(action)}-potentialAction`
    });

    return (
      <div className={bem``}>
        <Notice>
          <div>
            Comments{' '}
            {generalCommentActions.length || inContextCommentActions.length
              ? 'are'
              : 'will be'}{' '}
            visible to{' '}
            <ul className="sa__inline-list">
              {audiences.map(audience => (
                <li key={audience.audienceType}>{audience.audienceType}s</li>
              ))}
            </ul>{' '}
            only
          </div>
        </Notice>

        {!!(generalCommentActions.length || canComment) && (
          <section>
            <h4 className="annotable-action__sub-title">General Comments</h4>

            <ul className="sa__clear-list-styles">
              {generalCommentActions.map(commentAction => {
                const canEditComment =
                  canComment &&
                  acl.checkPermission(user, 'PerformActionPermission', {
                    action: commentAction
                  });
                const canDeleteComment =
                  canComment &&
                  acl.checkPermission(user, 'DeleteActionPermission', {
                    action: commentAction
                  });

                return (
                  <li key={getId(commentAction)}>
                    <Annotable
                      graphId={graphId}
                      selectable={false}
                      annotable={false}
                      counter={commentActionCounter.increment({
                        level: 4,
                        key: `staging-discussion-${getId(
                          action
                        )}-potentialAction-${getId(commentAction)}`
                      })}
                      displayPermalink={!shellified}
                      displayAnnotations={!shellified}
                      info={getInfo(action, commentAction)}
                      selector={{
                        '@type': 'NodeSelector',
                        graph: getSelectorGraphParam(action),
                        node: getId(action),
                        selectedProperty: 'potentialAction',
                        selectedItem: getId(commentAction)
                      }}
                    >
                      <div className={bem`__general-comment-item`}>
                        <UserBadgeMenu
                          size={24}
                          align="left"
                          statusIconName={
                            commentAction.resultComment['@type'] ===
                            'EndorserComment'
                              ? 'thumbUp'
                              : undefined
                          }
                          anonymous={blindingData.isBlinded(
                            commentAction.agent
                          )}
                          userId={getAgentId(
                            blindingData.resolve(commentAction.agent)
                          )}
                          name={getDisplayName(
                            blindingData,
                            commentAction.agent,
                            {
                              addRoleNameSuffix: true
                            }
                          )}
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

                        <RichTextarea
                          name="text"
                          label="Comment"
                          disabled={disabled || !canEditComment}
                          readOnly={readOnly}
                          onSubmit={this.handleUpdate.bind(this, commentAction)}
                          defaultValue={commentAction.resultComment.text}
                          options={locationOptions}
                          suggestionMapper={location =>
                            getRelativeLocationLink(
                              getVersion(getSelectorGraphParam(action)),
                              location
                            )
                          }
                        />

                        {!readOnly &&
                          action.actionStatus === 'StagedActionStatus' && (
                            <Iconoclass
                              iconName={
                                canDeleteComment
                                  ? 'delete'
                                  : 'none' /*none is to keep the same spacing in case user cannot delete some comments (the deletable one will have the delete icon)*/
                              }
                              disabled={disabled || !canDeleteComment}
                              behavior="button"
                              onClick={this.handleDelete.bind(
                                this,
                                commentAction
                              )}
                            />
                          )}

                        {action.actionStatus !== 'StagedActionStatus' &&
                          commentAction.actionStatus ===
                            'PotentialActionStatus' && (
                            <Tooltip displayText="Comment was not shared">
                              <Iconoclass
                                iconName="warningTriangle"
                                behavior="passive"
                              />
                            </Tooltip>
                          )}
                      </div>
                    </Annotable>
                  </li>
                );
              })}

              {/* Controls to create a new general comment */}
              {(!readOnly || canComment) && (
                <li>
                  <div
                    className={bem`__general-comment-item __general-comment-item--new`}
                  >
                    <UserBadgeMenu
                      align="left"
                      size={24}
                      statusIconName={canEndorse ? 'thumbUp' : undefined}
                      anonymous={blindingData.isBlinded(agent)}
                      userId={getAgentId(blindingData.resolve(agent))}
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
                              onClick={this.handleSelectAgentRole.bind(
                                this,
                                role
                              )}
                              disabled={disabled || !canComment}
                              icon={{
                                iconName:
                                  getId(role) === agentId ? 'check' : 'none',
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

                    <RichTextarea
                      name="text"
                      label="Add comment"
                      ref={this.newCommentRef}
                      disabled={disabled || !canComment}
                      readOnly={readOnly}
                      onChange={this.handleChange}
                      defaultValue={''}
                      options={locationOptions}
                      suggestionMapper={location =>
                        getRelativeLocationLink(
                          getVersion(getSelectorGraphParam(action)),
                          location
                        )
                      }
                    />

                    {/* spacer */}
                    <Iconoclass
                      iconName="none"
                      disabled={disabled}
                      behavior="button"
                    />
                  </div>

                  <ControlPanel>
                    <PaperButton onClick={this.handleCancel} disabled={!text}>
                      Cancel
                    </PaperButton>
                    <PaperButton
                      onClick={this.handleSubmit}
                      disabled={
                        disabled ||
                        readOnly ||
                        !(text && agentId) ||
                        !canComment
                      }
                    >
                      Submit
                    </PaperButton>
                  </ControlPanel>
                </li>
              )}
            </ul>
          </section>
        )}

        {!!inContextCommentActions.length && (
          <section>
            <h4 className="annotable-action__sub-title">Contextual Comments</h4>

            <ul className="sa__clear-list-styles">
              {inContextCommentActions.map(commentAction => {
                const identifier =
                  commentAction.object && commentAction.object.identifier;

                return (
                  <li
                    key={getId(commentAction)}
                    className={bem`__in-context-comment-item`}
                  >
                    <UserBadgeMenu
                      size={24}
                      align="left"
                      statusIconName={
                        commentAction.resultComment['@type'] ===
                        'EndorserComment'
                          ? 'thumbUp'
                          : undefined
                      }
                      anonymous={blindingData.isBlinded(commentAction.agent)}
                      userId={getAgentId(
                        blindingData.resolve(commentAction.agent)
                      )}
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

                    <AutoAbridge ellipsis={true}>
                      {textify(commentAction.resultComment.text)}
                    </AutoAbridge>

                    {!!identifier && (
                      <ScrollLink
                        commentId={getId(commentAction.resultComment)}
                        preventLinkInterceptor={true}
                        to={{
                          pathname: `/${unprefix(journalId)}/${unprefix(
                            getScopeId(graphId)
                          )}/submission`,
                          search: search
                            ? `?${querystring.stringify(
                                Object.assign(
                                  querystring.parse(search.substring(1)),
                                  {
                                    version: getVersion(
                                      getInnerMostSelector(
                                        commentAction.object.hasSelector
                                      ).graph
                                    )
                                  }
                                )
                              )}`
                            : undefined,
                          hash: identifier ? `#${identifier}` : undefined
                        }}
                      >
                        <span className="action-annotation-preview-list__number">
                          <span>{prettifyLocation(identifier)}</span>
                        </span>
                      </ScrollLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    (state, props) => props.actionId,
    createGraphAclSelector(),
    createActionMapSelector(),
    createCommentMapSelector(),
    (state, props) => state.scopeMap[getScopeId(props.graphId)].graphMap,
    state => state.contentMap,
    locationAutocompleteDataSelector,
    (
      user,
      actionId,
      acl,
      actionMap,
      commentMap,
      graphMap,
      contentMap,
      locationOptions
    ) => {
      const action = getWorkflowAction(actionId, { user, acl, actionMap });

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

      const commentActions = Object.values(commentMap).filter(
        commentAction => getObjectId(commentAction) === actionId
      );

      const generalCommentActions = commentActions
        .filter(commentAction => !commentAction.object.hasSelector)
        .sort((a, b) => {
          return (
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        });

      // We filter out comments targetting content that is no longer on the screen
      // e.g. user comments on a paragraph and author upload a revision with that
      // paragraph deleted
      const inContextCommentActions = commentActions
        .filter(
          commentAction =>
            commentAction.object.hasSelector &&
            checkIfSelectorTargetExists(
              commentAction.object.hasSelector,
              { actionMap, graphMap },
              contentMap
            )
        )
        .sort(compareCommentsByIdentifiersAndDateCreated);

      // TODO fix
      console.log({ commentActions, inContextCommentActions });

      const canComment =
        action.actionStatus === 'StagedActionStatus' &&
        (acl.checkPermission(user, 'PerformActionPermission', {
          action
        }) ||
          acl.checkPermission(user, 'ViewActionPermission', {
            action
          }));

      return {
        user,
        acl,
        action,
        generalCommentActions,
        inContextCommentActions,
        locationOptions,
        canComment,
        canEndorse
      };
    }
  ),
  { createCommentAction, updateCommentAction, deleteCommentAction }
)(StagingDiscussion);

function getInfo(action, commentAction) {
  if (
    action.actionStatus === 'StagedActionStatus' &&
    commentAction.actionStatus === 'PotentialActionStatus'
  ) {
    return WARNING_ACTIVATE_OFFLINE_COMMENT_ACTION;
  }
}
