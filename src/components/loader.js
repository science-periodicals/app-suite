import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

class Loader extends Component {
  static propTypes = {
    loading: PropTypes.bool
  };

  renderProgress() {
    return (
      <div className="loader">
        <div className="loader__body">Loading documents...</div>
      </div>
    );
  }

  render() {
    return this.props.loading ? this.renderProgress() : this.props.children;
  }
}

export default connect(state => ({
  loading: state.workflows.status === 'success'
}))(Loader);
