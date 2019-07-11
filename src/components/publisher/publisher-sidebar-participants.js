import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import pluralize from 'pluralize';
import omit from 'lodash/omit';
import capitalize from 'lodash/capitalize';
import { getId, arrayify } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import {
  WorkflowParticipantsList,
  getWorkflowParticipantsAclData,
  Card,
  Modal,
  ControlPanel,
  PaperButton,
  WorkflowParticipantsHandler
} from '@scipe/ui';
import { getScopeId } from '@scipe/librarian';
import { ROLE_NAMES } from '../../constants';
import EmailComposer from '../email-composer';
import { createGraphAclSelector } from '../../selectors/graph-selectors';
import {
  postWorkflowAction,
  deleteWorkflowAction
} from '../../actions/workflow-action-creators';
import {
  setEmailComposerData,
  deleteEmailComposerData
} from '../../actions/email-action-creators';
import { StyleSection } from './publisher-sidebar';
import AssignableActionsPicker from '../assignable-actions-picker';
// TODO display rejected invites so that they are not re-invited...

class PublisherSidebarParticipants extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,

    graphId: PropTypes.string.isRequired,
    journalId: PropTypes.string.isRequired,
    stageId: PropTypes.string,

    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,

    // redux
    acl: PropTypes.object.isRequired,
    graph: PropTypes.object,
    inviteActions: PropTypes.arrayOf(PropTypes.object),
    journal: PropTypes.object,
    workflowSpecification: PropTypes.object,

    emailComposerData: PropTypes.shape({
      '@type': PropTypes.oneOf(['InviteAction']),
      potentialAction: PropTypes.shape({
        '@type': PropTypes.oneOf(['InformAction']),
        instrument: PropTypes.shape({
          '@type': PropTypes.oneOf(['EmailMessage']),
          description: PropTypes.string,
          text: PropTypes.oneOfType([
            PropTypes.shape({
              '@type': PropTypes.oneOf(['rdf:HTML']),
              '@value': PropTypes.string
            }),
            PropTypes.string
          ])
        }).isRequired
      }).isRequired
    }),

    postWorkflowAction: PropTypes.func.isRequired,
    deleteWorkflowAction: PropTypes.func.isRequired,
    setEmailComposerData: PropTypes.func.isRequired, // take an invite action and attach an InformAction with Email as potentialAction
    deleteEmailComposerData: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      isAddingRoleName: null,
      selectedUser: null
    };
  }

  handleAction = (action, payload) => {
    const {
      graph,
      postWorkflowAction,
      setEmailComposerData,
      deleteEmailComposerData
    } = this.props;

    if (
      action &&
      action['@type'] === 'InviteAction' &&
      action.actionStatus === 'ActiveActionStatus'
    ) {
      setEmailComposerData(action);
      this.setState({
        isAddingRoleName: action.recipient.roleName
      });
    } else {
      postWorkflowAction(getId(graph), action, payload);
      // close modal
      this.setState({
        isAddingRoleName: null,
        selectedUser: null
      });
      deleteEmailComposerData();
    }
  };

  handleSearchUserChange = (value, selectedUser) => {
    this.setState({ selectedUser });
  };

  handleEmailComposerAction = inviteAction => {
    const { graph, postWorkflowAction, deleteEmailComposerData } = this.props;

    postWorkflowAction(getId(graph), inviteAction);
    this.setState({
      isAddingRoleName: null,
      selectedUser: null
    });
    deleteEmailComposerData();
  };

  handleDelete = action => {
    const { graph, deleteWorkflowAction } = this.props;
    deleteWorkflowAction(getId(graph), action);
  };

  handleCancel = () => {
    const { deleteEmailComposerData } = this.props;
    this.setState({
      isAddingRoleName: null,
      selectedUser: null
    });
    deleteEmailComposerData();
  };

  handleAddParticipant(roleName) {
    this.setState({
      isAddingRoleName: roleName
    });
  }

  handleSelectedActionIdsChange = nextSelectedActionIds => {
    const { emailComposerData, setEmailComposerData } = this.props;

    setEmailComposerData(
      nextSelectedActionIds.length
        ? Object.assign({}, emailComposerData, {
            purpose: nextSelectedActionIds
          })
        : omit(emailComposerData, ['purpose'])
    );
  };

  render() {
    const {
      user,
      graphId,
      graph,
      acl,
      disabled,
      readOnly,
      journal,
      workflowSpecification,
      inviteActions,
      emailComposerData
    } = this.props;

    const { isAddingRoleName, selectedUser } = this.state;

    return (
      <StyleSection className="publisher-sidebar-participants">
        <div>
          {ROLE_NAMES.map(roleName => {
            const {
              participantNeeded,
              canAddParticipant
            } = getWorkflowParticipantsAclData(
              user,
              acl,
              roleName,
              workflowSpecification,
              graph
            );

            if (!participantNeeded) {
              return null;
            }

            return (
              <div
                key={roleName}
                className="publisher-sidebar-participants__role-group"
              >
                <header>
                  <div className="publisher-sidebar-participants__divider">
                    <span>{capitalize(pluralize(roleName))}</span>
                    {/* <Iconoclass
                         iconName="inbound"
                         className="publisher-sidebar-participants__divider__icon"
                         size="18px"
                         /> */}
                  </div>
                  {/* <div className="publisher-sidebar-participants__role-label">
                       {capitalize(pluralize(roleName))}
                       </div> */}
                </header>
                <div className="publisher-sidebar-participants__badge-group">
                  <WorkflowParticipantsList
                    user={user}
                    graph={acl.getScope()}
                    acl={acl}
                    disabled={disabled}
                    readOnly={readOnly}
                    periodical={journal}
                    workflowSpecification={workflowSpecification}
                    inviteActions={inviteActions}
                    roleName={roleName}
                    onAction={this.handleAction}
                    onDelete={this.handleDelete}
                  />

                  {canAddParticipant && !readOnly ? (
                    <Iconoclass
                      iconName="personAdd"
                      elementType="button"
                      onClick={this.handleAddParticipant.bind(this, roleName)}
                      title={`Add ${roleName || 'participant'}`}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}

          {isAddingRoleName && (
            <Modal>
              <Card className="publisher-sidebar-participants__invite-modal">
                {emailComposerData ? (
                  <EmailComposer
                    action={emailComposerData}
                    onAction={this.handleEmailComposerAction}
                    onCancel={this.handleCancel}
                  >
                    <AssignableActionsPicker
                      graphId={graphId}
                      roleName={isAddingRoleName}
                      subRoleName={
                        selectedUser &&
                        selectedUser.roleName &&
                        selectedUser.name
                      }
                      selectedActionIds={arrayify(emailComposerData.purpose)}
                      onChange={this.handleSelectedActionIdsChange}
                      disabled={disabled}
                    />
                  </EmailComposer>
                ) : (
                  <div className="publisher-sidebar-participants__invite-modal__content">
                    <header className="publisher-sidebar-participants__invite-modal__header">
                      {`Add ${
                        /^[aeiou]/.test(isAddingRoleName) ? 'an' : 'a'
                      } ${isAddingRoleName}`}
                    </header>
                    <div className="publisher-sidebar-participants__invite-modal__workflow-participants">
                      <WorkflowParticipantsList
                        user={user}
                        graph={acl.getScope()}
                        acl={acl}
                        disabled={disabled}
                        readOnly={readOnly}
                        periodical={journal}
                        workflowSpecification={workflowSpecification}
                        inviteActions={inviteActions}
                        roleName={isAddingRoleName}
                        onAction={this.handleAction}
                        onDelete={this.handleDelete}
                      />
                    </div>

                    <div className="publisher-sidebar-participants__invite-modal__workflow-participants-handler">
                      <WorkflowParticipantsHandler
                        user={user}
                        graph={acl.getScope()}
                        acl={acl}
                        disabled={disabled}
                        readOnly={readOnly}
                        periodical={journal}
                        inviteActions={inviteActions}
                        roleName={isAddingRoleName}
                        onAction={this.handleAction}
                        onChange={this.handleSearchUserChange}
                      />
                    </div>

                    <ControlPanel>
                      <PaperButton onClick={this.handleCancel}>
                        Cancel
                      </PaperButton>
                    </ControlPanel>
                  </div>
                )}
              </Card>
            </Modal>
          )}
        </div>
      </StyleSection>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => {
      return state.droplets[props.journalId];
    },
    (state, props) => {
      const scopeId = getScopeId(props.graphId);
      const scopeData = state.scopeMap[scopeId];
      if (scopeData && scopeData.graphMap) {
        if (scopeData.graphMap[scopeId]) {
          return scopeData.graphMap[scopeId].graph;
        }
      }
    },
    (state, props) => {
      const scopeData = state.scopeMap[getScopeId(props.graphId)];
      return scopeData && scopeData.actionMap;
    },
    (state, props) => {
      const scopeData = state.scopeMap[getScopeId(props.graphId)];
      return scopeData && scopeData.workflow;
    },
    createGraphAclSelector(),
    state => state.emailComposerData,
    (
      journal,
      graph,
      actionMap = {},
      workflowSpecification,
      acl,
      emailComposerData
    ) => {
      return {
        journal,
        graph,
        inviteActions: Object.values(actionMap).filter(
          action => action['@type'] === 'InviteAction'
        ),
        workflowSpecification,
        acl,
        emailComposerData
      };
    }
  ),
  {
    postWorkflowAction,
    deleteWorkflowAction,
    setEmailComposerData,
    deleteEmailComposerData
  }
)(PublisherSidebarParticipants);
