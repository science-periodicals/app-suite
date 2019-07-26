import React from 'react';
import PropTypes from 'prop-types';
import pluralize from 'pluralize';
import {
  unprefix,
  getId,
  arrayify,
  textify,
  embed,
  getNodeMap
} from '@scipe/jsonld';
import { getPurl, getBlindingData } from '@scipe/librarian';
import moment from 'moment';
import {
  API_LABELS,
  Banner,
  getFunderTree,
  Value,
  ExpansionPanel,
  ExpansionPanelPreview,
  Chordal,
  Span,
  Div,
  Card,
  schemaToChordal,
  DateFromNow,
  AccessBadge,
  PeerReviewBadge,
  GraphOverview,
  BemTags,
  ShareMenu,
  RdfaFundingTable,
  getResourceInfo,
  Hyperlink,
  ControlPanel,
  JournalBadge,
  PaperButtonLink
} from '@scipe/ui';
import GraphContributors from './graph-contributors';
import { compareAbstracts } from '../utils/sort';
import ArticleMediumBannerContent from './sifter/article-medium-banner-content';
import PrintPdfMenuItem from './print-pdf-menu-item';

// TODO @halmos style for when the article is featured (different drop shadow ?) (see `isFeatured` prop)

export default class ArticleSnippet extends React.PureComponent {
  static propTypes = {
    isFeatured: PropTypes.bool,
    ctx: PropTypes.oneOf(['explorer', 'sifter']),
    canWrite: PropTypes.bool,
    disabled: PropTypes.bool.isRequired,
    user: PropTypes.object,
    journal: PropTypes.object,
    graph: PropTypes.object,
    issue: PropTypes.object, // if defined we know the issue context (in case when graph.isPartOf is a list of issue)
    query: PropTypes.object,
    workflow: PropTypes.object
  };

  static defaultProps = {
    ctx: 'sifter',
    journal: {},
    graph: {},
    issue: {},
    workflow: {},
    query: {}
  };

