import React from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Helmet } from 'react-helmet-async';
import Iconoclass from '@scipe/iconoclass';
import {
  schemaToChordal,
  BemTags,
  CSS_HEADER_HEIGHT,
  CSS_SMALL_TABLET,
  Header,
  Footer,
  PaperSwitch,
  LinkInterceptor,
  AppLayout,
  AppLayoutBanner,
  AppLayoutLeft,
  AppLayoutMiddle,
  AppLayoutMiddleLeftSpacer,
  AppLayoutHeader,
  AppLayoutSubHeader,
  AppLayoutFooter,
  Banner,
  getResourceInfo,
  StartMenu,
  Menu,
  MenuItem
} from '@scipe/ui';
import {
  schema,
  helmetify,
  getScopeId,
  getRootPartId,
  createId
} from '@scipe/librarian';
import { unprefix, getId, arrayify, embed, textify } from '@scipe/jsonld';
import { fetchEncoding } from '../../actions/encoding-action-creators';
import { fetchGraph } from '../../actions/graph-action-creators';
import { fetchJournal } from '../../actions/journal-action-creators';
import Shell from '../shell';
import ReaderToC from './reader-toc';
import {
  createGraphDataSelector,
  createActionMapSelector,
  createPeriodicalSelector,
  createGraphAclSelector
} from '../../selectors/graph-selectors';
import withIsPrinting from '../../hoc/with-is-printing';
import ConnectedUserBadgeMenu from '../connected-user-badge-menu';
import RdfaScholarlyArticle from '../rdfa/rdfa-scholarly-article';
import {
  openShell,
  closeReaderPreview
} from '../../actions/ui-action-creators';
import { parseAnnotableQueryParameters } from '../../utils/annotations';
import { getWorkflowAction, getOverwriteNodeMap } from '../../utils/workflow';
import ArticleLargeBannerContent from '../sifter/article-large-banner-content';
import PrintPdfProgressModal from '../print-pdf-progress-modal';
import withShowPanel from '../../hoc/with-show-panel';
import ReaderPreviewSubHeader from './reader-preview-sub-header';
import {
  getFetchableEncodings,
  checkIfIsStillFetching
} from '../../utils/encoding-utils';
import { getTocData } from '../../utils/document-object';
import { getCustomVariables } from '../../utils/style-utils';

