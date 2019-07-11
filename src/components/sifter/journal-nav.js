import React from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import { NavLink } from 'react-router-dom';
import Iconoclass from '@scipe/iconoclass';
import { Logo, BemTags, ShareMenu } from '@scipe/ui';
import StartSubmissionButton from '../start-submission-button';

export default class JournalNav extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    journal: PropTypes.object,
    location: PropTypes.object.isRequired
  };

  static defaultProps = {
    journal: {}
  };

  constructor(props) {
    super(props);

    this.state = {
      isModalOpen: false
    };
  }

  render() {
    const { user, journal, location } = this.props;

    const query = querystring.parse(location.search.substring(1));
    const { hostname } = query;

    const bem = BemTags();

    return (
      <div className={bem`journal-nav`}>
        <header className={bem`__header`}>
          <Logo logo={journal.logo} className={bem`__header-logo`} />

          <ShareMenu
            align="right"
            name={journal.name}
            description={journal.description}
            url={journal.url}
            text={journal.text}
            portal={true}
            iconSize={18}
            className={bem`__share-menu`}
          />
        </header>
        <div className={bem`__content`}>
          <ul className={bem`__nav-list`}>
            <li className={bem`__nav-list-item`}>
              <NavLink
                to={{
                  pathname: '/about/journal',
                  search: hostname ? `?hostname=${hostname}` : undefined
                }}
              >
                <Iconoclass iconName="info" size="16px" />
                About
              </NavLink>
            </li>

            <li className={bem`__nav-list-item`}>
              <NavLink
                to={{
                  pathname: '/about/staff',
                  search: hostname ? `?hostname=${hostname}` : undefined
                }}
              >
                <Iconoclass iconName="roleEditorGroup" size="16px" />
                Journal staff
              </NavLink>
            </li>

            <li className={bem`__nav-list-item`}>
              <NavLink
                to={{
                  pathname: '/',
                  search: hostname ? `?hostname=${hostname}` : undefined
                }}
              >
                <Iconoclass iconName="manuscript" size="16px" />
                Articles
              </NavLink>
            </li>

            <li className={bem`__nav-list-item`}>
              <NavLink
                to={{
                  pathname: '/issues',
                  search: hostname ? `?hostname=${hostname}` : undefined
                }}
              >
                <Iconoclass iconName="journal" size="16px" />
                Issues
              </NavLink>
            </li>

            <li className={bem`__nav-list-item`}>
              <NavLink
                to={{
                  pathname: '/rfas',
                  search: hostname ? `?hostname=${hostname}` : undefined
                }}
              >
                <Iconoclass iconName="rfaRound" size="16px" />
                Requests for articles (
                <abbr title="Requests for articles">RFAs</abbr>)
              </NavLink>
            </li>
          </ul>

          <div className={bem`__submit`}>
            <StartSubmissionButton
              user={user}
              journal={journal}
              reset={true}
              raised={true}
            />
          </div>
        </div>
      </div>
    );
  }
}
