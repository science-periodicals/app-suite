import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import pick from 'lodash/pick';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import {
  bemify,
  PaperButton,
  ButtonMenu,
  MenuItem,
  ControlPanel
} from '@scipe/ui';
import {
  getAgentId,
  getGraphMainEntityContributorRoles,
  getScopeId
} from '@scipe/librarian';
import {
  createGraphDataSelector,
  createGraphAclSelector,
  createActionMapSelector
} from '../../selectors/graph-selectors';
import { postWorkflowAction } from '../../actions/workflow-action-creators';
import { postCheckAction } from '../../actions/check-action-creators';
import Iconoclass from '@scipe/iconoclass';

class PublisherJoinSubHeader extends React.Component {
  static propTypes = {
    graphId: PropTypes.string,
    history: PropTypes.object.isRequired,
    disabled: PropTypes.bool,

    // redux
    user: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,
    graph: PropTypes.object,
    contribRoles: PropTypes.arrayOf(PropTypes.object).isRequired,
    activeInviteActions: PropTypes.arrayOf(PropTypes.object).isRequired,
    activeCheckAction: PropTypes.object,
    postWorkflowAction: PropTypes.func.isRequired,
    postCheckAction: PropTypes.func.isRequired
  };

  handleJoin = e => {
    const { user, graphId, contribRoles, postWorkflowAction } = this.props;

    const role = contribRoles.find(role => getAgentId(role) == getId(user));
    if (role) {
      const joinAction = {
        '@type': 'JoinAction',
        actionStatus: 'CompletedActionStatus',
        agent: Object.assign(
          {
            '@type': 'ContributorRole'
          },
          pick(role, ['@type', 'roleName', 'name']),
          {
            agent: getId(user)
          }
        ),
        object: getScopeId(graphId)
      };

      postWorkflowAction(graphId, joinAction, { forceReloadOnSuccess: true });
    }
  };

  handleSign = e => {
    const { postCheckAction, activeCheckAction } = this.props;
    postCheckAction(
      Object.assign({}, activeCheckAction, {
        actionStatus: 'CompletedActionStatus'
      })
    );
  };

  handleDeny = e => {
    const { postCheckAction, activeCheckAction, history } = this.props;
    postCheckAction(
      Object.assign({}, activeCheckAction, {
        actionStatus: 'FailedActionStatus'
      }),
      { history, nextLocationOnSuccess: '/' }
    );
  };

  handleAcceptInvite(inviteAction) {
    const { user, graphId, postWorkflowAction } = this.props;
    const acceptAction = {
      '@type': 'AcceptAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: getId(inviteAction)
    };
    postWorkflowAction(graphId, acceptAction, { forceReloadOnSuccess: true });
  }

  handleRejectInvite(inviteAction) {
    const { user, graphId, postWorkflowAction } = this.props;
    const rejectAction = {
      '@type': 'RejectAction',
      actionStatus: 'CompletedActionStatus',
      agent: getId(user),
      object: getId(inviteAction)
    };
    postWorkflowAction(graphId, rejectAction, { forceReloadOnSuccess: true });
  }

