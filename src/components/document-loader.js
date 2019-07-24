import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Spinner } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

class DocumentLoader extends Component {
  static propTypes = {
    children: PropTypes.element,
    forceLoading: PropTypes.bool, // force the loading state even if loading from pouch has completed
    label: PropTypes.string,

    //redux
    isLoadingFromPouch: PropTypes.bool
  };

  static defaultProps = {
    label: 'Syncing Documents…'
  };

  render() {
    const { label, forceLoading, isLoadingFromPouch, children } = this.props;

    // Note: `isLoadingFromPouch` undefined is interpreted as not having tryied to load yet
    const isLoading =
      forceLoading || isLoadingFromPouch == null || isLoadingFromPouch === true;
    return isLoading ? (
      <div className="document-loader">
        <Spinner
          progressMode="bounce"
          label={label}
          size={32}
          heartbeat={false}
        >
          <Iconoclass iconName="logoSciAlt" size="24px" />
        </Spinner>
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
