import React from 'react';
import PropTypes from 'prop-types';
import Iconoclass from '@scipe/iconoclass';
import { Card, Banner, Hyperlink, Span, BemTags } from '@scipe/ui';
import IssueMediumBannerContent from './issue-medium-banner-content';

export default class IssueSnippet extends React.Component {
  static propTypes = {
    canWrite: PropTypes.bool,
    journal: PropTypes.object,
    issue: PropTypes.object,
    query: PropTypes.object,
    sticking:
      PropTypes.bool /* when sticking two version of this are rendered - one in each displayMode.*/,
    displayMode:
      PropTypes.string /* weather this instance is the `sticky` Item or the `unsticky` one */
  };

  static defaultProps = {
    journal: {},
    issue: {},
    query: {},
    displayMode: 'unsticky'
  };

  render() {
    const { journal, issue, query, sticking, displayMode } = this.props;

    return (
      <Card
        className={`issue-snippet ${
          sticking ? 'issue-snippet--sticking' : ''
        } issue-snippet--${displayMode}`}
      >
        <Banner type="medium" cssVariables={issue.style}>
          <IssueMediumBannerContent
            journal={journal}
            issue={issue}
            query={query}
          />
        </Banner>

        <div className="issue-snippet__description">
          {issue.description ? (
            <Span>{issue.description}</Span>
          ) : (
            <Hyperlink
              page="issue"
              issue={issue}
              query={query}
              className="issue-snippet__description-placeholder"
            >
              View Issue
            </Hyperlink>
          )}
          <Hyperlink
            page="issue"
            issue={issue}
            query={query}
            className="issue-snippet__arrow-icon"
          >
            <Iconoclass iconName="arrowNext" behavior="button" />
          </Hyperlink>
        </div>
      </Card>
    );
  }
}
