import React from 'react';
import PropTypes from 'prop-types';
import { unprefix, getId } from '@scipe/jsonld';
import { Span } from '@scipe/ui';

export default class FeaturedIssueBannerContent extends React.Component {
  static propTypes = {
    journal: PropTypes.object,
    issue: PropTypes.object
  };

  static defaultProps = {
    journal: {},
    issue: {}
  };

  render() {
    const { issue } = this.props;

    return (
      <div className="featured-issue-banner-content">
        <div className="featured-issue-banner-content__title-label">
          Featured Issue
        </div>

        {issue['@type'] === 'PublicationIssue' ? (
          <span className="featured-issue-banner-content__title">
            Issue {issue.issueNumber}
          </span>
        ) : (
          <Span className="featured-issue-banner-content__title">
            {issue.name || (unprefix(getId(issue)) || '').split('/', 2)[1]}
          </Span>
        )}
      </div>
    );
  }
}
