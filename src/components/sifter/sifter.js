import React from 'react';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import { createId } from '@scipe/librarian';
import { getId, arrayify } from '@scipe/jsonld';
import {
  BemTags,
  Card,
  Menu,
  MenuItem,
  HeaderSearch,
  HeaderSearchFieldChild,
  HeaderSearchLeft,
  HeaderSearchRight,
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutBanner,
  AppLayoutLeft,
  AppLayoutRight,
  AppLayoutMiddle,
  AppLayoutFooter,
  Hyperlink,
  Logo,
  CSS_TABLET,
  StartMenu
} from '@scipe/ui';
import SifterHeader from './sifter-header';
import JournalNav from './journal-nav';
import SifterFacets from './sifter-facets';
import { searchRfas } from '../../actions/rfa-action-creators';
import { searchGraphs } from '../../actions/graph-action-creators';
import { searchIssues } from '../../actions/issue-action-creators';
import { createReadOnlyUserSelector } from '../../selectors/user-selectors';
import ConnectedUserBadgeMenu from '../connected-user-badge-menu';
import { SIFTER_FACETS } from '../../constants';
import FeaturedArticleCard from './featured-article-card';
import FeaturedIssueCard from './featured-issue-card';
import Droplet from '../droplet';
import withShowPanel from '../../hoc/with-show-panel';
import SifterList from './sifter-list';
import Loading from '../loading';

/**
 * This is used to provide:
 * - Journal homepage
 * - List of issues
 * - Issue homepage
 * - List of RFAs
 */
class Sifter extends React.Component {
  static propTypes = {
    mode: PropTypes.oneOf([
      'journal', // journal homepage, search for articles
      'issues', // list of issues (search for issues)
      'issue', // issue homepage (search for article within that issue)
      'requests'
    ]),
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    match: PropTypes.shape({
      params: PropTypes.shape({
        issueId: PropTypes.string // only defined in `issue` mode
      })
    }),

    // withShowPanel HoC
    showPanel: PropTypes.bool.isRequired,
    onPanelClick: PropTypes.func.isRequired,
    onTogglePanel: PropTypes.func.isRequired,

    // redux
    screenWidth: PropTypes.string,
    query: PropTypes.object,
    user: PropTypes.object,
    journal: PropTypes.object,
    issue: PropTypes.object,
    disabled: PropTypes.bool.isRequired,
    graphSearchIsActive: PropTypes.bool.isRequired,
    issueSearchIsActive: PropTypes.bool.isRequired,
    rfasSearchIsActive: PropTypes.bool.isRequired,

    searchGraphs: PropTypes.func.isRequired,
    searchIssues: PropTypes.func.isRequired,
    searchRfas: PropTypes.func.isRequired
  };

  static defaultProps = {
    issue: {},
    graphSearchResults: {}
  };

  static getDerivedStateFromProps(props, state) {
    const nextIsSearched =
      !!props.query.search || SIFTER_FACETS.some(facet => !!props.query[facet]);

    return {
      isSearched: nextIsSearched,
      lastIsSearched: state.isSearched
    };
  }

  constructor(props) {
    super(props);

    const isSearched =
      !!props.query.search || SIFTER_FACETS.some(facet => !!props.query[facet]);

    this.state = {
      searchValue: props.query.search,
      isSearched,
      lastIsSearched: isSearched
    };
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    this.search({ reset: true });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.mode !== prevProps.mode) {
      // `journal` and `issue` modes share the same reducer so we need to reset when we switch mode
      const reset =
        this.props.mode === 'journal' || this.props.mode === 'issue';
      this.search({ reset });
    }

