import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Spinner } from '@scipe/ui';

class DocumentLoader extends Component {
  static propTypes = {
    isLoadingFromPouch: PropTypes.bool,
    children: PropTypes.element
  };

  render() {
    const { isLoadingFromPouch, children } = this.props;

    // Note: `isLoadingFromPouch` undefined is interpreted as not having tryied to load yet
    const isLoading = isLoadingFromPouch == null || isLoadingFromPouch === true;
    return isLoading ? (
      <div className="document-loader">
        <Spinner progressMode="bounce" label="Syncing Documents..." />
      </div>
    ) : (
      children
    );
  }
}

export default connect(
  createSelector(
    state => state.pouch.isLoadingFromPouch,
    isLoadingFromPouch => {
      return { isLoadingFromPouch };
    }
  )
)(DocumentLoader);
