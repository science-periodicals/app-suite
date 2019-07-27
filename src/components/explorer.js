import React from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import debounce from 'lodash/debounce';
import omit from 'lodash/omit';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import {
  AppLayout,
  AppLayoutHeader,
  AppLayoutLeft,
  AppLayoutRight,
  AppLayoutMiddle,
  AppLayoutFooter,
  HeaderSearch,
  HeaderSearchFieldChild,
  HeaderSearchLeft,
  HeaderSearchRight,
  Footer,
  Menu,
  MenuItem,
  CSS_TABLET,
  Hyperlink,
  Logo,
  PaperButton,
  Card,
  StartMenu
} from '@scipe/ui';
import { getObjectId, getRootPartId } from '@scipe/librarian';
import { getId } from '@scipe/jsonld';
import { searchGraphs } from '../actions/graph-action-creators';
import withShowPanel from '../hoc/with-show-panel';
import ConnectedUserBadgeMenu from './connected-user-badge-menu';
import PrintPdfProgressModal from './print-pdf-progress-modal';
import { searchJournals } from '../actions/journal-action-creators';
import { searchArticles } from '../actions/article-action-creators';
import { searchRfas } from '../actions/rfa-action-creators';
import ExplorerNav from './explorer-nav';
import GetStartedNav from './get-started-nav';
import ExplorerFacets from './explorer-facets';
import {
  EXPLORER_ARTICLES_FACETS,
  EXPLORER_RFAS_FACETS,
  EXPLORER_JOURNALS_FACETS
} from '../constants';
import ArticleSnippet from './article-snippet';
import RfaSnippet from './rfa-snippet';
import JournalSnippet from './journal-snippet';
import Notice from './notice';

// TODO on componentWillUnmount issue RESET_DROPLETS redux action to clear the droplets