    // rescroll to top when we switch modes or change search
    if (
      this.props.mode !== prevProps.mode ||
      this.state.isSearched !== prevState.isSearched ||
      (this.props.query.search !== prevProps.query.search ||
        SIFTER_FACETS.some(
          facet => this.props.query[facet] !== prevProps.query[facet]
        ))
    ) {
      window.scrollTo(0, 0);
    }
  }

  search({ reset, nextQuery, nextUrl } = {}) {
    const {
      history,
      searchGraphs,
      searchIssues,
      searchRfas,
      mode,
      journal,
      query,
      match: {
        params: { issueId } // Note: when the component mount `issue` may not be defined yet
      }
    } = this.props;

    switch (mode) {
      case 'journal':
        searchGraphs({
          history,
          query,
          nextQuery,
          nextUrl,
          reset
        });
        break;
      case 'issue':
        searchGraphs({
          issueId: createId('issue', issueId, journal)['@id'],
          history,
          query,
          nextQuery,
          nextUrl,
          reset
        });
        break;

      case 'issues':
        searchIssues(journal, {
          history,
          query,
          nextQuery,
          nextUrl,
          reset
        });
        break;

      case 'requests':
        searchRfas({
          history,
          query,
          nextQuery,
          nextUrl,
          reset,
          journal
        });
        break;
    }
  }

  handleChangeSearch = e => {
    this.setState({ searchValue: e.target.value });
  };

  handleSubmitSearch = e => {
    const value = e.target.value && e.target.value.trim();
    const { query } = this.props;

    if (value !== query.search) {
      const nextQuery = value
        ? Object.assign({}, query, { search: value })
        : omit(query, ['search']);

      this.search({ nextQuery });
    }
  };

  handleToggleFacet = nextQuery => {
    this.search({ nextQuery });
  };

  handleChangeMode = nextMode => {
    const { history, location } = this.props;
    history.push({
      pathname:
        nextMode === 'issues'
          ? '/issues'
          : nextMode === 'requests'
          ? '/rfas'
          : '/',
      search: location.search
    });
  };

  handleMore = nextUrl => {
    this.search({ nextUrl });
  };

  render() {
    const { searchValue, isSearched, lastIsSearched } = this.state;
    const {
      location,
      disabled,
      user,
      mode,
      journal,
      issue,
      graphSearchIsActive,
      issueSearchIsActive,
      rfasSearchIsActive,
      screenWidth,
      showPanel,
      onTogglePanel,
      query
    } = this.props;

    // we reshape into a list of items
    // if we are in search mode (`isSearched` is true), we don't display the issues
    let featured, isSearching;
    switch (mode) {
      case 'requests': {
        featured = [];
        isSearching = rfasSearchIsActive;
        break;
      }

      case 'issues': {
        featured = arrayify(journal.workFeatured);
        isSearching = issueSearchIsActive;
        break;
      }

      case 'issue': {
        featured = arrayify(issue.workFeatured);
        isSearching = graphSearchIsActive;
        break;
      }

      case 'journal':
        featured = arrayify(journal.workFeatured);
        isSearching = graphSearchIsActive;
        break;

      default:
        return null;
    }

    const bem = BemTags();

    const isReadyForBackstop = !isSearching; // TODO take into account banners image loading

    return (
      <div
        className={bem`sifter`}
        data-test-ready={isReadyForBackstop.toString()}
      >
        <AppLayout leftExpanded={showPanel} rightExpanded={true}>
          <AppLayoutHeader>
            <HeaderSearch
              loading={isSearching}
              onSubmitSearch={this.handleSubmitSearch}
              onChangeSearch={this.handleChangeSearch}
              searchValue={searchValue}
              onSearchMenuClick={onTogglePanel}
            >
              {mode !== 'issue' && (
                <HeaderSearchFieldChild
                  className={bem`__search-pseudo-tag-menu`}
                >
                  <Menu
                    title={
                      mode === 'journal'
                        ? 'Articles'
                        : mode === 'issues'
                        ? 'Issues'
                        : 'RFAs'
                    }
                    onChange={this.handleChangeMode}
                    portal={true}
                    align="right"
                    iconName="dropdown"
                    iconSize={12}
                  >
                    <MenuItem
                      icon={{ iconName: 'manuscript' }}
                      value="journal"
                      onClick={() => this.handleChangeMode('journal')}
                    >
                      Articles
                    </MenuItem>
                    <MenuItem
                      icon={{ iconName: 'journal' }}
                      value="issues"
                      onClick={() => this.handleChangeMode('issues')}
                    >
                      Issues
                    </MenuItem>

                    <MenuItem
                      icon={{ iconName: 'rfa' }}
                      value="RFAs"
                      onClick={() => this.handleChangeMode('requests')}
                    >
                      Request for articles
                    </MenuItem>
                  </Menu>
                </HeaderSearchFieldChild>
              )}

              <HeaderSearchLeft>
                <div className={bem`__logo-container`}>
                  <Hyperlink
                    to={{
                      pathname: '/',
                      search: query.hostname
                        ? `?hostname=${query.hostname}`
                        : undefined
                    }}
                  >
                    <Logo logo={journal.logo} className={bem`__header-logo`} />
                  </Hyperlink>
                </div>
              </HeaderSearchLeft>

              <HeaderSearchRight>
                <div className={bem`__header-right`}>
                  <StartMenu reset={true} />
                  <ConnectedUserBadgeMenu
                    disabled={disabled}
                    forceResetSubdomain={true}
                  />
                </div>
              </HeaderSearchRight>
            </HeaderSearch>
          </AppLayoutHeader>

          <AppLayoutBanner>
            <SifterHeader journal={journal} issue={issue} mode={mode} />
          </AppLayoutBanner>

          <AppLayoutLeft backgroundOnDesktop={false}>
            {screenWidth <= CSS_TABLET && (
              <div className={bem`__left-journal-nav`}>
                <JournalNav user={user} journal={journal} location={location} />
              </div>
            )}
            <SifterFacets
              mode={mode}
              query={query}
              onToggleFacet={this.handleToggleFacet}
            />
          </AppLayoutLeft>

          <AppLayoutMiddle widthMode="auto">
            {/* re-rendering <SifterList /> is CPU intensive => we put a loader we we switch from journal homepage rendering to search rendering (`isSearched`). within a given value if `isSearched`, `<SifterList /> won't re-render based on isSearching so we can skip the <Loading /> and keep the list on screen  */}
            {lastIsSearched !== isSearched && isSearching ? (
              <Loading />
            ) : (
              <SifterList
                mode={mode}
                issue={issue}
                hostname={query.hostname}
                disabled={disabled}
                isSearched={isSearched}
                isSearching={isSearching}
                onMore={this.handleMore}
              />
            )}
          </AppLayoutMiddle>

          <AppLayoutRight backgroundOnDesktop={false}>
            <div className={bem`__featured-content`}>
              {screenWidth > CSS_TABLET && (
                <Card>
                  <JournalNav
                    user={user}
                    journal={journal}
                    hostname={query.hostname}
                  />
                </Card>
              )}
              {featured.map(work => (
                <Droplet key={getId(work)} node={work} latest={true}>
                  {work =>
                    work['@type'] === 'Graph' ? (
                      <FeaturedArticleCard
                        query={query}
                        journal={journal}
                        graph={work}
                      />
                    ) : work['@type'] === 'PublicationIssue' ||
                      work['@type'] === 'SpecialPublicationIssue' ? (
                      <FeaturedIssueCard
                        query={query}
                        journal={journal}
                        issue={work}
                      />
                    ) : null
                  }
                </Droplet>
              ))}
            </div>
          </AppLayoutRight>

          <AppLayoutFooter>
            <Footer padding="small" sticky={true} hideCopyright={true} />
          </AppLayoutFooter>
        </AppLayout>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.screenWidth,
    (state, props) => props.location.search,
    (state, props) => props.match.params.issueId,
    state => state.user,
    state => state.homepage,
    createReadOnlyUserSelector(),
    state => state.graphSearchResults.status === 'active', // TODO update reducer so that it isues active boolean instead of `status`
    state => state.issueSearchResults.active,
    state => state.rfasSearchResults.isActive,
    state => state.droplets,
    (
      screenWidth,
      search,
      issueId,
      user,
      homepage,
      disabled,
      graphSearchIsActive,
      issueSearchIsActive,
      rfasSearchIsActive,
      droplets
    ) => {
      if (issueId) {
        issueId = createId('issue', issueId, homepage)['@id'];
      }

      return {
        screenWidth,
        user,
        query: querystring.parse(search.substring(1)),
        issue: droplets[issueId],
        disabled,
        journal: homepage,
        issueSearchIsActive,
        graphSearchIsActive,
        rfasSearchIsActive
      };
    }
  ),
  { searchGraphs, searchIssues, searchRfas }
)(withShowPanel(Sifter));
