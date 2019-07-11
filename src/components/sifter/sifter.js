import React from 'react';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import debounce from 'lodash/debounce';
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import flatten from 'lodash/flatten';
import { Link } from 'react-router-dom';
import { getScopeId, Acl, createId } from '@scipe/librarian';
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
  AppLayoutStickyList,
  AppLayoutStickyListItem,
  AppLayoutListItem,
  Hyperlink,
  Logo,
  PaperButton,
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
import ArticleSnippet from '../article-snippet';
import IssueSnippet from './issue-snippet';
import PublicationTypeSnippet from './publication-type-snippet';
import Droplet from '../droplet';
import PrintPdfProgressModal from '../print-pdf-progress-modal';
import Notice from '../notice';
import withShowPanel from '../../hoc/with-show-panel';
import RfaSnippet from '../rfa-snippet';

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

    droplets: PropTypes.object.isRequired,
    searchGraphs: PropTypes.func.isRequired,
    searchIssues: PropTypes.func.isRequired,
    searchRfas: PropTypes.func.isRequired
  };

  static defaultProps = {
    issue: {},
    graphSearchResults: {},
    droplets: {}
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
      location,
      searchGraphs,
      searchIssues,
      searchRfas,
      mode,
      journal,
      match: {
        params: { issueId } // Note: when the component mount `issue` may not be defined yet
      }
    } = this.props;
    const query = querystring.parse(location.search.substring(1));

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
    const { location } = this.props;
    const query = querystring.parse(location.search.substring(1));

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

  handleMore(nextUrl) {
    this.search({ nextUrl });
  }

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
      droplets,
      screenWidth,
      showPanel,
      onTogglePanel
    } = this.props;

    const query = querystring.parse(location.search.substring(1));

    const acl = new Acl(journal);
    const canWrite = acl.checkPermission(user, 'WritePermission');

    const isSearched =
      !!searchValue || SIFTER_FACETS.some(facet => !!query[facet]);

    // we reshape into a list of items
    // if we are in search mode (`isSearched` is true), we don't display the issues

    const items = arrayify(graphSearchResults.graphIds)
      .map(graphId => droplets[graphId])
      .filter(Boolean);

    let results, featured, isSearching, nextUrl;
    switch (mode) {
      case 'requests': {
        const requests = rfasSearchResults.rfaIds
          .map(rfaId => droplets[rfaId])
          .filter(Boolean);

        featured = [];
        results = [{ '@id': `${mode}-search`, hasPart: requests }];
        isSearching = rfasSearchResults.isActive;
        nextUrl =
          rfasSearchResults.nextUrl &&
          rfasSearchResults.rfaIds.length < rfasSearchResults.numberOfItems
            ? rfasSearchResults.nextUrl
            : null;
        break;
      }

      case 'issues': {
        const issues = issueSearchResults.issueIds
          .map(id => droplets[id])
          .filter(Boolean);

        featured = arrayify(journal.workFeatured);
        results = [{ '@id': `${mode}-search`, hasPart: issues }];
        isSearching = issueSearchResults.active;
        nextUrl =
          issueSearchResults.nextUrl &&
          issueSearchResults.issueIds.length < issueSearchResults.numberOfItems
            ? issueSearchResults.nextUrl
            : null;
        break;
      }

      case 'issue': {
        const articles = graphSearchResults.graphIds
          .map(id => droplets[id])
          .filter(Boolean);

        featured = arrayify(issue.workFeatured);
        isSearching = graphSearchResults.status === 'active'; // TODO update reducer so that it isues active boolean instead of `status`
        nextUrl =
          graphSearchResults.nextUrl &&
          graphSearchResults.graphIds.length < graphSearchResults.numberOfItems
            ? graphSearchResults.nextUrl
            : null;

        if (isSearched) {
          results = [{ '@id': `${mode}-search`, hasPart: articles }];
        } else {
          // group by publication type (`additionalType`)
          const typeMap = articles.reduce((typeMap, article) => {
            const types = arrayify(article.additionalType);
            types.forEach(type => {
              const typeId = getId(type);

              if (typeId) {
                if (typeof type === 'string') {
                  type = { '@id': typeId };
                }

                if (typeMap[typeId]) {
                  // merge data
                  typeMap[typeId] = Object.assign({}, typeMap[typeId], type);
                } else {
                  typeMap[typeId] = type;
                }
              }
            });
            return typeMap;
          }, {});

          results = Object.keys(typeMap).map(typeId => {
            const type = droplets[typeId] || typeMap[typeId];

            return {
              '@id': typeId,
              type: type,
              hasPart: articles
                .filter(article =>
                  arrayify(article.additionalType).some(
                    type => getId(type) === typeId
                  )
                )
                .sort((a, b) =>
                  a.datePublished < b.datePublished
                    ? 1
                    : a.datePublished > b.datePublished
                    ? -1
                    : 0
                )
            };
          });
        }
        break;
      }

      case 'journal':
        featured = arrayify(journal.workFeatured);
        isSearching = graphSearchResults.status === 'active'; // TODO update
        nextUrl =
          graphSearchResults.nextUrl &&
          graphSearchResults.graphIds.length < graphSearchResults.numberOfItems
            ? graphSearchResults.nextUrl
            : null;

        if (isSearched) {
          results = [{ '@id': `${mode}-search`, hasPart: items }];
        } else {
          // We group graphs by issue with a special `unalocated` key for graphs not part of a sequential issue _yet_ (those would be first).
          // Those issues (and virtual issue) will be sorted chronologically
          // get set of issues
          const issueIds = new Set(
            Array.from(
              new Set(
                flatten(
                  items.map(graph => arrayify(graph.isPartOf).map(getId))
                ).filter(issueId => issueId && issueId.startsWith('issue:'))
              )
            )
              .map(issueId => droplets[issueId])
              .filter(issue => issue)
              .map(getId)
          );

          const byIssueId = items.reduce((byIssueId, graph) => {
            let hasSequentialIssue;
            for (const part of arrayify(graph.isPartOf)) {
              if (issueIds.has(getId(part))) {
                const issue = droplets[getId(part)];
                if (issue['@type'] === 'PublicationIssue') {
                  hasSequentialIssue = true;
                }
                if (!byIssueId[getId(part)]) {
                  byIssueId[getId(part)] = [];
                }
                byIssueId[getId(part)].push(graph);
              }
            }
            if (!hasSequentialIssue) {
              if (!byIssueId.unalocated) {
                byIssueId.unalocated = [];
              }
              byIssueId.unalocated.push(graph);
            }

            return byIssueId;
          }, {});

          results = Object.keys(byIssueId)
            .map(issueId => {
              const issue = droplets[issueId];

              let parts;
              if (issue && issue['@type'] === 'SpecialPublicationIssue') {
                // we resort the Graphs for sequential issue but keep the original issue order for Special issues
                // !! the special issue list the parts with ?version=latest => won't be present in droplets => we create a byScopeId map to circumvent that
                const byScopeId = byIssueId[issueId].reduce((map, graph) => {
                  map[getScopeId(graph)] = graph;
                  return map;
                }, {});

                parts = arrayify(issue.hasPart)
                  .map(part => byScopeId[getScopeId(part)])
                  .filter(Boolean);
              } else {
                parts = byIssueId[issueId]
                  .filter(Boolean)
                  .sort((a, b) =>
                    a.datePublished < b.datePublished
                      ? 1
                      : a.datePublished > b.datePublished
                      ? -1
                      : 0
                  );
              }

              return {
                '@id': issueId,
                issue,
                hasPart: parts
              };
            })
            .sort((a, b) => {
              // sort chronologicaly
              const datePublishedA = a.issue
                ? a.issue.datePublished
                : a.hasPart[0].datePublished;
              const datePublishedB = b.issue
                ? b.issue.datePublished
                : b.hasPart[0].datePublished;

              return datePublishedA < datePublishedB
                ? 1
                : datePublishedA > datePublishedB
                ? -1
                : 0;
            });
        }
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
            <div className={bem`__notices`}>
              {!isSearching &&
              (results.length === 0 ||
                (results.length === 1 &&
                  results[0].hasPart &&
                  results[0].hasPart.length === 0)) ? (
                isSearched ? (
                  <Notice>No search results</Notice>
                ) : mode === 'issues' ? (
                  <Notice>
                    The journal hasn‘t published issues yet. Please check back
                    later.
                  </Notice>
                ) : mode === 'requests' ? (
                  <Notice>
                    The journal hasn‘t published requests for articles (
                    <abbr title="Request For Articles">RFA</abbr>s) yet. Please
                    check back later.
                  </Notice>
                ) : (
                  <Notice>
                    <div>
                      The journal has no published articles yet, please check
                      back later. To learn about the journal or to submit a new
                      manuscript to the journal, visit the{' '}
                      <Link
                        to={{
                          pathname: '/about/journal',
                          search: query.hostname
                            ? `?hostname=${query.hostname}`
                            : undefined
                        }}
                      >
                        about
                      </Link>
                      ,{' '}
                      <Link
                        to={{
                          pathname: '/about/staff',
                          search: query.hostname
                            ? `?hostname=${query.hostname}`
                            : undefined
                        }}
                      >
                        staff
                      </Link>
                      , or{' '}
                      <Link
                        to={{
                          pathname: '/rfas',
                          search: query.hostname
                            ? `?hostname=${query.hostname}`
                            : undefined
                        }}
                      >
                        <abbr title="Request for Article">RFA</abbr>s
                      </Link>{' '}
                      sections .
                    </div>
                  </Notice>
                )
              ) : null}
            </div>
            <div className={bem`__content-list`}>
              {results.map(result => (
                <AppLayoutStickyList
                  key={getId(result)}
                  className={bem`__issue-sticky-list`}
                >
                  {result.issue || result.type ? (
                    <AppLayoutStickyListItem
                      id={`${mode || ''}-${getId(result)}`}
                    >
                      {(sticking, displayMode) =>
                        result.issue ? (
                          <IssueSnippet
                            canWrite={canWrite}
                            user={user}
                            disabled={disabled}
                            journal={journal}
                            issue={result.issue}
                            query={query}
                            sticking={sticking}
                            displayMode={displayMode}
                          />
                        ) : (
                          <PublicationTypeSnippet
                            user={user}
                            disabled={disabled}
                            journal={journal}
                            publicationType={result.type}
                            sticking={sticking}
                            displayMode={displayMode}
                          />
                        )
                      }
                    </AppLayoutStickyListItem>
                  ) : null}

                  {result.hasPart.map(part => (
                    <AppLayoutListItem key={getId(part)}>
                      {part['@type'] === 'Graph' ? (
                        <ArticleSnippet
                          canWrite={canWrite}
                          isFeatured={arrayify(journal.workFeatured)
                            .concat(arrayify(issue && issue.workFeatured))
                            .some(
                              work => getScopeId(work) === getScopeId(part)
                            )}
                          user={user}
                          disabled={disabled}
                          journal={journal}
                          issue={mode === 'issue' ? issue : result.issue}
                          graph={part}
                          workflow={droplets[getId(part.workflow)]}
                          query={query}
                        />
                      ) : mode === 'requests' ? (
                        <RfaSnippet
                          user={user}
                          journal={journal}
                          rfa={part}
                          reset={true}
                        />
                      ) : (
                        <IssueSnippet
                          canWrite={canWrite}
                          user={user}
                          disabled={disabled}
                          journal={journal}
                          issue={part}
                          query={query}
                          sticking={false}
                        />
                      )}
                    </AppLayoutListItem>
                  ))}
                </AppLayoutStickyList>
              ))}

              {nextUrl && (
                <div className={bem`__more-button-container`}>
                  <PaperButton onClick={this.handleMore.bind(this, nextUrl)}>
                    More
                  </PaperButton>
                </div>
              )}
            </div>
            <PrintPdfProgressModal />
          </AppLayoutMiddle>

          <AppLayoutRight backgroundOnDesktop={false}>
            <div className={bem`__featured-content`}>
              {screenWidth > CSS_TABLET && (
                <Card>
                  <JournalNav
                    user={user}
                    journal={journal}
                    location={location}
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
        issue: droplets[issueId],
        disabled,
        journal: homepage,
        issueSearchResults,
        graphSearchResults,
        rfasSearchResults,
        droplets
      };
    }
  ),
  { searchGraphs, searchIssues, searchRfas }
)(withShowPanel(Sifter));