class Explorer extends React.Component {
  static propTypes = {
    mode: PropTypes.oneOf(['journals', 'articles', 'requests']),

    // withShowPanel HoC
    showPanel: PropTypes.bool.isRequired,
    onPanelClick: PropTypes.func.isRequired,
    onTogglePanel: PropTypes.func.isRequired,

    // react router
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,

    // redux
    screenWidth: PropTypes.string,
    user: PropTypes.object,
    droplets: PropTypes.object.isRequired,

    journalsSearchResults: PropTypes.shape({
      numberOfItems: PropTypes.number,
      nextUrl: PropTypes.string,
      isActive: PropTypes.bool,
      journalIds: PropTypes.array.isRequired,
      error: PropTypes.instanceOf(Error)
    }).isRequired,

    articlesSearchResults: PropTypes.shape({
      numberOfItems: PropTypes.number,
      nextUrl: PropTypes.string,
      isActive: PropTypes.bool,
      articleIds: PropTypes.array.isRequired,
      error: PropTypes.instanceOf(Error)
    }).isRequired,

    rfasSearchResults: PropTypes.shape({
      numberOfItems: PropTypes.number,
      nextUrl: PropTypes.string,
      isActive: PropTypes.bool,
      rfaIds: PropTypes.array.isRequired,
      error: PropTypes.instanceOf(Error)
    }).isRequired,

    searchGraphs: PropTypes.func.isRequired,
    searchJournals: PropTypes.func.isRequired,
    searchArticles: PropTypes.func.isRequired,
    searchRfas: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      searchValue: ''
    };
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    this.search({ reset: true });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.mode !== prevProps.mode) {
      this.search();
    }
  }

  handleChangeMode = nextMode => {
    const { history } = this.props;
    history.push({
      pathname: `/explore/${nextMode === 'requests' ? 'rfas' : nextMode}`
    });
  };

  handleChangeSearch = e => {
    this.setState({ searchValue: e.target.value });
  };

  handleSubmitSearch = e => {
    const value = e.target.value && e.target.value.trim();
    const { location } = this.props;
    const query = querystring.parse(location.search.substring(1));

    const nextQuery = value
      ? Object.assign({}, query, { search: value })
      : omit(query, ['search']);

    this.search({ nextQuery });
  };

  handleMore(nextUrl) {
    this.search({ nextUrl });
  }

  search({ reset, nextQuery, nextUrl } = {}) {
    const {
      mode,
      searchJournals,
      searchArticles,
      searchRfas,
      history,
      location
    } = this.props;

    const query = querystring.parse(location.search.substring(1));

    switch (mode) {
      case 'journals':
        searchJournals({
          history,
          query,
          nextQuery,
          nextUrl,
          reset
        });
        break;

      case 'articles':
        searchArticles({
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
          reset
        });
        break;
    }
  }

  handleToggleFacet = nextQuery => {
    this.search({ nextQuery });
  };

  renderResult(result) {
    const { user, mode, droplets } = this.props;

    switch (mode) {
      case 'journals':
        return <JournalSnippet user={user} journal={result} />;

      case 'articles':
        return (
          <ArticleSnippet
            user={user}
            disabled={true}
            journal={droplets[getRootPartId(result)]}
            graph={result}
            workflow={droplets[getId(result.workflow)]}
            ctx="explorer"
          />
        );

      case 'requests':
        return (
          <RfaSnippet
            user={user}
            rfa={result}
            journal={droplets[getObjectId(result)]}
          />
        );
    }
  }

  render() {
    const {
      user,
      showPanel,
      onTogglePanel,
      screenWidth,
      mode,
      location,
      journalsSearchResults,
      articlesSearchResults,
      rfasSearchResults,
      droplets,
      onPanelClick
    } = this.props;

    const { searchValue } = this.state;

    const query = querystring.parse(location.search.substring(1));

    let results, isSearched, isSearching, nextUrl;
    switch (mode) {
      case 'journals': {
        results = journalsSearchResults.journalIds
          .map(journalId => droplets[journalId])
          .filter(Boolean);
        isSearched =
          !!searchValue ||
          EXPLORER_JOURNALS_FACETS.some(facet => !!query[facet]);
        isSearching = journalsSearchResults.isActive;
        nextUrl =
          journalsSearchResults.nextUrl &&
          journalsSearchResults.journalIds.length <
            journalsSearchResults.numberOfItems
            ? journalsSearchResults.nextUrl
            : null;

        break;
      }

      case 'articles': {
        results = articlesSearchResults.articleIds
          .map(articleId => droplets[articleId])
          .filter(Boolean);
        isSearched =
          !!searchValue ||
          EXPLORER_ARTICLES_FACETS.some(facet => !!query[facet]);
        isSearching = articlesSearchResults.isActive;
        nextUrl =
          articlesSearchResults.nextUrl &&
          articlesSearchResults.articleIds.length <
            articlesSearchResults.numberOfItems
            ? articlesSearchResults.nextUrl
            : null;

        break;
      }

      case 'requests': {
        results = rfasSearchResults.rfaIds
          .map(rfaId => droplets[rfaId])
          .filter(Boolean);
        isSearched =
          !!searchValue || EXPLORER_RFAS_FACETS.some(facet => !!query[facet]);
        isSearching = rfasSearchResults.isActive;
        nextUrl =
          rfasSearchResults.nextUrl &&
          rfasSearchResults.rfaIds.length < rfasSearchResults.numberOfItems
            ? rfasSearchResults.nextUrl
            : null;

        break;
      }
    }

    const isReady = !isSearching;

    return (
      <div className="explorer" data-test-ready={isReady.toString()}>
        <AppLayout leftExpanded={showPanel} rightExpanded={true}>
          <AppLayoutHeader>
            <HeaderSearch
              loading={isSearching}
              onSubmitSearch={this.handleSubmitSearch}
              onChangeSearch={this.handleChangeSearch}
              searchValue={searchValue}
              onSearchMenuClick={onTogglePanel}
            >
              <HeaderSearchFieldChild className="explorer__search-pseudo-tag-menu">
                <Menu
                  title={
                    mode === 'journals'
                      ? 'Journals'
                      : mode === 'articles'
                      ? 'Articles'
                      : 'RFAs'
                  }
                  onChange={this.handleChangeMode}
                  portal={true}
                  align="right"
                  iconName="dropdown"
                  iconSize={12}
                >
                  <MenuItem
                    icon={{ iconName: 'journal' }}
                    value="journals"
                    onClick={() => this.handleChangeMode('journals')}
                  >
                    Journals
                  </MenuItem>
                  <MenuItem
                    icon={{ iconName: 'manuscript' }}
                    value="articles"
                    onClick={() => this.handleChangeMode('articles')}
                  >
                    Articles
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

              <HeaderSearchLeft>
                <div className="explorer__logo-container">
                  <Hyperlink
                    to={{
                      pathname: '/'
                    }}
                  >
                    <Logo className="explorer__header-logo" />
                  </Hyperlink>
                </div>
              </HeaderSearchLeft>
              <HeaderSearchRight>
                <div className="explorer__header-right">
                  <div className="exlporer__start-menu">
                    <StartMenu />
                  </div>
                  <ConnectedUserBadgeMenu />
                </div>
              </HeaderSearchRight>
            </HeaderSearch>
          </AppLayoutHeader>

          <AppLayoutLeft backgroundOnDesktop={false}>
            {screenWidth <= CSS_TABLET && (
              <div className="explorer__left-nav">
                <ExplorerNav
                  user={user}
                  displayHeader={false}
                  onClick={onPanelClick}
                />
              </div>
            )}
            <ExplorerFacets
              mode={mode}
              query={query}
              onToggleFacet={this.handleToggleFacet}
            />
          </AppLayoutLeft>

          <AppLayoutMiddle widthMode="auto">
            {!isSearching && results.length === 0 && isSearched ? (
              <Notice>No search results</Notice>
            ) : null}

            <div className="explorer__content-list">
              {
                <ul className="sa__clear-list-styles">
                  {results.map(result => (
                    <li
                      className="explorer__content-list-item"
                      key={getId(result)}
                    >
                      {this.renderResult(result)}
                    </li>
                  ))}
                </ul>
              }

              {nextUrl && (
                <div className={'explorer__more-button-container'}>
                  <PaperButton onClick={this.handleMore.bind(this, nextUrl)}>
                    More
                  </PaperButton>
                </div>
              )}
            </div>
            <PrintPdfProgressModal />
          </AppLayoutMiddle>

          <AppLayoutRight backgroundOnDesktop={false}>
            <div className="explorer__featured-content">
              {screenWidth > CSS_TABLET && (
                <React.Fragment>
                  <Card>
                    <GetStartedNav />
                  </Card>
                  <Card>
                    <ExplorerNav user={user} />
                  </Card>
                </React.Fragment>
              )}
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
    state => state.user,
    state => state.journalsSearchResults,
    state => state.articlesSearchResults,
    state => state.rfasSearchResults,
    state => state.droplets,
    (
      screenWidth,
      user,
      journalsSearchResults,
      articlesSearchResults,
      rfasSearchResults,
      droplets
    ) => {
      return {
        screenWidth,
        user,
        journalsSearchResults,
        articlesSearchResults,
        rfasSearchResults,
        droplets
      };
    }
  ),
  { searchGraphs, searchJournals, searchArticles, searchRfas }
)(withShowPanel(Explorer));
