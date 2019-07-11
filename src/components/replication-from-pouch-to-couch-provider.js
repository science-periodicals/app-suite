import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
  startReplicationFromPouchToCouch,
  stopReplicationFromPouchToCouch
} from '../actions/pouch-action-creators';
import config from '../utils/config';

class ReplicationFromPouchToCouchProvider extends React.Component {
  static propTypes = {
    children: PropTypes.any,
    // redux
    startReplicationFromPouchToCouch: PropTypes.func.isRequired,
    stopReplicationFromPouchToCouch: PropTypes.func.isRequired
  };

  componentDidMount() {
    // we don't start the feed when we are in an iframe (for now print mode) or
    // run backstop integration test (config.ci === true)
    if (window === window.parent && !config.ci) {
      this.props.startReplicationFromPouchToCouch();
    }
  }

  componentWillUnmount() {
    if (window === window.parent && !config.ci) {
      this.props.stopReplicationFromPouchToCouch();
    }
  }

  render() {
    const { children } = this.props;
    // TODO history provider so that history is available as state of the store

    return children;
  }
}

export default connect(
  null,
  {
    startReplicationFromPouchToCouch,
    stopReplicationFromPouchToCouch
  }
)(ReplicationFromPouchToCouchProvider);
