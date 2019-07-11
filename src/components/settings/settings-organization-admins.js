import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import {
  bemify,
  OrganizationMemberEditor,
  OrganizationInviteEditor,
  PaperButton,
  PaperActionButton
} from '@scipe/ui';
import {
  ORGANIZATION_ADMIN_ROLE_NAME,
  getActiveRoles,
  getAgentId,
  getObjectId,
  createId
} from '@scipe/librarian';
import EmailComposerModal from '../email-composer-modal';
import {
  setEmailComposerData,
  deleteEmailComposerData
} from '../../actions/email-action-creators';
import {
  fetchActiveInvites,
  postInviteAction,
  deleteInviteAction
} from '../../actions/invite-action-creators';
import { postOrganizationMemberAction } from '../../actions/organization-action-creators';

class SettingsOrganizationAdmins extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool,
    organization: PropTypes.object,

    // redux
    inviteActions: PropTypes.arrayOf(PropTypes.object),
    nextInvitesUrl: PropTypes.string,
    postInviteActionStatus: PropTypes.object,
    postInviteActionStatusMap: PropTypes.object,
    postOrganizationMemberAction: PropTypes.func.isRequired,
    fetchActiveInvites: PropTypes.func.isRequired,
    postInviteAction: PropTypes.func.isRequired,
    deleteInviteAction: PropTypes.func.isRequired,
    setEmailComposerData: PropTypes.func.isRequired,
    deleteEmailComposerData: PropTypes.func.isRequired
  };

  static defaultProps = {
    inviteActions: [],
    postInviteActionStatusMap: {}
  };

  static getDerivedStateFromProps(props, state) {
    if (props.organization !== state.lastOrganization) {
      return {
        newInviteActions: [],
        lastOrganization: props.organization
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      newInviteActions: [],
      lastOrganization: props.organization
    };
  }

  componentDidMount() {
    const { organization, fetchActiveInvites } = this.props;
    fetchActiveInvites({ organizationId: getId(organization), reset: true });
  }

  componentDidUpdate(prevProps) {
    const { organization, fetchActiveInvites } = this.props;
    if (getId(prevProps.organization) !== getId(organization)) {
      fetchActiveInvites({ organizationId: getId(organization), reset: true });
    }
  }

  componentWillUnmount() {
    const { deleteEmailComposerData } = this.props;
    deleteEmailComposerData();
  }

  handleAction = action => {
    const { postOrganizationMemberAction, organization } = this.props;
    postOrganizationMemberAction(getId(organization), action);
  };

  handleClickAddInvite = e => {
    const { organization, user } = this.props;
    const role = getActiveRoles(organization).find(
      role =>
        role.roleName === ORGANIZATION_ADMIN_ROLE_NAME &&
        getAgentId(role) == getId(user)
    );

    this.setState({
      newInviteActions: this.state.newInviteActions.concat({
        '@id': createId('action', null, getId(organization))['@id'],
        '@type': 'InviteAction',
        agent: getId(role),
        object: getId(organization),
        actionStatus: 'PotentialActionStatus', // status will be set to `ActiveActionStatus` if user send the invite (status change is handled by `<OrganizationInviteEditor />`)
        recipient: {
          '@type': 'ContributorRole',
          roleName: ORGANIZATION_ADMIN_ROLE_NAME
        }
      })
    });
  };

  handleNewInviteChange = nextInviteAction => {
    this.setState({
      newInviteActions: this.state.newInviteActions.map(action => {
        if (getId(action) === getId(nextInviteAction)) {
          return nextInviteAction;
        }
        return action;
      })
    });
  };

  handleCloseNewInvite = action => {
    this.setState({
      newInviteActions: this.state.newInviteActions.filter(
        newInviteAction => getId(newInviteAction) !== getId(action)
      )
    });
  };

  handleNewInviteAction = action => {
    this.props.setEmailComposerData(action);
  };

  handleInviteAction = action => {
    const { organization, postInviteAction } = this.props;
    postInviteAction(action, getId(organization), {
      ifMatch: getId(organization)
    });
    this.handleCloseNewInvite(getId(action));
  };

  handleDeleteInviteAction = action => {
    const { deleteInviteAction } = this.props;
    deleteInviteAction(action);
  };

  handleMoreInvites = e => {
    const { nextInvitesUrl, fetchActiveInvites, organization } = this.props;
    fetchActiveInvites({
      organizationId: getId(organization),
      nextUrl: nextInvitesUrl
    });
  };

  render() {
    const {
      user,
      organization,
      disabled,
      inviteActions,
      nextInvitesUrl,
      postInviteActionStatusMap
    } = this.props;
    const { newInviteActions } = this.state;

    if (!organization) return null;

    const bem = bemify('settings-organization-admins');

    const adminIds = getActiveRoles(organization)
      .filter(role => role.roleName === ORGANIZATION_ADMIN_ROLE_NAME)
      .map(getAgentId);

    return (
      <section className={bem``}>
        <section>
          <h3 className={bem`__title`}>Administrators</h3>

          <ul className={bem`__list`}>
            {adminIds.map(adminId => (
              <li key={adminId} className={bem`__list-item`}>
                <OrganizationMemberEditor
                  organization={organization}
                  user={user}
                  disabled={disabled}
                  editedUserId={adminId}
                  isProgressing={false}
                  onAction={this.handleAction}
                />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className={bem`__title`}>Invitees</h3>

          <ul className={bem`__list`}>
            {inviteActions.map(inviteAction => (
              <li key={getId(inviteAction)} className={bem`__list-item`}>
                <OrganizationInviteEditor
                  organization={organization}
                  user={user}
                  disabled={disabled}
                  inviteAction={inviteAction}
                  onDelete={this.handleDeleteInviteAction}
                  onAction={this.handleInviteAction}
                  isProgressing={
                    (postInviteActionStatusMap[getId(inviteAction)] || {})
                      .status === 'active'
                  }
                />
              </li>
            ))}

            {newInviteActions.map(newInviteAction => (
              <li className={bem`__list-item`} key={getId(newInviteAction)}>
                <OrganizationInviteEditor
                  inviteAction={newInviteAction}
                  isNewInviteAction={true}
                  organization={organization}
                  isProgressing={
                    (postInviteActionStatusMap[getId(newInviteAction)] || {})
                      .status === 'active'
                  }
                  user={user}
                  disabled={disabled}
                  onClose={this.handleCloseNewInvite}
                  onAction={this.handleNewInviteAction}
                  onChange={this.handleNewInviteChange}
                />
              </li>
            ))}

            <li className={bem`__list-item __list-item--add-invite`}>
              <PaperActionButton
                onClick={this.handleClickAddInvite}
                disabled={disabled}
                large={false}
              />
            </li>
          </ul>

          {!!nextInvitesUrl && (
            <div className={bem`__more`}>
              <PaperButton onClick={this.handleMoreInvites}>More</PaperButton>
            </div>
          )}

          <EmailComposerModal onAction={this.handleInviteAction} />
        </section>
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => getId(props.organization),
    state => state.postInviteActionStatusMap,
    state => state.activeInvites,
    (organizationId, postInviteActionStatusMap, activeInvites) => {
      return {
        postInviteActionStatusMap,
        inviteActions: activeInvites.data.filter(
          action =>
            action.actionStatus === 'ActiveActionStatus' &&
            !action._deleted &&
            getObjectId(action) === organizationId
        ),
        nextInvitesUrl:
          activeInvites.data.length < activeInvites.numberOfItems
            ? activeInvites.nextUrl
            : null
      };
    }
  ),
  {
    fetchActiveInvites,
    postInviteAction,
    deleteInviteAction,
    setEmailComposerData,
    deleteEmailComposerData,
    postOrganizationMemberAction
  }
)(SettingsOrganizationAdmins);
