import React from 'react';
import PropTypes from 'prop-types';

export default class ArticleLargeBannerContent extends React.Component {
  static propTypes = {
    journal: PropTypes.object,
    issue: PropTypes.object,
    release: PropTypes.object
  };

  static defaultProps = {
    journal: {},
    issue: {},
    release: {}
  };

  render() {
    // no text in this case (for now)
    return <div />;
  }
}