// Note: if called with ?issue=<issueSlug> render in the context of the specified issue
class Reader extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    match: PropTypes.shape({
      params: PropTypes.oneOfType([
        // preview mode
        PropTypes.shape({
          journalId: PropTypes.string.isRequired,
          graphId: PropTypes.string.isRequired
        }),
        // published article mode
        PropTypes.shape({
          slug: PropTypes.string.isRequired
        })
      ]).isRequired
    }).isRequired,

    preview: PropTypes.bool,
    screenWidth: PropTypes.string,
    isPrinting: PropTypes.bool,

    // withShowPanel HoC
    showPanel: PropTypes.bool.isRequired,
    onPanelClick: PropTypes.func.isRequired,
    onTogglePanel: PropTypes.func.isRequired,

    // redux
    isPreviewOutdated: PropTypes.bool,
    helmet: PropTypes.shape({
      title: PropTypes.string,
      meta: PropTypes.arrayOf(PropTypes.object).isRequired
    }),
    journal: PropTypes.object,
    issue: PropTypes.object, // if issueId is specified, and present in droplets, `issue` will be defined
    graph: PropTypes.object,
    actionId: PropTypes.string, // the action providing the rendering context
    overwriteNodeMap: PropTypes.object, // in case of `TypesettingAction`, we need to render the result of the `TypesettingAction` and not the current `Graph`
    resourceMap: PropTypes.object,
    chordalData: PropTypes.array,
    framedResource: PropTypes.object,
    fetchableEncodings: PropTypes.arrayOf(PropTypes.object).isRequired,
    fetchEncodingStatus: PropTypes.object.isRequired,
    contentMap: PropTypes.object.isRequired,
    content: PropTypes.object,
    tocData: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        entries: PropTypes.arrayOf(
          PropTypes.shape({
            section: PropTypes.object,
            h2: PropTypes.object,
            resourcesByType: PropTypes.object
          })
        ).isRequired
      })
    ),

    blindingData: PropTypes.object,

    openShell: PropTypes.func.isRequired,
    fetchGraph: PropTypes.func.isRequired,
    fetchJournal: PropTypes.func.isRequired,
    fetchEncoding: PropTypes.func.isRequired,
    closeReaderPreview: PropTypes.func.isRequired
  };

  static defaultProps = {
    content: {},
    journal: {},
    helmet: {
      meta: []
    }
  };

  constructor(props) {
    super(props);
    this.state = {
      isPrintable: false,
      theme: 'light'
    };
  }

  componentDidMount() {
    const { location, isPrinting } = this.props;
    if (window !== window.parent) {
      this._fromIframe = true;
    }

    window.scrollTo(0, 0);

    if (!isPrinting && location.hash) {
      this._needScroll = location.hash.slice(1); // This is used to indicate that we need to scroll to the hash on page load
      this.tryToScroll();
    }

    this.fetch();

    window.addEventListener('load', this.handleLoad);
  }

  componentWillUnmount() {
    window.removeEventListener('load', this.handleLoad);
    clearTimeout(this._firePrintableTimeout);
  }

  componentDidUpdate(prevProps, prevState) {
    // if the hash changed we restart the scrollTo process
    const {
      location: { hash },
      graph,
      contentMap,
      isPrinting
    } = this.props;

    const {
      location: { hash: prevHash },
      graph: prevGraph,
      contentMap: prevContentMap
    } = prevProps;

    this.maybeEmitIsPrintable();

    if (!isPrinting) {
      if (hash && prevHash !== hash) {
        this._needScroll = hash.slice(1); // This is used to indicate that we need to scroll to the hash on page load
        this.tryToScroll();
      } else if (
        // otherwise, if smtg related to fetching was updated, we try to scroll again hoping the the id will now be present in the document
        this._needScroll &&
        (prevGraph !== graph || prevContentMap !== contentMap)
      ) {
        this.tryToScroll();
      }
    }

    if (!prevProps.graph && graph) {
      this.fetch();
    }
  }

  maybeEmitIsPrintable() {
    const {
      fetchableEncodings,
      fetchEncodingStatus,
      framedResource
    } = this.props;

    if (this._fromIframe) {
      if (this.stillFetching === undefined) {
        this.stillFetching = true;
      }

      // before framedResource is defined,  fetchableEncodings won't be accurate
      if (framedResource && this.stillFetching) {
        const stillFetching = checkIfIsStillFetching(
          fetchableEncodings,
          fetchEncodingStatus
        );

        // we are in an iframe we post the loading status to the parent window
        window.parent.postMessage(
          { fetchableEncodings, fetchEncodingStatus },
          window.location.origin
        );

        if (!stillFetching) {
          this.stillFetching = false;
          this.setState({ isPrintable: true }, () => {
            window.dispatchEvent(new Event('printable'));
            console.log('printable fired');
            this._printableHasFired = true;
          });
        }
      }
    }
  }

  handleLoad = e => {
    // There can be a race condition when printable is fired _before_ the `load` event.
    // This ensures that we refire the event in that case
    if (this._fromIframe) {
      if (this._printableHasFired) {
        this._firePrintableTimeout = setTimeout(() => {
          window.dispatchEvent(new Event('printable'));
        }, 10); // timeout is needed as we add the event listener for `printable` within the `load` event listener in the iframe
        console.log('printable re-fired after load');
        this._printableHasFired = false;
      }
    }
  };

  fetch() {
    const {
      fetchableEncodings,
      fetchEncodingStatus,
      contentMap,
      graph,
      location,
      match: {
        params: { slug }
      },
      fetchGraph,
      fetchJournal,
      fetchEncoding
    } = this.props;

    const query = querystring.parse(location.search.substring(1));

    if (slug) {
      fetchGraph(slug, {
        query,
        reader: true
      });

      if (graph) {
        fetchJournal(getRootPartId(graph), {
          homepage: true
        });

        const toFetch = fetchableEncodings.filter(encoding => {
          const encodingId = getId(encoding);
          return (
            encoding &&
            encoding['@type'] !== 'ImageObject' &&
            !(encodingId in contentMap) &&
            !(
              encodingId in fetchEncodingStatus &&
              fetchEncodingStatus[encodingId].active
            )
          );
        });

        toFetch.forEach(encoding => {
          fetchEncoding(getId(graph), encoding);
        });
      }
    }
  }

  tryToScroll() {
    const {
      fetchableEncodings,
      fetchEncodingStatus,
      history,
      location
    } = this.props;

    const id = this._needScroll;
    if (id) {
      const $target = document.getElementById(id);
      if ($target) {
        // swap the non human readable id to a counter one (human readable) when possible and redirect
        if (id.startsWith('node:')) {
          const $metaMargin = $target.querySelector('.meta-margin');
          if ($metaMargin && $metaMargin.id) {
            return history.replace({
              pathname: location.pathname,
              search: location.search,
              hash: `#${$metaMargin.id}`
            });
          }
        }

        const rect = $target.getBoundingClientRect();
        window.scroll({
          top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT - 10,
          behavior: 'smooth'
        });

        // We only delete this._needScroll when _all_ the encoding have been fetched so that we are sure to scroll to the right location when the content is updated
        // TODO delete this._needScroll if the user scroll in the meantime
        const stillFetching = checkIfIsStillFetching(
          fetchableEncodings,
          fetchEncodingStatus
        );
        if (!stillFetching) {
          delete this._needScroll;
        }
      }
    }
  }

  handlePreview = () => {
    const {
      history,
      location,
      graph,
      journal,
      closeReaderPreview
    } = this.props;

    closeReaderPreview(history, location, getId(journal), getId(graph));
  };

  handleLink = (e, $a, type, resourceId, parsed) => {
    const { openShell } = this.props;

    switch (type) {
      case 'citation':
      case 'resource':
      case 'requirement':
        if (resourceId) {
          e.preventDefault();
          e.stopPropagation();

          openShell(type, resourceId);
        }
        break;

      case 'roleContactPoint':
      case 'roleAction':
      case 'roleAffiliation':
      case 'footnote':
      case 'endnote':
        if (resourceId) {
          e.preventDefault();
          e.stopPropagation();

          const url = new URL($a.href);
          openShell(type, resourceId, {
            params: $a.id
              ? {
                  backlink: {
                    pathname: url.pathname,
                    search: url.search,
                    hash: `#${$a.id}`
                  },
                  backlinkTextContent: $a.textContent
                }
              : undefined
          });
        }
        break;

      default:
        break;
    }
  };

  handleThemeChange(themeName) {
    if (this.state.theme !== themeName) {
      this.setState({ theme: themeName });
    }
  }

  render() {
    const {
      isPreviewOutdated,
      graph,
      journal,
      actionId,
      tocData,
      overwriteNodeMap,
      issue,
      framedResource,
      chordalData,
      location,
      blindingData,
      helmet,
      isPrinting: _isPrinting,
      screenWidth,
      resourceMap,
      content,
      preview,
      showPanel,
      onPanelClick,
      onTogglePanel,
      fetchableEncodings,
      fetchEncodingStatus
    } = this.props;

    const { isPrintable, theme } = this.state;

    const stillFetching = checkIfIsStillFetching(
      fetchableEncodings,
      fetchEncodingStatus
    );
    const isReady = !!(framedResource && !stillFetching);

    const bem = BemTags('@sa');
    const query = querystring.parse(location.search.substring(1));
    const isPrinting = query.print === 'true' ? true : _isPrinting;

    const isMobile = !isPrinting && screenWidth <= CSS_SMALL_TABLET;
    const customCssVars = getCustomVariables(journal, theme);

    return (
      <AppLayout
        leftExpanded={showPanel}
        rightExpanded={false}
        className="app-layout--reader"
        virtualRight={true}
      >
        {!isPrinting && (
          <AppLayoutHeader>
            <Helmet>
              {helmet.title && <title>{helmet.title}</title>}
              {helmet.meta.map(attrMap => (
                <meta key={attrMap.name || attrMap.content} {...attrMap} />
              ))}
              <style type="text/css">{`
                html {
                  ${customCssVars}
                }
                `}</style>
            </Helmet>
            <Header
              status={isPreviewOutdated ? 'warning' : undefined}
              statusMessage="You are viewing a previous version of the submission"
              onClickHamburger={onTogglePanel}
              showHamburger={true}
              userBadgeMenu={
                <ConnectedUserBadgeMenu forceResetSubdomain={!preview} />
              }
              startMenu={<StartMenu reset={!preview} />}
              crumbs={getCrumbs(
                preview,
                location,
                query,
                journal,
                issue,
                graph,
                framedResource
              )}
              theme={theme}
              logo={journal.logo}
              homeLink={{
                to: {
                  pathname: '/',
                  search:
                    !preview && query.hostname
                      ? `?hostname=${query.hostname}`
                      : undefined
                }
              }}
              showHome={true}
              logoLink={{
                to: {
                  pathname: '/',
                  search:
                    !preview && query.hostname
                      ? `?hostname=${query.hostname}`
                      : undefined
                }
              }}
            >
              {preview && (
                <PaperSwitch checked={true} onClick={this.handlePreview}>
                  <Iconoclass
                    iconName="manuscriptPreview"
                    size="14px"
                    iconSize={16}
                    style={{ left: '-1px', color: 'white' }}
                  />
                </PaperSwitch>
              )}
              <Menu
                icon="brightnessLight"
                className="reader__theme-select"
                portal={true}
                align="right"
              >
                <MenuItem
                  iconName={theme === 'light' ? 'check' : 'brightnessLight'}
                  onClick={e => this.handleThemeChange('light')}
                >
                  Light Mode
                </MenuItem>
                <MenuItem
                  iconName={theme === 'dark' ? 'check' : 'brightnessDark'}
                  onClick={e => this.handleThemeChange('dark')}
                >
                  Dark Mode
                </MenuItem>
                <MenuItem
                  iconName={theme === 'alt' ? 'check' : 'eye'}
                  onClick={e => this.handleThemeChange('alt')}
                >
                  Alternate Mode
                </MenuItem>
              </Menu>
            </Header>
          </AppLayoutHeader>
        )}

        {!isPrinting &&
          arrayify(graph && graph.style).some(
            style => style.name === '--large-banner-background-image'
          ) && (
            <AppLayoutBanner>
              <Banner type="large" cssVariables={graph.style}>
                <ArticleLargeBannerContent
                  journal={journal}
                  issue={issue}
                  release={graph}
                />
              </Banner>
            </AppLayoutBanner>
          )}

        {!!preview && !isPrinting && (
          <AppLayoutSubHeader>
            <ReaderPreviewSubHeader />
          </AppLayoutSubHeader>
        )}

        {!!framedResource && !isPrinting && (
          <AppLayoutLeft className="reader__left" backgroundOnDesktop={false}>
            <div className="reader__left-toc-container">
              <ReaderToC
                tocData={tocData}
                journal={journal}
                graph={graph}
                resourceMap={resourceMap}
                mainEntityId={getId(framedResource)}
                isOpen={showPanel}
                location={location}
                issue={issue}
                query={query}
                preview={preview}
                onClick={onPanelClick}
                chordalData={chordalData}
              />
            </div>
          </AppLayoutLeft>
        )}

        <AppLayoutMiddle widthMode="auto">
          <div
            id="reader"
            className={bem`reader`}
            data-test-ready={isReady.toString()}
          >
            <div className={bem`__guarantee-print-fonts__`}>
              <span className={bem`__sans`}>|</span>
              <span className={bem`__sans-italic`}>|</span>
              <span className={bem`__sans-bold`}>|</span>
              <span className={bem`__sans-bold-italic`}>|</span>
              <span className={bem`__sans-condensed`}>|</span>
              <span className={bem`__serif`}>|</span>
              <span className={bem`__serif-italic`}>|</span>
              <span className={bem`__serif-bold`}>|</span>
              <span className={bem`__serif-bold-italic` + ' ' + bem``}>|</span>
            </div>

            {!!framedResource && (
              <LinkInterceptor onLink={this.handleLink}>
                <div className={bem`__content`}>
                  <RdfaScholarlyArticle
                    object={framedResource}
                    content={content}
                    graphId={getId(graph)}
                    graph={graph}
                    journal={journal}
                    issue={issue}
                    preview={preview}
                    overwriteNodeMap={overwriteNodeMap}
                    isPrinting={isPrinting}
                    isPrintable={isPrintable}
                    isMobile={isMobile}
                    mainEntity={framedResource}
                    blindingData={blindingData}
                  />
                  <div className={bem`__right-margin`} />
                </div>
                <div className="reader__shell-positioner">
                  <AppLayoutMiddleLeftSpacer />
                  <div className="reader__shell-positioner-right">
                    <div className="reader__shell-left-spacer" />
                    <div className="reader__shell-container">
                      <Shell
                        journalId={getId(journal)}
                        graphId={getId(graph)}
                        actionId={actionId}
                        location={location}
                        blindingData={blindingData}
                      />
                    </div>
                    <div className="reader__shell-right-spacer" />
                  </div>
                </div>
              </LinkInterceptor>
            )}
          </div>
          <PrintPdfProgressModal />
        </AppLayoutMiddle>

        {!isPrinting && (
          <AppLayoutFooter>
            <Footer padding="small" sticky={true} hideCopyright={true} />
          </AppLayoutFooter>
        )}
      </AppLayout>
    );
  }
}

