import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { helmetify } from '@scipe/librarian';
import { Helmet } from 'react-helmet-async';
import { Banner } from '@scipe/ui';
import JournalLargeBannerContent from './journal-large-banner-content';
import IssueLargeBannerContent from './issue-large-banner-content';
import { getCustomVariables } from '../../utils/style-utils';

export default class SifterHeader extends Component {
  static propTypes = {
    mode: PropTypes.oneOf([
      'journal', // journal homepage, search for articles
      'issues', // list of issues (search for issues)
      'issue', // issue homepage (search for article within that issue)
      'requests'
    ]),
    journal: PropTypes.object,
    issue: PropTypes.object
  };

  static defaultProps = {
    journal: {},
    issue: {}
  };

  render() {
    const { journal, issue, mode } = this.props;

    const helmet = helmetify(mode === 'issue' ? issue : journal, {
      defaultImg: '/favicon/alt-submark-favicon/android-chrome-512x512.png',
      defaultTitle: 'sci.pe'
    });

    return (
      <Banner
        type="large"
        cssVariables={mode === 'issue' ? issue.style : journal.style}
        className="sifter-header"
      >
        <Helmet>
          {helmet.title && <title>{helmet.title}</title>}
          {helmet.meta.map(attrMap => (
            <meta key={attrMap.name || attrMap.content} {...attrMap} />
          ))}

          <style type="text/css">{`
                html {
                  ${getCustomVariables(journal)}
                }
                `}</style>
        </Helmet>

        {mode === 'issue' ? (
          <IssueLargeBannerContent journal={journal} issue={issue} />
        ) : (
          <JournalLargeBannerContent journal={journal} />
        )}
      </Banner>
    );
  }
}
