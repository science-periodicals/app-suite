import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { FeedItem, PaperButton, Spinner } from '@scipe/ui';
import { getId } from '@scipe/jsonld';
import { getAgentId, getObjectId, getScopeId } from '@scipe/librarian';
import { postWorkflowAction } from '../actions/workflow-action-creators';
import { fetchActiveInvites } from '../actions/invite-action-creators';

/**
 * Note: active invites are first fetched in <Dashboard />
 */
class FeedActiveInvites extends PureComponent {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,

    // redux
    user: PropTypes.object.isRequired,
    droplets: PropTypes.object.isRequired,

    isFetching: PropTypes.bool,
    error: PropTypes.instanceOf(Error),

    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    nextUrl: PropTypes.string,

    postWorkflowAction: PropTypes.func.isRequired,
    fetchActiveInvites: PropTypes.func.isRequired
  };

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  handleAction = (action, data) => {
    const graphId = getObjectId(data.parentAction);
    this.props.postWorkflowAction(graphId, action, data);
  };

  handleMore = e => {
    const { fetchActiveInvites, nextUrl } = this.props;

    fetchActiveInvites({ nextUrl });
  };

  render() {
    const { disabled, items, user, nextUrl, isFetching, droplets } = this.props;

    return (
      <div className="feed-active-invites">
        <ul className="sa__clear-list-styles">
          {items.map(item => {
            const scopeId = getScopeId(item);
            const scope = scopeId && droplets[scopeId];
            return (
              <li key={getId(item)} className="feed__list-item">
                <FeedItem
                  user={user}
                  item={item}
                  droplets={droplets}
                  scope={scope}
                  disabled={disabled}
                  onAction={this.handleAction}
                />
              </li>
            );
          })}
        </ul>

        <div className="feed-active-invites__more">
          {isFetching ? (
            <Spinner progressMode="bounce">Fetching…</Spinner>
          ) : nextUrl ? (
            <PaperButton disabled={isFetching} onClick={this.handleMore}>
              More
            </PaperButton>
          ) : null}
        </div>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    state => state.activeInvites,
    state => state.fetchActiveInvitesStatus,
    state => state.droplets,
    (user, activeInvites, fetchActiveInvitesStatus, droplets) => {
      return {
        user,
        isFetching: fetchActiveInvitesStatus.isActive,
        error: fetchActiveInvitesStatus.error,
        items: activeInvites.data.filter(action => {
          return (
            action.actionStatus === 'ActiveActionStatus' &&
            !action._deleted &&
            getAgentId(action.recipient) === getId(user)
          );
        }),
        nextUrl:
          activeInvites.data.length < activeInvites.numberOfItems
            ? activeInvites.nextUrl
            : null,
        droplets
      };
    }
  ),
  {
    postWorkflowAction,
    fetchActiveInvites
  }
)(FeedActiveInvites);
