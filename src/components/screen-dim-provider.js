import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {
  withScreenDim,
  CSS_SHORT,
  CSS_TALL,
  CSS_MOBILE,
  CSS_SMALL_TABLET,
  CSS_TABLET,
  CSS_SMALL_DESKTOP,
  CSS_LARGE_DESKTOP,
  CSS_XLARGE_DESKTOP,
  CSS_XXLARGE_DESKTOP
} from '@scipe/ui';
import { setScreenDim } from '../actions/ui-action-creators';

class ScreenDimProvider extends React.Component {
  static propTypes = {
    children: PropTypes.any,

    // withScreenDim HoC
    screenWidth: PropTypes.oneOf([
      CSS_MOBILE,
      CSS_SMALL_TABLET,
      CSS_TABLET,
      CSS_SMALL_DESKTOP,
      CSS_LARGE_DESKTOP,
      CSS_XLARGE_DESKTOP,
      CSS_XXLARGE_DESKTOP
    ]).isRequired,
    screenHeight: PropTypes.oneOf([CSS_SHORT, CSS_TALL]).isRequired,

    //redux
    setScreenDim: PropTypes.func.isRequired
  };

  componentDidMount() {
    const { setScreenDim, screenWidth, screenHeight } = this.props;
    if (screenWidth != null && screenHeight != null) {
      setScreenDim(screenWidth, screenHeight);
    }
  }

  componentDidUpdate(prevProps) {
    const { setScreenDim, screenWidth, screenHeight } = this.props;
    if (
      screenWidth != null &&
      screenHeight != null &&
      (prevProps.screenWidth !== screenWidth ||
        prevProps.screenHeight !== screenHeight)
    ) {
      setScreenDim(screenWidth, screenHeight);
    }
  }

  render() {
    return this.props.children;
  }
}

// withRouter is needed so that Redux update on route transition
export default withRouter(
  connect(null, { setScreenDim })(withScreenDim(ScreenDimProvider))
);
