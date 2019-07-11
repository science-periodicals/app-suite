import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Iconoclass from '@scipe/iconoclass';
import { getId, arrayify, getNodeMap } from '@scipe/jsonld';
import { Card, Banner, Div, Hyperlink } from '@scipe/ui';
import FeaturedArticleBannerContent from './featured-article-banner-content';

export default class FeaturedArticleCard extends React.Component {
  static propTypes = {
    user: PropTypes.object, // so that we can implement the bookmark option (only available if user is connected)
    graph: PropTypes.object, // a release with @graph
    query: PropTypes.object
  };

  static defaultProps = {
    graph: {}
  };

  render() {
    const { graph, query } = this.props;

    const nodeMap = getNodeMap(graph);
    const mainEntity = nodeMap[getId(graph.mainEntity)] || {};

    const abstractId = arrayify(mainEntity.detailedDescription).find(
      abstractId => {
        const abstract = nodeMap[getId(abstractId)];
        return (
          abstract &&
          (abstract['@type'] === 'WPAbstract' ||
            abstract['@type'] === 'WPImpactStatement')
        );
      }
    );
    const abstract = nodeMap[getId(abstractId)];

    return (
      <Card className="featured-article-card">
        <div className="featured-article-card__content">
          <Banner type="small" cssVariables={graph.style}>
            <FeaturedArticleBannerContent release={graph} />
          </Banner>

          <div
            className={classNames('featured-article-card__body', {
              'featured-article-card__body--empty': !abstract
            })}
          >
            {!!abstract && (
              <Div className="featured-article-card__body-text">
                {abstract.text}
              </Div>
            )}
          </div>

          {/* footer */}
          <div className="featured-article-card__footer">
            <Hyperlink
              page="article"
              graph={graph}
              query={query}
              className="featured-article-card__arrow-icon"
            >
              <Iconoclass iconName="arrowNext" />
            </Hyperlink>
          </div>
        </div>
      </Card>
    );
  }
}
