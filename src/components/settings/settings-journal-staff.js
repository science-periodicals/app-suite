import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import flatten from 'lodash/flatten';
import {
  createId,
  getActiveRoles,
  getAgentId,
  getObjectId
} from '@scipe/librarian';
import { getId } from '@scipe/jsonld';
import {
  PeriodicalContributorEditor,
  PeriodicalInviteEditor,
  PeriodicalApplicationHandler,
  PaperActionButton,
  PaperSelect,
  PaperButton,
  RichTextarea,
  BemTags
} from '@scipe/ui';
import {
  fetchActiveInvites,
  postInviteAction,
  deleteInviteAction
} from '../../actions/invite-action-creators';
import {
  postJournalStaffAction,
  updateJournal
} from '../../actions/journal-action-creators';
import {
  fetchActiveApplications,
  postAcceptRejectApplyAction
} from '../../actions/apply-action-creators';
import EmailComposerModal from '../email-composer-modal';
import {
  setEmailComposerData,
  deleteEmailComposerData
} from '../../actions/email-action-creators';

class SettingsJournalStaff extends Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    journal: PropTypes.object,
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,

    // redux
    inviteActions: PropTypes.arrayOf(PropTypes.object),
    applyActions: PropTypes.arrayOf(PropTypes.object),
    nextApplyActionUrls: PropTypes.string,
    updateStaffStatusMap: PropTypes.object,
    fetchActiveInvites: PropTypes.func,
    nextInvitesUrl: PropTypes.string,
    postJournalStaffAction: PropTypes.func,
    postInviteAction: PropTypes.func,
    postAcceptRejectApplyAction: PropTypes.func.isRequired,
    deleteInviteAction: PropTypes.func,
    postInviteActionStatusMap: PropTypes.object,
    setEmailComposerData: PropTypes.func.isRequired,
    deleteEmailComposerData: PropTypes.func.isRequired,
    fetchActiveApplications: PropTypes.func.isRequired,
    updateJournal: PropTypes.func.isRequired
  };

  static defaultProps = {
    updateStaffStatusMap: {},
    postInviteActionStatusMap: {}
  };

  static getDerivedStateFromProps(props, state) {
    if (props.journal !== state.lastJournal) {
      return {
        roleFilter: '*::*',
        newInviteActions: [],
        lastJournal: props.journal
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      roleFilter: '*::*',
      newInviteActions: [],
      lastJournal: props.journal
    };
  }

  componentDidMount() {
    const { journal, fetchActiveInvites, fetchActiveApplications } = this.props;
    fetchActiveInvites({ periodicalId: getId(journal), reset: true });
    fetchActiveApplications({ journalId: getId(journal), reset: true });
  }

  componentDidUpdate(prevProps) {
    const { journal, fetchActiveInvites, fetchActiveApplications } = this.props;
    if (prevProps.journal !== journal) {
      fetchActiveInvites({ periodicalId: getId(journal), reset: true });
      fetchActiveApplications({ journalId: getId(journal), reset: true });
    }
  }

  componentWillUnmount() {
    this.props.deleteEmailComposerData();
  }

  handleAction(agentId, action) {
    const { journal } = this.props;
    this.props.postJournalStaffAction(getId(journal), agentId, action);
  }

  handleInviteAction = action => {
    const { journal } = this.props;
    this.props.postInviteAction(action, getId(journal), {
      ifMatch: getId(journal)
    });
    this.handleCloseNewInvite(getId(action));
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

  handleNewInviteAction = action => {
    this.props.setEmailComposerData(action);
  };

  handleDeleteInviteAction = action => {
    this.props.deleteInviteAction(action);
  };

  handleCloseNewInvite = action => {
    this.setState({
      newInviteActions: this.state.newInviteActions.filter(
        newInviteAction => getId(newInviteAction) !== getId(action)
      )
    });
  };

  handleClickAddInvite = e => {
    const { journal, user } = this.props;
    this.setState({
      newInviteActions: this.state.newInviteActions.concat({
        '@id': createId('action', null, getId(journal))['@id'],
        '@type': 'InviteAction',
        agent: getId(user),
        object: getId(journal),
        actionStatus: 'PotentialActionStatus', // status will be set to `ActiveActionStatus` if user send the invite (status change is handled by `<PeriodicalInviteEditor />`)
        recipient: {
          '@type': 'ContributorRole',
          roleName: 'editor'
        },
        participant: [
          {
            '@type': 'Audience',
            audienceType: 'editor'
          },
          {
            '@type': 'Audience',
            audienceType: 'producer'
          }
        ]
      })
    });
  };

  handleChangeRoleFilter = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  handleMoreApplyActions = e => {
    const {
      nextApplyActionUrls,
      fetchActiveApplications,
      journal
    } = this.props;
    fetchActiveApplications({
      journalId: getId(journal),
      nextUrl: nextApplyActionUrls
    });
  };

  handleMoreInvites = e => {
    const { nextInvitesUrl, fetchActiveInvites, journal } = this.props;
    fetchActiveInvites({
      periodicalId: getId(journal),
      nextUrl: nextInvitesUrl
    });
  };

  handleApplication = action => {
    const { journal, postAcceptRejectApplyAction } = this.props;
    postAcceptRejectApplyAction(getId(journal), action);
  };

  handleUpdateMetadata = e => {
    const { journal, updateJournal } = this.props;
    e.preventDefault && e.preventDefault();

    updateJournal(getId(journal), {
      [e.target.name]: e.target.value
    });
  };

  render() {
    const bem = BemTags();

    const {
      journal,
      user,
      acl,
      disabled,
      readOnly,
      inviteActions,
      nextInvitesUrl,
      applyActions,
      nextApplyActionUrls,
      updateStaffStatusMap,
      postInviteActionStatusMap
    } = this.props;

    const { newInviteActions, roleFilter } = this.state;

    if (!journal) return null;

    const activeRoles = getActiveRoles(journal);

    const subtitleByRoleName = activeRoles.reduce((map, role) => {
      if (role.roleName) {
        map[role.roleName] = map[role.roleName] || [];
        if (role.name && !map[role.roleName].includes(role.name)) {
          map[role.roleName].push(role.name);
        }
      }
      return map;
    }, {});

    const options = flatten(
      Object.keys(subtitleByRoleName)
        .sort()
        .map(roleName => {
          return [[roleName, '*']].concat(
            subtitleByRoleName[roleName].map(name => [roleName, name])
          );
        })
    );

    const [filteredRoleName, filteredName] = roleFilter.split('::');

    const agentIds = Array.from(
      new Set(
        activeRoles
          .filter(role => {
            if (filteredRoleName === '*' && filteredName === '*') {
              return (
                role.roleName === 'editor' ||
                role.roleName === 'producer' ||
                role.roleName === 'reviewer'
              );
            } else if (filteredName === '*') {
              return role.roleName === filteredRoleName;
            } else {
              return (
                role.roleName === filteredRoleName && role.name === filteredName
              );
            }
          })
          .map(contributor => getAgentId(contributor))
          .filter(Boolean)
          .sort()
      )
    );

    return (
      <section className={bem`settings-journal-staff`}>
        <RichTextarea
          label="Editorial Board Description"
          name="editorialBoardDescription"
          defaultValue={journal.editorialBoardDescription}
          onSubmit={this.handleUpdateMetadata}
          disabled={disabled}
          readOnly={readOnly}
          large={true}
          className={bem`__rta`}
        />

        {!!agentIds.length && (
          <section className={bem`staff-group`}>
            <h3 className={bem`title`}>Active</h3>

            <div className={bem`__filter`}>
              <PaperSelect
                large={true}
                label="show"
                name="roleFilter"
                value={roleFilter}
                onChange={this.handleChangeRoleFilter}
                className={bem`__filter-select`}
              >
                <option value="*::*">All</option>
                {options.map(([roleName, name]) => (
                  <option
                    key={`${roleName}::${name}`}
                    value={`${roleName}::${name}`}
                  >
                    {name !== '*' ? `${name} (${roleName})` : roleName}
                  </option>
                ))}
              </PaperSelect>
            </div>

            <ul className={bem`list`}>
              {agentIds.map(agentId => (
                <li key={agentId} className={bem`list-item`}>
                  <PeriodicalContributorEditor
                    isProgressing={
                      updateStaffStatusMap[agentId] &&
                      updateStaffStatusMap[agentId].status === 'active'
                    }
                    periodical={journal}
                    user={user}
                    acl={acl}
                    disabled={disabled}
                    editedUserId={agentId}
                    onAction={this.handleAction.bind(this, agentId)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={bem`staff-group`}>
          <h3 className={bem`title`}>Invitees</h3>
          <ul className={bem`list`}>
            {inviteActions.map(inviteAction => (
              <li key={getId(inviteAction)} className={bem`list-item`}>
                <PeriodicalInviteEditor
                  periodical={journal}
                  user={user}
                  acl={acl}
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
              <li className={bem`list-item`} key={getId(newInviteAction)}>
                <PeriodicalInviteEditor
                  inviteAction={newInviteAction}
                  isNewInviteAction={true}
                  periodical={journal}
                  user={user}
                  acl={acl}
                  disabled={disabled}
                  onClose={this.handleCloseNewInvite}
                  onAction={this.handleNewInviteAction}
                  onChange={this.handleNewInviteChange}
                />
              </li>
            ))}

            <li className={bem`list-item --add-invite`}>
              <PaperActionButton
                onClick={this.handleClickAddInvite}
                disabled={
                  disabled || !acl.checkPermission(user, 'AdminPermission')
                }
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

        <section className={bem`staff-group`}>
          <h3 className={bem`title`}>Applicants</h3>

          <ul className={bem`list`}>
            {applyActions.map(applyAction => (
              <li className={bem`list-item`} key={getId(applyAction)}>
                <PeriodicalApplicationHandler
                  applyAction={applyAction}
                  periodical={journal}
                  user={user}
                  disabled={
                    disabled || !acl.checkPermission(user, 'AdminPermission')
                  }
                  onAction={this.handleApplication}
                />
              </li>
            ))}
          </ul>

          {!!nextApplyActionUrls && (
            <div className={bem`__more`}>
              <PaperButton onClick={this.handleMoreApplyActions}>
                More
              </PaperButton>
            </div>
          )}
        </section>
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => getId(props.journal),
    (state, props) => state.updateJournalStaffStatusMap[getId(props.journal)],
    state => state.postInviteActionStatusMap,
    state => state.activeInvites,
    state => state.activeApplications,
    (
      journalId,
      updateJournalStaffStatusMap,
      postInviteActionStatusMap,
      activeInvites,
      activeApplications
    ) => {
      return {
        postInviteActionStatusMap,
        updateStaffStatusMap: updateJournalStaffStatusMap,
        applyActions: activeApplications.data.filter(
          action =>
            action.actionStatus === 'ActiveActionStatus' && !action._deleted
        ),
        nextApplyActionUrls:
          activeApplications.data.length < activeApplications.numberOfItems
            ? activeApplications.nextUrl
            : null,
        inviteActions: activeInvites.data.filter(
          action =>
            action.actionStatus === 'ActiveActionStatus' &&
            !action._deleted &&
            getObjectId(action) === journalId
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
    fetchActiveApplications,
    postInviteAction,
    updateJournal,
    postAcceptRejectApplyAction,
    deleteInviteAction,
    postJournalStaffAction,
    setEmailComposerData,
    deleteEmailComposerData
  }
)(SettingsJournalStaff);
