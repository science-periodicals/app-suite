import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { PaperButton, FeedItem, Spinner } from '@scipe/ui';
import { getId } from '@scipe/jsonld';
import { getScopeId } from '@scipe/librarian';
import { fetchActiveCommentActions } from '../actions/comment-action-creators';

/**
 * Note: active comments are first fetched in <Dashboard />
 */
class FeedActiveComments extends PureComponent {
  static propTypes = {
    // redux
    user: PropTypes.object.isRequired,
    droplets: PropTypes.object.isRequired,

    items: PropTypes.arrayOf(PropTypes.object),
    nextUrl: PropTypes.string,
    totalFeedItems: PropTypes.number,
    nFeedItems: PropTypes.number,
    isFetching: PropTypes.bool,
    error: PropTypes.instanceOf(Error),

    fetchActiveCommentActions: PropTypes.func.isRequired
  };

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  handleMore = e => {
    this.props.fetchActiveCommentActions({ nextUrl: this.props.nextUrl });
  };

  render() {
    const {
      nextUrl,
      totalFeedItems,
      nFeedItems,
      items,
      user,
      droplets,
      isFetching
    } = this.props;
    const showMore = nextUrl && nFeedItems < totalFeedItems && nFeedItems < 200;

    return (
      <div className="feed-active-comments">
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
                />
              </li>
            );
          })}
        </ul>

        <div className="feed-active-comments__more">
          {isFetching ? (
            <Spinner progressMode="bounce">Fetching…</Spinner>
          ) : showMore ? (
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
    state => state.activeCommentActionSearchResults,
    state => state.fetchActiveCommentActionsStatus.isActive,
    state => state.fetchActiveCommentActionsStatus.error,
    state => state.droplets,
    (user, activeCommentActionSearchResults, isFetching, error, droplets) => {
      return {
        user,
        totalFeedItems: activeCommentActionSearchResults.numberOfItems,
        nFeedItems: activeCommentActionSearchResults.data.length,
        nextUrl: activeCommentActionSearchResults.nextUrl,
        isFetching,
        error,
        items: activeCommentActionSearchResults.data.filter(
          item => item.actionStatus === 'ActiveActionStatus' && !item._deleted
        ),
        droplets
      };
    }
  ),
  {
    fetchActiveCommentActions
  }
)(FeedActiveComments);