const graphIdMapper = {
  getGraphId: function(state, props) {
    const { graphId } = props.match.params;
    const query = querystring.parse(props.location.search.substring(1));

    return graphId
      ? `graph:${graphId}${query.version ? `?version=${query.version}` : ''}`
      : undefined;
  },
  getSlug: function(state, props) {
    return props.match.params.slug;
  }
};

export default connect(
  createSelector(
    (state, props) => {
      if (props.isPrinting) {
        return props.isPrinting;
      }

      const query = querystring.parse(props.location.search.substring(1));
      return query.print === 'true';
    },
    state => state.screenWidth,
    state => state.readerPreviewData,
    (state, props) => props.location.search,
    state => state.droplets,
    state => state.user,
    state => state.contentMap,
    state => state.fetchEncodingStatus,
    createGraphDataSelector(graphIdMapper),
    createActionMapSelector(graphIdMapper),
    createPeriodicalSelector(graphIdMapper),
    createGraphAclSelector(graphIdMapper),
    (
      isPrinting,
      screenWidth,
      { publisherLocation, isPreviewOutdated },
      search,
      droplets,
      user,
      contentMap,
      fetchEncodingStatus,
      { graph, nodeMap } = {},
      actionMap,
      journal,
      graphAcl
    ) => {
      const query = querystring.parse(search.substring(1));
      const issueId =
        query.issue &&
        journal &&
        createId('issue', query.issue, journal)['@id'];

      const issue = droplets[issueId];

      // TODO overwrite `nodeMap` if `actionId` is specified and is a `TypesettingAction` (we are previewing the typeset document in that case)
      let actionId, overwriteNodeMap;
      if (query.action) {
        const data = parseAnnotableQueryParameters(query, actionMap);

        actionId = data.actionId;
        if (actionId) {
          const action = getWorkflowAction(actionId, {
            user,
            acl: graphAcl,
            actionMap
          });

          if (action['@type'] === 'TypesettingAction') {
            overwriteNodeMap = getOverwriteNodeMap(actionId, {
              user,
              acl: graphAcl,
              actionMap
            });
            nodeMap = overwriteNodeMap;
          }
        }
      }

      const resourceInfo = getResourceInfo(graph, nodeMap, { sort: true });

      // if no user we default to public audience
      const blindingData =
        graphAcl &&
        graphAcl.getBlindingData(
          getId(user) ? user : { '@type': 'Audience', audienceType: 'public' },
          { ignoreEndDateOnPublicationOrRejection: true }
        );

      let mainEntityId, framedResource, helmet;
      if (graph && graph.mainEntity) {
        mainEntityId = getId(graph.mainEntity);
      } else if (graph && resourceInfo && nodeMap) {
        // If we don't have a mainEntityId, we first look through all resources in the nodeMap to find a
        // ScholarlyArticle, failing that we take the oldest (which could be totally random crap).
        mainEntityId = arrayify(resourceInfo.resourceIds).find(
          rid => nodeMap[rid] && nodeMap[rid]['@type'] === 'ScholarlyArticle'
        );

        if (!mainEntityId) {
          mainEntityId = arrayify(resourceInfo.resourceIds).sort((a, b) => {
            const nodeA = nodeMap[a];
            const nodeB = nodeMap[b];
            if (!nodeA && nodeB) return 1;
            if (nodeA && !nodeB) return -1;
            if (!nodeA.dateCreated && nodeB.dateCreated) return 1;
            if (nodeA.dateCreated && !nodeB.dateCreated) return -1;
            return nodeA.dateCreated.localeCompare(nodeB.dateCreated);
          })[0];
        }
      }

      if (mainEntityId && nodeMap) {
        framedResource = embed(mainEntityId, nodeMap);
        // Add / hydrate periodical data as isPartOf to have journal info
        let helmetArticle = framedResource;
        if (!framedResource.isPartOf) {
          if (issue && journal) {
            helmetArticle = Object.assign(
              { isPartOf: Object.assign({}, issue, { isPartOf: journal }) },
              framedResource
            );
          } else if (journal) {
            helmetArticle = Object.assign(
              { isPartOf: journal },
              framedResource
            );
          }
        }

        helmet = helmetify(helmetArticle, {
          defaultImg: '/favicon/alt-submark-favicon/android-chrome-512x512.png',
          defaultTitle: 'sci.pe'
        });
      }

      let content;
      if (framedResource) {
        if (framedResource.encoding) {
          for (let encoding of framedResource.encoding) {
            const encodingId = getId(encoding);
            if (
              encodingId in contentMap &&
              (contentMap[encodingId].articleBody ||
                contentMap[encodingId].articleBackMatter ||
                contentMap[encodingId].articleSupportingInformation)
            ) {
              content = contentMap[encodingId];
              break;
            }
          }
        }
      }

      const fetchableEncodings = getFetchableEncodings(graph, nodeMap, {
        ignoreSupportingResources: isPrinting
      });

      const chordalData = schemaToChordal(
        arrayify(resourceInfo && resourceInfo.resourceIds).map(
          id => (nodeMap && nodeMap[id]) || { '@id': id }
        ),
        { imagePart: false, hasPart: true }
      );

      let resourceMap;
      if (resourceInfo && nodeMap) {
        // blacklist figure subpart
        const blacklist = new Set();
        arrayify(resourceInfo.resourceIds).forEach(resourceId => {
          const resource = nodeMap[resourceId];
          if (schema.is(resource, 'Image') && resource.hasPart) {
            arrayify(resource.hasPart).forEach(part => {
              const partId = getId(part);
              if (partId) {
                blacklist.add(partId);
              }
            });
          }
        });

        resourceMap = arrayify(resourceInfo.resourceIds).reduce(
          (resourceMap, resourceId) => {
            if (resourceId in nodeMap && !blacklist.has(resourceId)) {
              resourceMap[resourceId] = nodeMap[resourceId];
            }
            return resourceMap;
          },
          {}
        );
      }

      return {
        actionId,
        isPreviewOutdated,
        screenWidth,
        issue,
        overwriteNodeMap,
        journal,
        content,
        resourceMap,
        chordalData,
        helmet,
        framedResource,
        graph,
        blindingData,
        contentMap,
        tocData: getTocData(graph, nodeMap, contentMap, { includeNotes: true }),
        fetchEncodingStatus,
        fetchableEncodings
      };
    }
  ),
  { fetchGraph, fetchJournal, fetchEncoding, openShell, closeReaderPreview }
)(withIsPrinting(withShowPanel(Reader)));

function getCrumbs(
  preview,
  location,
  query,
  journal,
  issue,
  graph,
  mainEntity
) {
  if (!journal || !mainEntity) return;

  const crumbs = [
    {
      key: 'journal',
      page: 'journal',
      periodical: journal,
      query: query,
      children:
        textify(journal.alternateName || journal.name) ||
        unprefix(getId(journal))
    }
  ];

  if (issue) {
    crumbs.push({
      key: 'issue',
      page: 'issue',
      issue: issue,
      query: query,
      children:
        issue['@type'] === 'PublicationIssue'
          ? `Issue ${issue.issueNumber}`
          : textify(issue.name) ||
            (unprefix(getId(issue)) || '').split('/', 2)[1]
    });
  }

  crumbs.push({
    key: 'mainEntity',
    page: preview ? 'articlePreview' : 'article',
    graph: graph,
    issue: issue,
    query: query,
    children: textify(mainEntity.name) || unprefix(getScopeId(graph))
  });

  return crumbs;
}
