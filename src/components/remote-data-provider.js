import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
  startRemoteChanges,
  stopRemoteChanges
} from '../actions/pouch-action-creators';
import config from '../utils/config';

class RemoteDataProvider extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    children: PropTypes.any,
    startRemoteChanges: PropTypes.func.isRequired,
    stopRemoteChanges: PropTypes.func.isRequired
  };

  componentDidMount() {
    const { history } = this.props;
    // we don't start the feed when we are in an iframe (for now print mode) or
    // run backstop integration test (config.ci === true)
    if (window === window.parent && !config.ci) {
      this.props.startRemoteChanges({ history });
    }
  }

  componentWillUnmount() {
    if (window === window.parent && !config.ci) {
      this.props.stopRemoteChanges();
    }
  }

  render() {
    return this.props.children;
  }
}

export default connect(
  null,
  {
    startRemoteChanges,
    stopRemoteChanges
  }
)(RemoteDataProvider);
