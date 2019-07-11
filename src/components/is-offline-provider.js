import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { updateIsOffline } from '../actions/ui-action-creators';

class IsOfflineProvider extends React.Component {
  static propTypes = {
    updateIsOffline: PropTypes.func.isRequired,
    children: PropTypes.any
  };

  handleOnline = () => {
    this.props.updateIsOffline(false);
  };

  handleOffline = () => {
    this.props.updateIsOffline(true);
  };

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  render() {
    return this.props.children;
  }
}

export default connect(
  null,
  { updateIsOffline }
)(IsOfflineProvider);
