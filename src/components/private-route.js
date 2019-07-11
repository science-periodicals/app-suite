import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Route, Redirect, withRouter } from 'react-router-dom';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import { createReadOnlyUserSelector } from '../selectors/user-selectors';

class PrivateRoute extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool,
    component: PropTypes.any
  };

  render() {
    const { component: Component, user, disabled, ...rest } = this.props;

    return (
      <Route
        {...rest}
        render={props =>
          getId(user) ? (
            <Component {...props} user={user} disabled={disabled} />
          ) : (
            <Redirect
              to={{
                pathname: '/login',
                state: { from: props.location }
              }}
            />
          )
        }
      />
    );
  }
}

export default withRouter(
  connect(
    createSelector(
      state => state.user,
      createReadOnlyUserSelector(),
      (user, disabled) => {
        return {
          user,
          disabled
        };
      }
    )
  )(PrivateRoute)
);
