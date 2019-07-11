import React from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import { Switch, Route, NavLink } from 'react-router-dom';
import Iconoclass from '@scipe/iconoclass';
import { Acl } from '@scipe/librarian';
import { arrayify, getId } from '@scipe/jsonld';
import {
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutBanner,
  AppLayoutLeft,
  AppLayoutMiddle,
  AppLayoutRight,
  AppLayoutFooter,
  Header,
  BemTags,
  StartMenu
} from '@scipe/ui';
import { createReadOnlyUserSelector } from '../../selectors/user-selectors';
import JournalInfo from './journal-info';
import JournalMasthead from './journal-masthead';
import { fetchJournal } from '../../actions/journal-action-creators';
import ConnectedUserBadgeMenu from '../connected-user-badge-menu';
import SifterHeader from './sifter-header';
import FeaturedArticleCard from './featured-article-card';
import FeaturedIssueCard from './featured-issue-card';
import Droplet from '../droplet';
import withShowPanel from '../../hoc/with-show-panel';
import JournalRfa from '../journal-rfa';

class JournalPage extends React.Component {
  static propTypes = {
    location: PropTypes.object.isRequired,
    match: PropTypes.object.isRequired,

    // withShowPanel HoC
    showPanel: PropTypes.bool.isRequired,
    onPanelClick: PropTypes.func.isRequired,
    onTogglePanel: PropTypes.func.isRequired,

    // redux
    screenWidth: PropTypes.string,
    disabled: PropTypes.bool,
    user: PropTypes.object,
    journal: PropTypes.object,
    droplets: PropTypes.object,
    fetchJournal: PropTypes.func.isRequired
  };

  static defaultProps = {
    journal: {},
    droplets: {}
  };

  componentDidMount() {
    const { journal, fetchJournal } = this.props;

    window.scrollTo(0, 0);
    fetchJournal(getId(journal), {
      homepage: true
    });
  }

  handleTogglePanel = e => {
    this.setState({ showPanel: !this.state.showPanel });
  };

