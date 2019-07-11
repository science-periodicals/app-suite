import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import { UserBadgeMenu, resetSubdomain, MenuItem } from '@scipe/ui';
import config from '../utils/config';
import { syncProgressSelector } from '../selectors/graph-selectors';
import { createReadOnlyUserSelector } from '../selectors/user-selectors';

export default connect(
  createSelector(
    state => state.user,
    state => state.pouch.db,
    syncProgressSelector,
    createReadOnlyUserSelector(),
    (user, db, progress, disabled) => {
      return {
        user,
        db,
        progress,
        disabled
      };
    }
  )
)(
  class _UserBadgeMenu extends React.Component {
    static propTypes = {
      forceResetSubdomain: PropTypes.bool,
      user: PropTypes.object.isRequired,
      disabled: PropTypes.bool.isRequired,
      progress: PropTypes.object
    };

    render() {
      const { user, progress, disabled, forceResetSubdomain } = this.props;

      if (!getId(user)) {
        return (
          <a
            className="connected-user-badge-menu"
            href={resetSubdomain('/login', undefined, {
              force: forceResetSubdomain
            })}
          >
            login
          </a>
        );
      }

      return (
        <UserBadgeMenu
          portal={true}
          userId={getId(user)}
          statusIconName={disabled ? 'lock' : null}
          progress={progress.value}
          progressMode={progress.mode}
          size={32}
        >
          {config.isJournalSubdomain ? (
            <Fragment>
              <MenuItem href={resetSubdomain('/')}>Dashboard</MenuItem>
              <MenuItem href={resetSubdomain('/settings')}>Settings</MenuItem>
            </Fragment>
          ) : (
            <Fragment>
              <MenuItem to={{ pathname: '/' }}>Dashboard</MenuItem>
              <MenuItem to={{ pathname: '/settings' }}>Settings</MenuItem>
            </Fragment>
          )}

          <MenuItem href={resetSubdomain('/logout')}>Logout</MenuItem>
          {progress && progress.mode !== 'none' && (
            <MenuItem divider disabled>
              Syncing{' '}
              {(progress.mode === 'up' || progress.mode === 'down') &&
                progress.value + '%'}
            </MenuItem>
          )}
        </UserBadgeMenu>
      );
    }
  }
);
