import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { bemify, FeedItem, Spinner, PaperButton } from '@scipe/ui';
import { getId } from '@scipe/jsonld';
import { getAgentId, getScopeId } from '@scipe/librarian';
import {
  postCheckAction,
  fetchActiveChecks
} from '../actions/check-action-creators';

/**
 * Note: active invites are first fetched in <Dashboard />
 */
class FeedActiveCheckActions extends PureComponent {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,

    // redux
    user: PropTypes.object.isRequired,
    droplets: PropTypes.object.isRequired,

    isFetching: PropTypes.bool,
    error: PropTypes.instanceOf(Error),

    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    nextUrl: PropTypes.string,

    postCheckAction: PropTypes.func.isRequired,
    fetchActiveChecks: PropTypes.func.isRequired
  };

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  handleAction = (action, data) => {
    this.props.postCheckAction(action);
  };

  handleMore = e => {
    const { fetchActiveChecks, nextUrl } = this.props;

    fetchActiveChecks({ nextUrl });
  };

  render() {
    const { disabled, items, user, isFetching, nextUrl, droplets } = this.props;
    const bem = bemify('feed-active-check-actions');

    return (
      <div className={bem``}>
        <ul className="sa__clear-list-styles">
          {items.map(item => {
            const scopeId = getScopeId(item);
            const scope = scopeId && droplets[scopeId];
            return (
              <li key={getId(item)}>
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

        <div className="feed-active-check-actions__more">
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
    state => state.fetchActiveCheckActionsStatus,
    state => state.activeCheckActions,
    state => state.droplets,
    (user, fetchActiveCheckActionsStatus, activeCheckActions, droplets) => {
      return {
        user,
        isFetching: fetchActiveCheckActionsStatus.isActive,
        error: fetchActiveCheckActionsStatus.error,
        items: activeCheckActions.data.filter(action => {
          return (
            action.actionStatus === 'ActiveActionStatus' &&
            !action._deleted &&
            getAgentId(action.agent) === getId(user)
          );
        }),
        nextUrl:
          activeCheckActions.data.length < activeCheckActions.numberOfItems
            ? activeCheckActions.nextUrl
            : null,
        droplets
      };
    }
  ),
  {
    postCheckAction,
    fetchActiveChecks
  }
)(FeedActiveCheckActions);
