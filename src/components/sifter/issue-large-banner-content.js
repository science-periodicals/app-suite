import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  Div,
  Span,
  AppLayoutMiddleLeftSpacer,
  AppLayoutMiddleRightSpacer
} from '@scipe/ui';
import { unprefix, getId, arrayify } from '@scipe/jsonld';
import moment from 'moment';

export default class IssueLargeBannerContent extends React.Component {
  static propTypes = {
    journal: PropTypes.object,
    issue: PropTypes.object
  };

  static defaultProps = {
    journal: {},
    issue: {}
  };

  render() {
    const { journal, issue } = this.props;
    const isFeatured = arrayify(journal.workFeatured).some(
      work => getId(work) === getId(issue)
    );

    return (
      <div className="issue-large-banner-content">
        <div className="issue-large-banner-content__margin" />
        <div className="issue-large-banner-content__middle">
          {isFeatured && (
            <div className="issue-large-banner-content__title-label">
              Featured Issue
            </div>
          )}

          <h1 className="issue-large-banner-content__content-row">
            <span className="issue-large-banner-content__title">
              {issue['@type'] === 'PublicationIssue' ? (
                <Fragment>
                  <span className="issue-large-banner-content__title-issue-number">
                    Issue
                    {` `}
                    {issue.issueNumber}
                  </span>
                  {issue.name && (
                    <Fragment>
                      {` - `}
                      <Span className="issue-large-banner-content__title-issue">
                        {issue.name}
                      </Span>
                    </Fragment>
                  )}
                </Fragment>
              ) : (
                <Span className="issue-large-banner-content__title-issue">
                  {issue.name ||
                    (unprefix(getId(issue)) || '').split('/', 2)[1]}
                </Span>
              )}
            </span>
            <span className="issue-large-banner-content__date">
              {moment(issue.datePublished).format('MMMM, Y')}
            </span>
          </h1>

          <div className="issue-large-banner-content__description">
            <Div>{issue.description}</Div>
          </div>
        </div>
        <div className="issue-large-banner-content__margin" />
      </div>
    );
  }
}
