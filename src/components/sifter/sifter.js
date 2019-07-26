import React from 'react';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import debounce from 'lodash/debounce';
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
    graphSearchResults: PropTypes.shape({
      numberOfItems: PropTypes.number,
      nextUrl: PropTypes.string,
      status: PropTypes.oneOf(['active', 'success', 'error']),
      graphIds: PropTypes.array.isRequired,
      newGraphIds: PropTypes.array.isRequired,
      error: PropTypes.instanceOf(Error)
    }).isRequired,
    issueSearchResults: PropTypes.object.isRequired, // same shape as `graphSearchResults`

    rfasSearchResults: PropTypes.shape({
      numberOfItems: PropTypes.number,
      nextUrl: PropTypes.string,
      isActive: PropTypes.bool,
      rfaIds: PropTypes.array.isRequired,
      error: PropTypes.instanceOf(Error)
    }).isRequired,

    searchGraphs: PropTypes.func.isRequired,
    searchIssues: PropTypes.func.isRequired,
    searchRfas: PropTypes.func.isRequired
  };

  static defaultProps = {
    issue: {},
    graphSearchResults: {}
  };

  constructor(props) {
    super(props);

    this.state = {
      searchValue: ''
    };

    this.handleDebouncedSearch = debounce(
      this.handleDebouncedSearch.bind(this),
      300
    );
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
  }

  componentWillUnmount() {
    this.handleDebouncedSearch.cancel();
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
    const value = e.target.value && e.target.value.trim();
    this.setState({ searchValue: e.target.value });
    this.handleDebouncedSearch(value);
  };

  handleDebouncedSearch(value) {
    const { query } = this.props;

    const nextQuery = value
      ? Object.assign({}, query, { search: value })
      : omit(query, ['search']);

    this.search({ nextQuery });
  }

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
    const { searchValue } = this.state;
    const {
      location,
      disabled,
      user,
      mode,
      journal,
      issue,
      graphSearchResults,
      issueSearchResults,
      rfasSearchResults,
      screenWidth,
      showPanel,
      onTogglePanel,
      query
    } = this.props;

    const isSearched =
      !!searchValue || SIFTER_FACETS.some(facet => !!query[facet]);

    // we reshape into a list of items
    // if we are in search mode (`isSearched` is true), we don't display the issues

    let featured, isSearching;
    switch (mode) {
      case 'requests': {
        featured = [];
        isSearching = rfasSearchResults.isActive;
        break;
      }

      case 'issues': {
        featured = arrayify(journal.workFeatured);
        isSearching = issueSearchResults.active;
        break;
      }

      case 'issue': {
        featured = arrayify(issue.workFeatured);
        isSearching = graphSearchResults.status === 'active'; // TODO update reducer so that it isues active boolean instead of `status`
        break;
      }

      case 'journal':
        featured = arrayify(journal.workFeatured);
        isSearching = graphSearchResults.status === 'active'; // TODO update
        break;

      default:
        return null;
    }

    const bem = BemTags();

    const isReady = !isSearching; // TODO take into account banners

    return (
      <div className={bem`sifter`} data-test-ready={isReady.toString()}>
        <AppLayout leftExpanded={showPanel} rightExpanded={true}>
          <AppLayoutHeader>
            <HeaderSearch
              loading={isSearching}
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
            <SifterList
              mode={mode}
              issue={issue}
              hostname={query.hostname}
              disabled={disabled}
              isSearched={isSearched}
              onMore={this.handleMore}
            />
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
    state => state.graphSearchResults,
    state => state.issueSearchResults,
    state => state.rfasSearchResults,
    state => state.droplets,
    (
      screenWidth,
      search,
      issueId,
      user,
      homepage,
      disabled,
      graphSearchResults = {},
      issueSearchResults = {},
      rfasSearchResults,
      droplets
    ) => {
      if (issueId) {
        issueId = createId('issue', issueId, homepage)['@id'];
      }

      return {
        screenWidth,
        user,
        query: querystring.parse(location.search.substring(1)),
        issue: droplets[issueId],
        disabled,
        journal: homepage,
        issueSearchResults,
        graphSearchResults,
        rfasSearchResults
      };
    }
  ),
  { searchGraphs, searchIssues, searchRfas }
)(withShowPanel(Sifter));
