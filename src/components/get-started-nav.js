import React from 'react';
import PropTypes from 'prop-types';
import Iconoclass from '@scipe/iconoclass';
import { Logo, bemify, PaperButtonLink } from '@scipe/ui';

export default class GetStartedNav extends React.Component {
  static propTypes = {
    displayHeader: PropTypes.bool
  };

  static defaultProps = {
    displayHeader: true
  };

  render() {
    const { displayHeader } = this.props;

    const bem = bemify('get-started-nav');

    return (
      <div className={bem``}>
        {!!displayHeader && (
          <header className={bem`__header`}>
            <Logo className={bem`__header-logo`} logo="science-periodicals" />
          </header>
        )}
        <h3 className={bem`__sub-header`}>
          Create Journals, Publish Articles, Peer Review Science
        </h3>
        <div className={bem`__content`}>
          <div className={bem`__start-button`}>
            <PaperButtonLink href="/get-started" raised={false}>
              Get Started <Iconoclass iconName="exitToApp" size="18px" />
            </PaperButtonLink>
          </div>
        </div>
      </div>
    );
  }
}