  render() {
    const {
      user,
      disabled,
      acl,
      graph,
      activeInviteActions,
      activeCheckAction,
      contribRoles
    } = this.props;

    if (!getId(user) || !graph) {
      return null;
    }

    // Note: we use `acl` to get the active roles and not `graph` as `graph` can
    // be a release and we need to get access to the live graph to have latest data
    const isInGraph = acl
      .getActiveRoles(user, { ignoreEndDateOnPublicationOrRejection: true })
      .some(role => getAgentId(role) === getId(user));

    if (isInGraph && !activeCheckAction && !activeInviteActions.length) {
      return null;
    }

    const bem = bemify('publisher-join-sub-header');

    const contribRole = contribRoles.find(
      role => getAgentId(role) == getId(user)
    );

    // Article author or contrib has accepted check action but hasn't joined the graph, we offer him to join
    if (contribRole && !activeInviteActions.length && !activeCheckAction) {
      return (
        <div className={bem``}>
          <Iconoclass
            iconName="warning"
            round={true}
            size="1.6rem"
            className={bem`__icon`}
          />
          <span className={bem`__text`}>
            You currently only have read access to the submission join to get
            write access
          </span>
          <ControlPanel>
            <PaperButton disabled={disabled} onClick={this.handleJoin}>
              Join
            </PaperButton>
          </ControlPanel>
        </div>
      );
    }

    // CheckAction we offer to sign or decline (note that we do _not_ offer to join, that will be done after the check action is completed or denyied)
    if (activeCheckAction) {
      return (
        <div className={bem``}>
          <Iconoclass
            iconName="warning"
            round={true}
            size="1.6rem"
            className={bem`__icon`}
          />
          <span className={bem`__text`}>You are credited as a contributor</span>
          <ControlPanel>
            <PaperButton disabled={disabled} onClick={this.handleDeny}>
              Deny
            </PaperButton>
            <PaperButton disabled={disabled} onClick={this.handleSign}>
              Confirm
            </PaperButton>
          </ControlPanel>
        </div>
      );
    }

    if (activeInviteActions.length) {
      return (
        <div className={bem``}>
          {activeInviteActions.length > 1 ? (
            <Fragment>
              <Iconoclass
                iconName="warning"
                round={true}
                size="1.6rem"
                className={bem`__icon`}
              />
              <span className={bem`__text`}>
                You have been invited to the submission
              </span>
              <ControlPanel>
                <ButtonMenu>
                  <span>Reject As…</span>
                  {activeInviteActions.map(inviteAction => (
                    <MenuItem
                      disabled={disabled}
                      key={getId(inviteAction)}
                      onClick={this.handleRejectInvite.bind(this, inviteAction)}
                    >
                      {getDisplayRoleName(inviteAction.recipient)}
                    </MenuItem>
                  ))}
                </ButtonMenu>

                <ButtonMenu>
                  <span>Accept As…</span>
                  {activeInviteActions.map(inviteAction => (
                    <MenuItem
                      disabled={disabled}
                      key={getId(inviteAction)}
                      onClick={this.handleAcceptInvite.bind(this, inviteAction)}
                    >
                      {getDisplayRoleName(inviteAction.recipient)}
                    </MenuItem>
                  ))}
                </ButtonMenu>
              </ControlPanel>
            </Fragment>
          ) : (
            <Fragment>
              <span className={bem`__text`}>
                <Iconoclass
                  iconName="warning"
                  round={true}
                  size="1.6rem"
                  className={bem`__icon`}
                />
                <span>
                  You have been invited to the submission as{' '}
                  <strong>
                    {getDisplayRoleName(activeInviteActions[0].recipient)}
                  </strong>
                </span>
              </span>

              <ControlPanel>
                <PaperButton
                  disabled={disabled}
                  onClick={this.handleRejectInvite.bind(
                    this,
                    activeInviteActions[0]
                  )}
                >
                  Reject
                </PaperButton>
                <PaperButton
                  disabled={disabled}
                  onClick={this.handleAcceptInvite.bind(
                    this,
                    activeInviteActions[0]
                  )}
                >
                  Accept
                </PaperButton>
              </ControlPanel>
            </Fragment>
          )}
        </div>
      );
    }

    return null;
  }
}

export default connect(
  createSelector(
    state => state.user,
    createGraphAclSelector(),
    createGraphDataSelector(),
    createActionMapSelector(),
    (user, acl, graphData = {}, actionMap = {}) => {
      const activeInviteActions = Object.values(actionMap).filter(
        action =>
          action['@type'] === 'InviteAction' &&
          action.actionStatus === 'ActiveActionStatus' &&
          getAgentId(action.recipient) === getId(user)
      );

      const activeCheckAction = Object.values(actionMap).find(
        action =>
          action['@type'] === 'CheckAction' &&
          action.actionStatus === 'ActiveActionStatus' &&
          getAgentId(action.agent) === getId(user)
      );

      const graph = graphData && graphData.graph;
      const contribRoles = getGraphMainEntityContributorRoles(graph, {
        rootOnly: true
      });

      return {
        user,
        graph,
        acl,
        contribRoles,
        activeInviteActions,
        activeCheckAction
      };
    }
  ),
  { postWorkflowAction, postCheckAction }
)(PublisherJoinSubHeader);

function getDisplayRoleName(recipient = {}) {
  return recipient.name
    ? `${recipient.name} (${recipient.roleName})`
    : recipient.roleName;
}
