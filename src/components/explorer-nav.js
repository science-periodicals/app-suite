import React from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { NavLink } from 'react-router-dom';
import Iconoclass from '@scipe/iconoclass';
import { Hyperlink, bemify } from '@scipe/ui';
import StartSubmissionButton from './start-submission-button';

export default class ExplorerNav extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    displayHeader: PropTypes.bool,
    onClick: PropTypes.func
  };

  static defaultProps = {
    displayHeader: true,
    onClick: noop
  };

  render() {
    const { displayHeader, user, onClick } = this.props;

    const bem = bemify('explorer-nav');

    return (
      <div className={bem``} onClick={onClick}>
        {!!displayHeader && (
          <header className={bem`__header`}>
            <h3 className={bem`__title`}>Explore</h3>

            <Hyperlink to={{ pathname: '/explore' }}>
              <Iconoclass iconName="home" size="16px" />
            </Hyperlink>
          </header>
        )}

        <div className={bem`__content`}>
          <ul className={bem`__nav-list`}>
            <li className={bem`__nav-list-item`}>
              <NavLink to="/explore/journals">
                <Iconoclass iconName="journal" size="16px" />
                <span>Journals</span>
              </NavLink>
            </li>

            <li className={bem`__nav-list-item`}>
              <NavLink to="/explore/articles">
                <Iconoclass iconName="manuscript" size="16px" />
                <span>Articles</span>
              </NavLink>
            </li>

            <li className={bem`__nav-list-item`}>
              <NavLink to="/explore/rfas">
                <Iconoclass iconName="rfaRound" size="16px" />
                <span>
                  Requests For Articles (
                  <abbr title="Requests For Articles">RFAs</abbr>)
                </span>
              </NavLink>
            </li>
          </ul>

          <div className={bem`__submit`}>
            <StartSubmissionButton user={user} raised={true} reset={false}>
              Start a submission
            </StartSubmissionButton>
          </div>
        </div>
      </div>
    );
  }
}
