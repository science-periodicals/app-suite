import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, arrayify, unprefix } from '@scipe/jsonld';
import { escapeLucene, getActiveRoles, getAgentId } from '@scipe/librarian';
import {
  Modal,
  Card,
  ControlPanel,
  PaperButton,
  PaperButtonLink,
  PaperSelect,
  DateFromNow,
  Hyperlink,
  bemify,
  resetSubdomain
} from '@scipe/ui';
import Notice from './notice';
import { applyToJournal } from '../actions/journal-action-creators';
import Search from './search';

// TODO handle next links for Login and register cases

class ApplyModalForm extends React.Component {
  static propTypes = {
    fromSubdomain: PropTypes.bool,
    journal: PropTypes.shape({
      '@type': PropTypes.oneOf(['Periodical'])
    }).isRequired,
    prevApplyActions: PropTypes.arrayOf(PropTypes.object),
    onClose: PropTypes.func.isRequired,

    // redux
    user: PropTypes.object.isRequired,
    applyToJournal: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (
      props.prevApplyActions !== state.lastPrevApplyActions ||
      props.journal !== state.lastJournal ||
      props.user !== state.lastUser
    ) {
      const potentialRoleNames = getPotentialRolenames(
        props.user,
        props.journal,
        arrayify(props.prevApplyActions)
          .concat(state.applyActions)
          .filter(Boolean)
      );

      return {
        roleName: potentialRoleNames.includes(state.roleName)
          ? state.roleName
          : potentialRoleNames[0],
        lastPrevApplyActions: props.prevApplyActions,
        lastJournal: props.journal,
        lastUser: props.user
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      roleName: getPotentialRolenames(
        props.user,
        props.journal,
        props.prevApplyActions
      )[0],
      isApplying: false,
      applyActions: [], // keep track of all the Apply Actions created during the lifecycle of the Modal (for instance user can apply to be editor, then reviewer then producer)
      error: null,
      lastPrevApplyActions: props.prevApplyActions,
      lastJournal: props.journal,
      lastUser: props.user
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleClose = e => {
    const { onClose } = this.props;
    onClose();
  };

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = e => {
    const { journal, user, applyToJournal, prevApplyActions } = this.props;
    const { roleName, applyActions } = this.state;

    applyToJournal(getId(user), getId(journal), { roleName })
      .then(applyAction => {
        if (this._isMounted) {
          const potentialRoleNames = getPotentialRolenames(
            user,
            journal,
            arrayify(prevApplyActions)
              .concat(applyActions)
              .concat(applyAction)
              .filter(Boolean)
          );

          this.setState({
            isApplying: false,
            error: null,
            applyActions: this.state.applyActions.concat(applyAction),
            roleName: potentialRoleNames.includes(this.state.roleName)
              ? this.state.roleName
              : potentialRoleNames[0]
          });
        }
      })
      .catch(err => {
        if (this._isMounted) {
          this.setState({ isApplying: false, error: err });
        }
      });
  };

  render() {
    const bem = bemify('apply-modal-form');
    const { fromSubdomain, user, journal, prevApplyActions } = this.props;
    const { roleName, applyActions, isApplying } = this.state;

    const allApplyActions = arrayify(prevApplyActions)
      .concat(applyActions)
      .filter(Boolean);

    const potentialRoleNames = getPotentialRolenames(
      user,
      journal,
      allApplyActions
    );

    return (
      <div>
        <header>
          <h3 className={bem`__title`}>Join</h3>
        </header>

        <Notice>
          <span>
            The journal will review your application based on your{' '}
            <Hyperlink page="user" role={user} reset={fromSubdomain}>
              profile
            </Hyperlink>
            .
          </span>
        </Notice>

        {!!(allApplyActions && allApplyActions.length) && (
          <Notice iconName="hourglassOutline">
            <ul className="sa__clear-list-styles">
              {allApplyActions.map(applyAction => (
                <li key={getId(applyAction)}>
                  You applied as <strong>{applyAction.agent.roleName}</strong>{' '}
                  <DateFromNow>{applyAction.startTime}</DateFromNow>{' '}
                  (application #{unprefix(getId(applyAction))})
                </li>
              ))}
            </ul>
          </Notice>
        )}

        {!!potentialRoleNames.length && (
          <PaperSelect
            label="Apply as"
            value={roleName}
            name="roleName"
            onChange={this.handleChange}
          >
            {potentialRoleNames.map(roleName => (
              <option key={roleName} value={roleName}>
                {roleName}
              </option>
            ))}
          </PaperSelect>
        )}

        <ControlPanel>
          <PaperButton disabled={isApplying} onClick={this.handleClose}>
            Close
          </PaperButton>

          {!!potentialRoleNames.length && (
            <PaperButton
              type="submit"
              disabled={!potentialRoleNames.length || isApplying}
              onClick={this.handleSubmit}
            >
              {isApplying ? 'Applying…' : 'Apply'}
            </PaperButton>
          )}
        </ControlPanel>
      </div>
    );
  }
}

function getPotentialRolenames(user, journal, applyActions) {
  const activeRoles = getActiveRoles(journal);

  return ['reviewer', 'editor', 'producer'].filter(
    roleName =>
      !arrayify(applyActions).some(
        action => action.agent.roleName === roleName
      ) &&
      !activeRoles.some(
        role => role.roleName === roleName && getAgentId(role) === getId(user)
      )
  );
}

class ApplyModal extends React.Component {
  static propTypes = {
    fromSubdomain: PropTypes.bool,
    journal: PropTypes.shape({
      '@type': PropTypes.oneOf(['Periodical'])
    }).isRequired,
    onClose: PropTypes.func.isRequired,

    // redux
    user: PropTypes.object, // if @id defined the user is not logged in => show login prompt
    applyToJournal: PropTypes.func.isRequired
  };

  handleClose = e => {
    const { onClose } = this.props;
    onClose();
  };

  render() {
    const { user, journal, fromSubdomain } = this.props;
    const isLoggedIn = !!getId(user);

    const bem = bemify('apply-modal');

    let loginLinkProps = {};
    if (fromSubdomain) {
      loginLinkProps.href = resetSubdomain(
        `/login?next=${encodeURIComponent(
          `${journal.url}/about/staff?join=true`
        )}`
      );
    } else {
      loginLinkProps.to = `/login?next=${encodeURIComponent(
        `${journal.url}/about/staff?join=true`
      )}`;
    }

    let registerLinkProps = {};
    if (fromSubdomain) {
      registerLinkProps.href = resetSubdomain(
        `/register?next=${encodeURIComponent(
          `${journal.url}/about/staff?join=true`
        )}`
      );
    } else {
      registerLinkProps.to = `/register?next=${encodeURIComponent(
        `${journal.url}/about/staff?join=true`
      )}`;
    }

    if (!isLoggedIn) {
      return (
        <Modal>
          <Card className={bem``}>
            <div className={bem`__wrapper`}>
              <header>
                <h3 className={bem`__title`}>Join</h3>
              </header>

              <Notice iconName="warning">
                You need to be logged in to apply.
              </Notice>

              <ControlPanel>
                <PaperButton onClick={this.handleClose}>Close</PaperButton>
                <PaperButtonLink {...loginLinkProps}>Login</PaperButtonLink>
                <PaperButtonLink {...registerLinkProps}>
                  Register
                </PaperButtonLink>
              </ControlPanel>
            </div>
          </Card>
        </Modal>
      );
    }

    return (
      <Modal>
        <Card className={bem``}>
          <Search
            index="action"
            query={`@type:"ApplyAction" AND actionStatus:"ActiveActionStatus" AND objectId:${escapeLucene(
              getId(journal)
            )} AND agentId:${escapeLucene(getId(user))}`}
          >
            {({ items, isActive }) => {
              if (isActive) {
                return null;
              }

              return (
                <div className={bem`__wrapper`}>
                  <ApplyModalForm {...this.props} prevApplyActions={items} />
                </div>
              );
            }}
          </Search>
        </Card>
      </Modal>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    user => {
      return { user };
    }
  ),
  {
    applyToJournal
  }
)(ApplyModal);
