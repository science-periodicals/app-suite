import React from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import flatten from 'lodash/flatten';
import { Link } from 'react-router-dom';
import { getScopeId, Acl } from '@scipe/librarian';
import { getId, arrayify } from '@scipe/jsonld';
import {
  bemify,
  AppLayoutStickyList,
  AppLayoutStickyListItem,
  AppLayoutListItem,
  PaperButton
} from '@scipe/ui';
import ArticleSnippet from '../article-snippet';
import IssueSnippet from './issue-snippet';
import PublicationTypeSnippet from './publication-type-snippet';
import PrintPdfProgressModal from '../print-pdf-progress-modal';
import Notice from '../notice';
import RfaSnippet from '../rfa-snippet';

// This is not inlined is <SifterList /> so that it can be a PureComponent and
// not be polluted by `isSearching`. This is so that toggling the facets starts
// rendering the spinner as fast as possible without waiting for that component to
// update (which can be CPU intensive)
class SifterListContentList extends React.PureComponent {
  static propTypes = {
    mode: PropTypes.oneOf([
      'journal', // journal homepage, search for articles
      'issues', // list of issues (search for issues)
      'issue', // issue homepage (search for article within that issue)
      'requests'
    ]),
    issue: PropTypes.object,
    hostname: PropTypes.string,
    disabled: PropTypes.bool.isRequired,
    user: PropTypes.object,
    journal: PropTypes.object,
    results: PropTypes.array.isRequired,
    droplets: PropTypes.object.isRequired
  };

  render() {
    const {
      disabled,
      user,
      mode,
      journal,
      issue,
      results,
      droplets,
      hostname
    } = this.props;
    const query = { hostname };

    const acl = new Acl(journal);
    const canWrite = acl.checkPermission(user, 'WritePermission');

    // if we are in search mode (`isSearched` is true), we don't display the issues
    const bem = bemify('sifter-list');

    return (
      <div className={bem`__content-list`}>
        {results.map(result => (
          <AppLayoutStickyList
            key={getId(result)}
            className={bem`__issue-sticky-list`}
          >
            {result.issue || result.type ? (
              <AppLayoutStickyListItem id={`${mode || ''}-${getId(result)}`}>
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
                      .some(work => getScopeId(work) === getScopeId(part))}
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
      </div>
    );
  }
}

class SifterList extends React.Component {
  static propTypes = {
    mode: PropTypes.oneOf([
      'journal', // journal homepage, search for articles
      'issues', // list of issues (search for issues)
      'issue', // issue homepage (search for article within that issue)
      'requests'
    ]),

    issue: PropTypes.object,
    hostname: PropTypes.string,
    isSearching: PropTypes.bool,
    isSearched: PropTypes.bool,
    disabled: PropTypes.bool.isRequired,

    onMore: PropTypes.func.isRequired,

    // redux
    user: PropTypes.object,
    journal: PropTypes.object,

    results: PropTypes.array.isRequired,
    nextUrl: PropTypes.string,

    droplets: PropTypes.object.isRequired
  };

  static defaultProps = {
    issue: {},
    droplets: {}
  };

  handleMore = e => {
    const { onMore, nextUrl } = this.props;
    onMore(nextUrl);
  };

  render() {
    const {
      disabled,
      user,
      mode,
      journal,
      issue,
      results,
      nextUrl,
      droplets,
      hostname,
      isSearched,
      isSearching
    } = this.props;
    const query = { hostname };

    // we reshape into a list of items
    // if we are in search mode (`isSearched` is true), we don't display the issues

    const bem = bemify('sifter-list');

    return (
      <div>
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
                  The journal has no published articles yet, please check back
                  later. To learn about the journal or to submit a new
                  manuscript to the journal, visit the{' '}
                  <Link
                    to={{
                      pathname: '/about/journal',
                      search: hostname ? `?hostname=${hostname}` : undefined
                    }}
                  >
                    about
                  </Link>
                  ,{' '}
                  <Link
                    to={{
                      pathname: '/about/staff',
                      search: hostname ? `?hostname=${hostname}` : undefined
                    }}
                  >
                    staff
                  </Link>
                  , or{' '}
                  <Link
                    to={{
                      pathname: '/rfas',
                      search: hostname ? `?hostname=${hostname}` : undefined
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

        <SifterListContentList
          user={user}
          mode={mode}
          issue={issue}
          results={results}
          journal={journal}
          hostname={query.hostname}
          disabled={disabled}
          droplets={droplets}
        />

        {nextUrl && (
          <div className={bem`__more-button-container`}>
            <PaperButton onClick={this.handleMore}>More</PaperButton>
          </div>
        )}

        <PrintPdfProgressModal />
      </div>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.mode,
    (state, props) => props.isSearched,
    state => state.user,
    state => state.homepage,
    state => state.droplets,
    // Note: this is written so that isActive changes doesn't force to recompute the selector
    (state, props) => {
      switch (props.mode) {
        case 'requests':
          return state.rfasSearchResults.numberOfItems;

        case 'issues':
          return state.issueSearchResults.numberOfItems;

        case 'issue':
          return state.graphSearchResults.numberOfItems;

        case 'journal':
          return state.graphSearchResults.numberOfItems;
      }
    },

    (state, props) => {
      switch (props.mode) {
        case 'requests':
          return state.rfasSearchResults.nextUrl;

        case 'issues':
          return state.issueSearchResults.nextUrl;

        case 'issue':
          return state.graphSearchResults.nextUrl;

        case 'journal':
          return state.graphSearchResults.nextUrl;
      }
    },

    (state, props) => {
      switch (props.mode) {
        case 'requests':
          return state.rfasSearchResults.rfaIds;

        case 'issues':
          return state.issueSearchResults.issueIds;

        case 'issue':
        case 'journal':
          return state.graphSearchResults.graphIds;
      }
    },
    (
      mode,
      isSearched,
      user,
      homepage,
      droplets,
      numberOfItems,
      couchNextUrl,
      itemIds
    ) => {
      const items = arrayify(itemIds)
        .map(id => droplets[id])
        .filter(Boolean);

      const nextUrl =
        couchNextUrl && itemIds.length < numberOfItems ? couchNextUrl : null;

      let results;
      switch (mode) {
        case 'requests': {
          results = [{ '@id': `${mode}-search`, hasPart: items }];
          break;
        }

        case 'issues': {
          results = [{ '@id': `${mode}-search`, hasPart: items }];
          break;
        }

        case 'issue': {
          if (isSearched) {
            results = [{ '@id': `${mode}-search`, hasPart: items }];
          } else {
            // group by publication type (`additionalType`)
            const typeMap = items.reduce((typeMap, article) => {
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
                hasPart: items
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
      }

      return {
        user,
        journal: homepage,
        results,
        nextUrl,
        droplets
      };
    }
  )
)(SifterList);
