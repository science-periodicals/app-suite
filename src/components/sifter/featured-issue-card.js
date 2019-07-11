import React from 'react';
import PropTypes from 'prop-types';
import Iconoclass from '@scipe/iconoclass';
import { Card, Banner, Div, Hyperlink } from '@scipe/ui';
import FeaturedIssueBannerContent from './featured-issue-banner-content';

export default class FeaturedIssueCard extends React.Component {
  static propTypes = {
    user: PropTypes.object, // so that we can implement the bookmark option (only available if user is connected)
    journal: PropTypes.object,
    issue: PropTypes.object,
    query: PropTypes.object,
    theme: PropTypes.oneOf(['light', 'dark', 'alt'])
  };

  static defaultProps = {
    journal: {},
    issue: {}
  };

  render() {
    const { journal, issue, query, theme } = this.props;

    return (
      <Card className="featured-issue-card">
        <div className="featured-issue-card__content">
          <Banner type="small" cssVariables={issue.style} theme={theme}>
            <FeaturedIssueBannerContent journal={journal} issue={issue} />
          </Banner>

          <div className="featured-issue-card__body">
            {/* TODO autoabridge abstract ? */}
            <Div className="featured-issue-card__body-text">
              {issue.description}
            </Div>
          </div>
          {/* footer */}
          <div className="featured-issue-card__footer">
            <Hyperlink
              page="issue"
              issue={issue}
              query={query}
              className="featured-issue-card__arrow-icon"
            >
              <Iconoclass iconName="arrowNext" />
            </Hyperlink>
          </div>
        </div>
      </Card>
    );
  }
}
