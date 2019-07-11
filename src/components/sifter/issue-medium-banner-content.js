import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { unprefix, getId, arrayify } from '@scipe/jsonld';
import { Span, Hyperlink } from '@scipe/ui';

export default class IssueMediumBannerContent extends React.Component {
  static propTypes = {
    journal: PropTypes.object,
    issue: PropTypes.object,
    query: PropTypes.object,
    link: PropTypes.bool
  };

  static defaultProps = {
    link: true,
    journal: {},
    issue: {}
  };

  renderTitle() {
    const { issue } = this.props;

    return (
      <Fragment>
        {issue['@type'] === 'PublicationIssue' ? (
          <Fragment>
            <span className="issue-medium-banner-content__title-issue-number">
              Issue{` `}
              {issue.issueNumber}
            </span>
            {issue.name && (
              <Fragment>
                {` - `}
                <Span className="issue-medium-banner-content__title-issue">
                  {issue.name}
                </Span>
              </Fragment>
            )}
          </Fragment>
        ) : (
          <Span className="issue-medium-banner-content__title-issue">
            {issue.name || (unprefix(getId(issue)) || '').split('/', 2)[1]}
          </Span>
        )}
      </Fragment>
    );
  }

  render() {
    const { issue, journal, query, link } = this.props;
    const isFeatured = arrayify(journal.workFeatured).some(
      work => getId(work) === getId(issue)
    );

    return (
      <div className="issue-medium-banner-content">
        {isFeatured && (
          <div className="issue-medium-banner-content__title-label">
            Featured Issue
          </div>
        )}

        <div className="issue-medium-banner-content__content-row">
          <div className="issue-medium-banner-content__title">
            {link ? (
              <Hyperlink
                page="issue"
                journal={journal}
                issue={issue}
                query={query}
              >
                {this.renderTitle()}
              </Hyperlink>
            ) : (
              this.renderTitle()
            )}
          </div>

          <span className="issue-medium-banner-content__date">
            {moment(issue.datePublished).format('MMMM, Y')}
          </span>
        </div>
      </div>
    );
  }
}
