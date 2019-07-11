import React, { Component, Suspense } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Switch, Route } from 'react-router-dom';
import {
  sync,
  stopSync,
  loadFromPouch
} from '../actions/pouch-action-creators';
import { joinRoom, leaveRoom } from '../actions/worker-action-creators';
import ErrorPage from './error-page';
import LoadingPage from './loading-page';
import config from '../utils/config';

const Publisher = React.lazy(() =>
  import(/* webpackChunkName: "Publisher" */ './publisher/publisher')
);
const Reader = React.lazy(() =>
  import(/* webpackChunkName: "Reader" */ './reader/reader')
);

class PouchDataProvider extends Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    match: PropTypes.shape({
      params: PropTypes.shape({
        journalId: PropTypes.string.isRequired,
        graphId: PropTypes.string.isRequired
      }).isRequired
    }).isRequired,
    user: PropTypes.object.isRequired,
    disabled: PropTypes.bool.isRequired,
    sync: PropTypes.func.isRequired,
    stopSync: PropTypes.func.isRequired,
    loadFromPouch: PropTypes.func.isRequired,
    joinRoom: PropTypes.func.isRequired,
    leaveRoom: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  componentDidMount() {
    const {
      sync,
      joinRoom,
      loadFromPouch,
      history,
      match: { params }
    } = this.props;
    // we don't start the repication when we are in an iframe (for now print
    // mode) or run backstop integration test (config.ci === true)

    if (window === window.parent) {
      sync(`journal:${params.journalId}`, `graph:${params.graphId}`, {
        history,
        live: !config.ci
      });
      if (!config.ci) {
        joinRoom(`graph:${params.graphId}`);
      }
    } else {
      // we are in iframe (print)
      this._fromIframe = true;
      loadFromPouch(`journal:${params.journalId}`, `graph:${params.graphId}`, {
        history
      });
    }
  }

  componentWillUnmount() {
    if (!this._fromIframe) {
      const {
        stopSync,
        leaveRoom,
        match: { params }
      } = this.props;
      stopSync();
      if (!config.ci) {
        leaveRoom(`graph:${params.graphId}`);
      }
    }
  }

  render() {
    const { user, disabled } = this.props;
    const { error } = this.state;
    if (error) {
      return <ErrorPage user={user} error={error} />;
    }

    return (
      <Suspense fallback={<LoadingPage user={user} />}>
        <Switch>
          <Route
            exact={true}
            path="/:journalId/:graphId/preview"
            render={props => (
              <Reader
                {...props}
                user={user}
                disabled={disabled}
                preview={true}
              />
            )}
          />
          <Route
            exact={true}
            path="/:journalId/:graphId/submission"
            render={props => (
              <Publisher {...props} user={user} disabled={disabled} />
            )}
          />
        </Switch>
      </Suspense>
    );
  }
}

export default connect(
  null,
  {
    sync,
    stopSync,
    loadFromPouch,
    joinRoom,
    leaveRoom
  }
)(PouchDataProvider);