  render() {
    const {
      user,
      journal,
      droplets,
      location,
      match,
      showPanel,
      onTogglePanel,
      onPanelClick
    } = this.props;

    const query = querystring.parse(location.search.substring(1));
    const { hostname } = query;

    const acl = new Acl(journal);

    const bem = BemTags();

    return (
      <AppLayout
        leftExpanded={showPanel}
        rightExpanded={true}
        className={bem`journal-page`}
      >
        <AppLayoutHeader>
          <Header
            showHamburger={true}
            onClickHamburger={onTogglePanel}
            crumbs={getCrumbs(location, match)}
            userBadgeMenu={
              <ConnectedUserBadgeMenu forceResetSubdomain={true} />
            }
            startMenu={<StartMenu reset={true} />}
            homeLink={{
              to: {
                pathname: '/',
                search: query.hostname
                  ? `hostname=${query.hostname}`
                  : undefined
              }
            }}
            showHome={true}
            logo={journal.logo}
            logoLink={{
              to: {
                pathname: '/',
                search: query.hostname
                  ? `hostname=${query.hostname}`
                  : undefined
              }
            }}
          />
        </AppLayoutHeader>

        <AppLayoutBanner>
          <SifterHeader journal={journal} mode="journal" />
        </AppLayoutBanner>

        <AppLayoutLeft backgroundOnDesktop={false}>
          <nav className={bem`__page-nav`} onClick={onPanelClick}>
            <ul className={bem`__page-nav-list`}>
              <li className={bem`__page-nav-list-item`}>
                <NavLink
                  to={{
                    pathname: '/about/journal',
                    search: hostname ? `?hostname=${hostname}` : undefined
                  }}
                >
                  <Iconoclass
                    iconName="info"
                    size="16px"
                    className={bem`__page-nav-list-icon`}
                  />
                  About
                </NavLink>
              </li>

              <li className={bem`__page-nav-list-item`}>
                <NavLink
                  to={{
                    pathname: '/about/staff',
                    search: hostname ? `?hostname=${hostname}` : undefined
                  }}
                >
                  <Iconoclass
                    iconName="roleEditorGroup"
                    size="16px"
                    className={bem`__page-nav-list-icon`}
                  />
                  Journal staff
                </NavLink>
              </li>

              <li className={bem`__page-nav-list-item`}>
                <NavLink
                  to={{
                    pathname: '/',
                    search: hostname ? `?hostname=${hostname}` : undefined
                  }}
                >
                  <Iconoclass
                    iconName="manuscript"
                    size="16px"
                    className={bem`__page-nav-list-icon`}
                  />
                  Articles
                </NavLink>
              </li>

              <li className={bem`__page-nav-list-item`}>
                <NavLink
                  to={{
                    pathname: '/issues',
                    search: hostname ? `?hostname=${hostname}` : undefined
                  }}
                >
                  <Iconoclass
                    iconName="journal"
                    size="16px"
                    className={bem`__page-nav-list-icon`}
                  />
                  Issues
                </NavLink>
              </li>

              <li className={bem`__page-nav-list-item`}>
                <NavLink
                  to={{
                    pathname: '/rfas',
                    search: hostname ? `?hostname=${hostname}` : undefined
                  }}
                >
                  <Iconoclass
                    iconName="rfaRound"
                    size="16px"
                    className={bem`__page-nav-list-icon`}
                  />
                  Requests for articles (
                  <abbr title="Requests for articles">RFAs</abbr>)
                </NavLink>
              </li>
            </ul>
          </nav>
        </AppLayoutLeft>

        <AppLayoutMiddle widthMode="auto">
          <div
            data-test-ready={'true' /* We hard code true given SSR */}
            className={bem`__page-body`}
          >
            <Switch>
              <Route
                exact={true}
                path="/about/journal"
                render={props => (
                  <JournalInfo
                    {...props}
                    user={user}
                    acl={acl}
                    journal={journal}
                    droplets={droplets}
                  />
                )}
              />
              <Route
                exact={true}
                path="/about/staff"
                render={props => (
                  <JournalMasthead
                    {...props}
                    user={user}
                    acl={acl}
                    journal={journal}
                    droplets={droplets}
                  />
                )}
              />
              <Route
                exact={true}
                path="/rfas/:rfaId"
                render={props => (
                  <JournalRfa
                    {...props}
                    user={user}
                    acl={acl}
                    journal={journal}
                  />
                )}
              />
            </Switch>
          </div>
        </AppLayoutMiddle>

        <AppLayoutRight backgroundOnDesktop={false}>
          <div className={bem`__featured-content`}>
            {arrayify(journal.workFeatured).map(work => (
              <Droplet key={getId(work)} node={work} latest={true}>
                {work =>
                  work['@type'] === 'Graph' ? (
                    <FeaturedArticleCard query={query} graph={work} />
                  ) : (
                    <FeaturedIssueCard
                      query={query}
                      journal={journal}
                      issue={work}
                    />
                  )
                }
              </Droplet>
            ))}
          </div>
        </AppLayoutRight>

        <AppLayoutFooter>
          <Footer padding="small" sticky={true} hideCopyright={true} />
        </AppLayoutFooter>
      </AppLayout>
    );
  }
}

export default connect(
  createSelector(
    state => state.screenWidth,
    state => state.user,
    state => state.homepage,
    createReadOnlyUserSelector(),
    state => state.droplets,
    (screenWidth, user, journal, disabled, droplets) => {
      return {
        screenWidth,
        user,
        disabled,
        journal,
        droplets
      };
    }
  ),
  {
    fetchJournal
  }
)(withShowPanel(JournalPage));

function getCrumbs(location = {}, match = {}) {
  const { pathname = '' } = location;
  if (pathname.match(/about\/staff/)) {
    return [
      {
        key: 'staff',
        to: { pathname: location.pathname, search: location.search },
        children: 'Journal staff'
      }
    ];
  }

  if (pathname.match(/about\/journal/)) {
    return [
      {
        key: 'about',
        to: { pathname: location.pathname, search: location.search },
        children: 'About'
      }
    ];
  }

  if (pathname.match(/rfas\//)) {
    const crumbs = [
      {
        key: 'rfa',
        to: { pathname: '/rfas', search: location.search },
        children: 'Request for Articles'
      }
    ];

    if (match && match.params && match.params.rfaId) {
      crumbs.push({
        key: 'rfaId',
        to: { pathname: location.pathname, search: location.search },
        children: match.params.rfaId
      });
    }
    return crumbs;
  }
}
