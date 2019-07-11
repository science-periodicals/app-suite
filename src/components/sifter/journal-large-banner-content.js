import React from 'react';
import PropTypes from 'prop-types';
import { H1, Div } from '@scipe/ui';

export default class JournalLargeBannerContent extends React.Component {
  static propTypes = {
    journal: PropTypes.object
  };

  static defaultProps = {
    journal: {}
  };

  render() {
    const { journal } = this.props;
    return (
      <div className="journal-large-banner-content">
        <div className="journal-large-banner-content__margin" />
        <div className="journal-large-banner-content__content">
          <div className="journal-large-banner-content__title-line">
            {/* for when alert icon is active: <div className="sifter-header__title-spacer" />*/}
            {/* h1 is probably what we want for SEO */}
            <H1 className="journal-large-banner-content__title-text">
              {journal.name}
            </H1>
            {/* <div className="sifter-header__alert-button">
                <Iconoclass iconName='alertAdd' behavior='button' color='grey' iconSize={18} title="coming soon"/>
              </div> */}
          </div>
          <div className="journal-large-banner-content__description-line">
            <div className="journal-large-banner-content__description-spacer" />
            <Div className="journal-large-banner-content__description-text">
              {journal.description}
            </Div>
            <div className="journal-large-banner-content__description-spacer" />
          </div>
        </div>
        <div className="journal-large-banner-content__margin" />
      </div>
    );
  }
}
