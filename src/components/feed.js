import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { PaperButton, FeedItem } from '@scipe/ui';
import { getId } from '@scipe/jsonld';
import { getScopeId } from '@scipe/librarian';
import { fetchFeedItems } from '../actions/feed-action-creators';
import { fetchActiveInvites } from '../actions/invite-action-creators';
import { postWorkflowAction } from '../actions/workflow-action-creators';

/**
 * Note: active feed items are first fetched in <Dashboard />
 */
class Feed extends PureComponent {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,

    // redux
    user: PropTypes.object.isRequired,
    droplets: PropTypes.object.isRequired,

    actions: PropTypes.array,
    nextUrl: PropTypes.string,

    isActive: PropTypes.bool,
    error: PropTypes.instanceOf(Error),
    totalFeedItems: PropTypes.number,
    nFeedItems: PropTypes.number,

    fetchFeedItems: PropTypes.func.isRequired
  };

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  handleMore = e => {
    this.props.fetchFeedItems({ nextUrl: this.props.nextUrl });
  };

  render() {
    const {
      disabled,
      nextUrl,
      totalFeedItems,
      nFeedItems,
      actions,
      user,
      droplets
    } = this.props;
    const showMore = nextUrl && nFeedItems < totalFeedItems && nFeedItems < 200;

    return (
      <div className="feed">
        <ul className="feed__list">
          {actions.map(action => {
            const scopeId = getScopeId(action);
            const scope = scopeId && droplets[scopeId];
            return (
              <li key={getId(action)} className="feed__list-item">
                <FeedItem
                  user={user}
                  item={action}
                  droplets={droplets}
                  scope={scope}
                  disabled={disabled}
                />
              </li>
            );
          })}
        </ul>

        <div className="feed__more">
          {showMore ? (
            <PaperButton onClick={this.handleMore}>More</PaperButton>
          ) : null}
        </div>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    state => state.feedItems,
    state => state.droplets,
    (user, feedItems, droplets) => {
      const actions = feedItems.data;

      return {
        user,
        totalFeedItems: feedItems.numberOfItems,
        nFeedItems: feedItems.data.length,
        nextUrl: feedItems.nextUrl,
        isActive: feedItems.status === 'active',
        error: feedItems.error,
        actions: actions,
        droplets
      };
    }
  ),
  {
    fetchActiveInvites,
    fetchFeedItems,
    postWorkflowAction
  }
)(Feed);