  constructor(props) {
    super(props);
    this.state = {
      highlightedResource: undefined
    };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  handleHighlightResource = resourceId => {
    this.setState({ highlightedResource: resourceId });
  };

  setAbstractHref = $a => {
    const { journal, graph, query } = this.props;

    if (query.hostname) {
      return `/${graph.slug}?hostname=${query.hostname}${$a.getAttribute(
        'href'
      )}`;
    } else {
      return `${journal.url}/${graph.slug}${$a.getAttribute('href')}`;
    }
  };

  renderResourceLink = (graph = {}, node = {}) => {
    const { issue, query } = this.props;
    const name = node.name || node.alternateName || node['@id'];

    return (
      <Hyperlink
        page="article"
        graph={graph}
        node={node}
        issue={issue}
        query={query}
      >
        <Span>{name}</Span>
      </Hyperlink>
    );
  };

  renderAbstract(bem, key, name, text, defaultExpanded) {
    // TODO use <RdfaAbstractText /> instead of Value ?
    return (
      <section className={bem`abstract`} key={key}>
        <ExpansionPanel defaultExpanded={!!defaultExpanded}>
          <ExpansionPanelPreview className={bem`abstract-preview`}>
            <span className={bem`section-label`}>
              {textify(name) || 'Abstract'}
            </span>
            <Value
              tagName="div"
              className={bem`abstract-preview-text`}
              setHref={this.setAbstractHref}
            >
              {textify(text)}
            </Value>
          </ExpansionPanelPreview>
          <Value
            tagName="div"
            className={bem`abstract-text`}
            setHref={this.setAbstractHref}
          >
            {text}
          </Value>
        </ExpansionPanel>
      </section>
    );
  }

  render() {
    const { user, journal, issue, graph, workflow, query, ctx } = this.props;
    const { highlightedResource } = this.state;

    const isLoggedIn = !!getId(user);

    const publicationType = arrayify(graph.additionalType)[0];

    // we hydrate main entity so we can sort the abstract
    const nodeMap = getNodeMap(graph);
    let mainEntity;
    const mainEntityId = getId(graph.mainEntity);
    if (mainEntityId && nodeMap[mainEntityId]) {
      mainEntity = embed(nodeMap[mainEntityId], nodeMap, {
        keys: ['detailedDescription']
      });
    }

    const resourceInfo = getResourceInfo(graph, nodeMap, { sort: true });

    const chordalData = schemaToChordal(
      arrayify(resourceInfo.resourceIds).map(
        id => nodeMap[id] || { '@id': id }
      ),
      { imagePart: false, hasPart: true }
    );

    const resourceCountsMap = arrayify(chordalData).reduce((map, { id }) => {
      const resource = nodeMap[id];
      if (resource && resource['@type']) {
        if (resource['@type'] in map) {
          map[resource['@type']] += 1;
        } else {
          map[resource['@type']] = 1;
        }
      }
      return map;
    }, {});

    const resourceCounts = Object.keys(resourceCountsMap)
      .map(type => {
        return {
          name: API_LABELS[type] || type,
          value: resourceCountsMap[type]
        };
      })
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

    const funderTree = getFunderTree(
      Object.assign({}, graph, {
        '@graph': arrayify(resourceInfo.resourceIds).map(resourceId => {
          return embed(resourceId, nodeMap, {
            blacklist: ['potentialAction', 'resourceOf']
          });
        })
      })
    );
    const funderStats = {
      nFunders: funderTree.length,
      nAwards: funderTree.reduce((count, entry) => {
        if (entry.roles) {
          entry.roles.forEach(({ value: sponsorRole }) => {
            count += arrayify(sponsorRole.roleOffer).length;
          });
        }
        return count;
      }, 0)
    };

    const {
      dateCreated,
      dateSubmitted,
      datePublished,
      dateModified,
      dateRejected
    } = graph;

    const isModified =
      dateModified &&
      new Date(dateModified).getTime() >
        new Date(
          datePublished || dateSubmitted || dateCreated || dateRejected
        ).getTime() +
          2 * 1000;

    const hasBanner = arrayify(graph.style).some(
      style => style.name === '--medium-banner-background-image'
    );

    const bem = BemTags();

    return (
      <Card
        tagName="article"
        className={bem`article-snippet ${
          graph.dateRejected ? '--rejected' : ''
        }`}
        bevel={!hasBanner}
        active={true}
        noticeColor={'transparent'}
      >
        {hasBanner && (
          <Banner type="medium" cssVariables={graph.style}>
            <ArticleMediumBannerContent
              journal={journal}
              issue={issue}
              release={graph}
            />
          </Banner>
        )}

        <header className={bem`header`}>
          {!hasBanner && (
            <div className={bem`chordal__`}>
              <div className={bem`__diagram`}>
                <Chordal
                  noAnimation={true}
                  data={chordalData}
                  size={96}
                  highlight={highlightedResource}
                  onHighlight={this.handleHighlightResource}
                />
              </div>
              {graph.dateRejected && (
                <div className={bem`__rejected-notice`}>Rejected</div>
              )}
            </div>
          )}

          <div className={bem`metadata__`}>
            <h3 className={bem`__project-title`}>
              <Hyperlink
                page="article"
                reset={ctx === 'explorer'}
                graph={graph}
                issue={issue}
                query={query}
              >
                <Value tagName="span">
                  {mainEntity
                    ? mainEntity.name ||
                      mainEntity.alternateName ||
                      mainEntity['@id']
                    : graph.name ||
                      graph.alternateName ||
                      unprefix(getId(graph))}
                </Value>
              </Hyperlink>
            </h3>

            {/* subtitle */}
            {mainEntity && mainEntity.headline && (
              <Div className={bem`__project-subtitle`}>
                {mainEntity.headline}
              </Div>
            )}

            <GraphContributors
              graph={graph}
              fromJournalSubdomain={ctx === 'sifter'}
              fromMainEntity={true}
              blindingData={getBlindingData(user, graph, {
                ignoreEndDateOnPublicationOrRejection: true
              })}
            />
          </div>

          <div className={bem`header-icons`}>
            <AccessBadge
              workflow={workflow}
              className={bem`__access-badge`}
              size="24px"
            />
            {graph.url ? (
              <ShareMenu
                align="right"
                name={textify((mainEntity && mainEntity.name) || graph.name)}
                description={textify(
                  (mainEntity && mainEntity.description) ||
                    (arrayify(
                      mainEntity && mainEntity.detailedDescription
                    )[0] &&
                      arrayify(mainEntity && mainEntity.detailedDescription)[0]
                        .text) ||
                    graph.description
                )}
                url={getPurl(graph)}
                portal={true}
              >
                <PrintPdfMenuItem
                  journal={journal}
                  graph={graph}
                  issue={issue}
                  query={query}
                />
              </ShareMenu>
            ) : null}
          </div>
        </header>

        {/* the various Expansion panels */}

        {/* Editorial workflow */}
        <section className={bem`__process-section`}>
          <ExpansionPanel defaultExpanded={false}>
            <ExpansionPanelPreview>
              <span className={bem`__section-label`}>Editorial Info</span>
              {publicationType && (
                <Span className={bem`__preview-list-item --article-type`}>
                  {publicationType.name}
                </Span>
              )}

              <PeerReviewBadge workflowSpecification={workflow} />
            </ExpansionPanelPreview>

            {/* Expansion panel content: for now the name and description */}
            <div className={bem`__process-section-content`}>
              {workflow.name && (
                <Span className={bem`__process-title`}>{workflow.name}</Span>
              )}
              <Div className={bem`__process-description`}>
                {workflow.description || 'No description available'}
              </Div>
              {isLoggedIn && (
                <ControlPanel>
                  <PaperButtonLink page="submission" graph={graph}>
                    View
                  </PaperButtonLink>
                </ControlPanel>
              )}
            </div>
          </ExpansionPanel>
        </section>

        {/* The list of resources */}
        {!!arrayify(resourceInfo.resourceIds).length && (
          <section className={bem`snippet`}>
            <ExpansionPanel
              maxHeight={34 * (arrayify(resourceInfo.resourceIds).length + 2)}
              hasNestedCollapse={true}
              defaultExpanded={false}
            >
              <ExpansionPanelPreview>
                <span className={bem`section-label`}>
                  {`${chordalData.length} Resource${
                    chordalData.length !== 1 ? 's' : ''
                  }`}
                </span>

                <span className={bem`section-summary`}>
                  <ul className={bem`preview-list --vanishing`}>
                    {resourceCounts.map(count => (
                      <li className={bem`preview-list-item`} key={count.name}>
                        <span>
                          {count.value} {count.name}
                          {count.value !== 1
                            ? count.name.endsWith('x')
                              ? 'es'
                              : 's'
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </span>
                {/* TODO get last modified resource date */}
              </ExpansionPanelPreview>
              <GraphOverview
                graph={graph}
                nodeMap={nodeMap}
                resourceInfo={resourceInfo}
                onHighlightResource={this.handleHighlightResource}
                highlightedResource={highlightedResource}
                renderLink={this.renderResourceLink}
              />
            </ExpansionPanel>
          </section>
        )}

        {/* Main entity description  */}
        {mainEntity && mainEntity.description
          ? this.renderAbstract(
              bem,
              'description',
              'Description',
              mainEntity.description
            )
          : null}

        {/* List of different abstracts (if any) */}
        {mainEntity
          ? arrayify(mainEntity.detailedDescription)
              .sort(compareAbstracts)
              .map((abstract, i) =>
                this.renderAbstract(
                  bem,
                  getId(abstract),
                  abstract.name,
                  abstract.text,
                  i === 0
                )
              )
          : null}

        {/* Funding information (sifter only) */}
        {!!funderTree.length && (
          <section className={bem`__funding-section`}>
            <ExpansionPanel defaultExpanded={false}>
              <ExpansionPanelPreview>
                <span className={bem`__section-label`}>Funding</span>

                <ul className={bem`preview-list --vanishing`}>
                  <li className={bem`preview-list-item`}>
                    <span>
                      {`${funderStats.nFunders} ${pluralize(
                        'Source',
                        funderStats.nFunders
                      )}`}
                    </span>
                  </li>
                  <li className={bem`preview-list-item`}>
                    <span>
                      {funderStats.nAwards
                        ? ` ${funderStats.nAwards} ${pluralize(
                            'Award',
                            funderStats.nAwards
                          )}`
                        : ''}
                    </span>
                  </li>
                </ul>
              </ExpansionPanelPreview>

              {/* Expansion panel content */}
              <div className={bem`__funding-section-content`}>
                <RdfaFundingTable object={graph} funderTree={funderTree} />
              </div>
            </ExpansionPanel>
          </section>
        )}

        <section className={bem`__footer`}>
          <div className={bem`__publication-info__`}>
            <div className={bem`__group --journal-info`}>
              {journal ? (
                <span
                  className={bem`__datum --journal-name`}
                  title={textify(journal.name)}
                >
                  {ctx === 'explorer' && <JournalBadge journal={journal} />}
                  <Hyperlink
                    page="journal"
                    periodical={journal}
                    query={query}
                    reset={ctx === 'explorer'}
                  >
                    <Span>
                      {journal.alternateName ||
                        journal.name ||
                        unprefix(journal['@id'])}
                    </Span>
                  </Hyperlink>
                </span>
              ) : null}

              {/* Issue name */}
              {!!issue && (
                <span className={bem`__datum`}>
                  <Hyperlink page="issue" issue={issue} query={query}>
                    {issue['@type'] === 'PublicationIssue' ? (
                      <span>Issue {issue.issueNumber}</span>
                    ) : (
                      <Span>
                        {issue.name ||
                          (unprefix(getId(issue)) || '').split('/', 2)[1]}
                      </Span>
                    )}
                  </Hyperlink>
                </span>
              )}
            </div>

            <div className={bem`__group --end`}>
              {datePublished ? (
                <span className={bem`__datum`}>
                  Published on {moment(datePublished).format('LL')}
                </span>
              ) : null}
              {dateRejected ? (
                <span className={bem`__datum`}>
                  Rejected on {moment(dateRejected).format('LL')}
                </span>
              ) : null}

              {!datePublished && !dateRejected && isModified ? (
                <span className={bem`__datum`}>
                  Last modified <DateFromNow>{dateModified}</DateFromNow>
                </span>
              ) : null}
            </div>
          </div>
        </section>
      </Card>
    );
  }
}
