import React from 'react';
import PropTypes from 'prop-types';
import { getId, getNodeMap } from '@scipe/jsonld';
import { Div } from '@scipe/ui';

export default class FeaturedArticleBannerContent extends React.Component {
  static propTypes = {
    release: PropTypes.object
  };

  static defaultProps = {
    release: {}
  };

  render() {
    const { release } = this.props;

    const nodeMap = getNodeMap(release);
    const mainEntity = nodeMap[getId(release.mainEntity)] || {};

    return (
      <div className="featured-article-banner-content">
        <div className="featured-article-banner-content__title-label">
          Featured Article
        </div>

        {/* title */}
        <Div className="featured-article-banner-content__title">
          {mainEntity.name}
        </Div>
      </div>
    );
  }
}
