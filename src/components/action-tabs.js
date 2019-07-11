import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { getId, textify } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import capitalize from 'lodash/capitalize';
import {
  BemTags,
  WorkflowParticipants,
  ExpansionPanelGroup,
  ExpansionPanel,
  ExpansionPanelPreview
} from '@scipe/ui';
import { ROLE_NAMES } from '../constants';
import LiveWorkflowAction from './live-workflow-action';
import { getActionsByStage } from '../utils/workflow';

export default class ActionTabs extends PureComponent {
  static propTypes = {
    user: PropTypes.object,
    graph: PropTypes.object,
    acl: PropTypes.object.isRequired,
    workflowSpecification: PropTypes.object,
    disabled: PropTypes.bool,
    periodical: PropTypes.object,
    actionMap: PropTypes.object,
    postWorkflowAction: PropTypes.func.isRequired,
    deleteWorkflowAction: PropTypes.func.isRequired,
    highlightWorkflowAction: PropTypes.func.isRequired,
    openWorkflowAction: PropTypes.func.isRequired,
    setEmailComposerData: PropTypes.func.isRequired
  };

  static defaultProps = {
    actionMap: {}
  };

  constructor(props) {
    super(props);
    const { user, acl } = props;
    const userRoles = acl.getActiveRoles(user);

    // start with the right tab open
    this.state = {
      tab:
        ROLE_NAMES.find(roleName => {
          return userRoles.some(role => role.roleName == roleName);
        }) || ROLE_NAMES[0],
      focusedTab: undefined
    };
  }

  handleClickTab(tab, e) {
    e.preventDefault();
    this.setState({ tab });
  }

  handleFocusTab(tab, e) {
    this.setState({ focusedTab: tab });
  }

  handleBlurTab(tab, e) {
    if (this.state.focusedTab === tab) {
      this.setState({ focusedTab: undefined });
    }
  }

  handleAction = (action, payload) => {
    const { graph, postWorkflowAction, setEmailComposerData } = this.props;
    if (
      action &&
      action['@type'] === 'InviteAction' &&
      action.actionStatus === 'ActiveActionStatus'
    ) {
      setEmailComposerData(action, payload);
    } else {
      postWorkflowAction(getId(graph), action, payload);
    }
  };

  handleDelete = action => {
    const { graph, deleteWorkflowAction } = this.props;
    deleteWorkflowAction(getId(graph), action);
  };

  render() {
    const { tab, focusedTab } = this.state;
    const {
      user,
      acl,
      graph,
      actionMap,
      disabled,
      periodical,
      workflowSpecification,
      highlightWorkflowAction,
      openWorkflowAction
    } = this.props;

    const actionsByStage = getActionsByStage(actionMap);

    const columnClass = roleName => (roleName === tab ? 'active' : 'inactive');
    const iconNameByRoleName = ROLE_NAMES.reduce(
      (iconNameByRoleName, roleName) => {
        iconNameByRoleName[roleName] =
          actionsByStage[0] &&
          actionsByStage[0].actions.some(action => {
            return (
              action.actionStatus !== 'CompletedActionStatus' &&
              ((action.agent && action.agent.roleName === roleName) ||
                (action.recipient && action.recipient.roleName === roleName))
            );
          })
            ? 'alert'
            : 'none';

        return iconNameByRoleName;
      },
      {}
    );

    const bem = BemTags();

    return (
      <div className={bem`action-tabs`}>
        <div className={bem`tab-headers__`} role="tablist">
          {ROLE_NAMES.map(roleName => (
            <header
              key={roleName}
              className={bem`__header --${
                tab === roleName ? 'active' : 'inactive'
              } ${focusedTab === roleName ? '--focused' : ''}`}
            >
              <h5 className={bem`__header-title`}>
                <a
                  href={`#${roleName}`}
                  className={bem`__header-title-link`}
                  onClick={this.handleClickTab.bind(this, roleName)}
                  onFocus={this.handleFocusTab.bind(this, roleName)}
                  onBlur={this.handleBlurTab.bind(this, roleName)}
                  role="tab"
                  aria-selected={tab === roleName ? 'true' : 'false'}
                >
                  <span className={bem`__header-title-text`}>
                    {' '}
                    {capitalize(roleName) + 's'}{' '}
                  </span>
                  <Iconoclass
                    customClassName={bem`__header-title-alert`}
                    iconName={iconNameByRoleName[roleName]}
                    iconSize={16}
                    size="12px"
                  />
                </a>
              </h5>
            </header>
          ))}
        </div>
        <div className={bem`rows --invites`}>
          {ROLE_NAMES.map(roleName => (
            <div
              key={roleName}
              className={bem`column --invites --${columnClass(roleName)}`}
            >
              <WorkflowParticipants
                user={user}
                graph={graph}
                acl={acl}
                disabled={disabled}
                periodical={periodical}
                workflowSpecification={workflowSpecification}
                inviteActions={Object.values(actionMap)}
                roleName={roleName}
                onAction={this.handleAction}
                onDelete={this.handleDelete}
              />
            </div>
          ))}
        </div>

        <ExpansionPanelGroup activeChild={graph.datePublished ? undefined : 0}>
          {actionsByStage.map(({ stage, actions }) => (
            <ExpansionPanel key={getId(stage)}>
              <ExpansionPanelPreview height="3.2rem">
                <Iconoclass
                  iconName={
                    actions.every(
                      action => action.actionStatus === 'CompletedActionStatus'
                    )
                      ? 'check'
                      : 'none'
                  }
                  round={actions.every(
                    action => action.actionStatus === 'CompletedActionStatus'
                  )}
                  size="1.8rem"
                  className={bem`__stage-status-icon`}
                />
                <div className={bem`__actions-preview`}>
                  {`${textify(
                    stage.name || stage.alternateName || 'Unnamed stage'
                  )} (${stage.identifier})`}
                </div>
                <div className={bem`__actions-spacer`} />
                <div className={bem`__actions-preview-bg__`}>
                  <div className={bem`__col`} />
                  <div className={bem`__col`} />
                  <div className={bem`__col`} />
                  <div className={bem`__col`} />
                </div>
              </ExpansionPanelPreview>

              <div className={bem`rows`}>
                {ROLE_NAMES.map(roleName => {
                  const roleActions = actions.filter(action => {
                    return (
                      action.actionStatus !== 'CanceledActionStatus' &&
                      ((action.agent && action.agent.roleName === roleName) ||
                        (action.recipient &&
                          action.recipient.roleName === roleName))
                    );
                  });
                  return (
                    <div
                      key={roleName}
                      className={bem`column --${columnClass(roleName)}`}
                    >
                      <ul className="sa__clear-list-styles">
                        {!roleActions.length && (
                          <li>
                            <div className="workflow-action workflow-action--no-actions">
                              No actions
                            </div>
                          </li>
                        )}
                        {roleActions.map(action => (
                          <li key={action['@id']}>
                            <LiveWorkflowAction
                              action={action}
                              disabled={disabled}
                              readOnly={disabled}
                              roleName={roleName}
                              stage={stage}
                              graph={graph}
                              acl={acl}
                              user={user}
                              onAction={this.handleAction}
                              onDelete={this.handleDelete}
                              onHover={highlightWorkflowAction}
                              onHoverOut={highlightWorkflowAction}
                              onOpen={openWorkflowAction}
                              onClose={openWorkflowAction}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </ExpansionPanel>
          ))}
        </ExpansionPanelGroup>
      </div>
    );
  }
}
