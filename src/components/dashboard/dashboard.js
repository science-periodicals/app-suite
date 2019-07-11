import querystring from 'querystring';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import { Route } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import omit from 'lodash/omit';
import capitalize from 'lodash/capitalize';
import debounce from 'lodash/debounce';
import { getScopeId, getObjectId } from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import {
  Logo,
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutLeft,
  AppLayoutRight,
  AppLayoutMiddle,
  AppLayoutMiddleFooter,
  AppLayoutFooter,
  AppLayoutWidgetPanel,
  AppLayoutWidgetPanelWidgetIcon,
  AppLayoutWidgetPanelWidget,
  HeaderSearch,
  HeaderSearchLeft,
  HeaderSearchRight,
  PaperButton,
  PaperActionButton,
  PaperActionButtonOption,
  Hyperlink,
  BemTags,
  CounterBadge,
  StartMenu
} from '@scipe/ui';

import {
  createGraph,
  deleteGraph,
  createTag,
  deleteTag,
  searchGraphs
} from '../../actions/graph-action-creators';
import { postWorkflowAction } from '../../actions/workflow-action-creators';
import SubmissionForm from '../submission-form';
import Feed from '../feed';
import FeedActiveComments from '../feed-active-comments';
import FeedActiveInvites from '../feed-active-invites';
import FeedActiveCheckActions from '../feed-active-check-actions';
import ProjectCard from './project-card';
import DashboardFacets from './dashboard-facets';
import ConnectedUserBadgeMenu from '../connected-user-badge-menu';
import EmailComposerModal from '../email-composer-modal';
import withShowPanel from '../../hoc/with-show-panel';
import { fetchActiveCommentActions } from '../../actions/comment-action-creators';
import { fetchActiveInvites } from '../../actions/invite-action-creators';
import { fetchFeedItems } from '../../actions/feed-action-creators';
import { fetchActiveChecks } from '../../actions/check-action-creators';

class Dashboard extends PureComponent {
  static propTypes = {
    createGraph: PropTypes.func.isRequired,
    user: PropTypes.object.isRequired,
    disabled: PropTypes.bool.isRequired,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,

    // withShowPanel HoC
    showPanel: PropTypes.bool.isRequired,
    onPanelClick: PropTypes.func.isRequired,
    onTogglePanel: PropTypes.func.isRequired,

    // redux
    isReady: PropTypes.bool.isRequired,
    nActiveInvites: PropTypes.number,
    nActiveChecks: PropTypes.number,
    nActiveComments: PropTypes.number,
    screenWidth: PropTypes.string,
    createGraphStatus: PropTypes.shape({
      status: PropTypes.oneOf(['active', 'success', 'error']),
      error: PropTypes.instanceOf(Error)
    }).isRequired,
    searchResults: PropTypes.shape({
      numberOfItems: PropTypes.number,
      nextUrl: PropTypes.string,
      status: PropTypes.oneOf(['active', 'success', 'error']),
      graphIds: PropTypes.array.isRequired,
      newGraphIds: PropTypes.array.isRequired,
      error: PropTypes.instanceOf(Error)
    }),
    searchGraphs: PropTypes.func.isRequired,
    deleteGraph: PropTypes.func.isRequired,
    createTag: PropTypes.func.isRequired,
    deleteTag: PropTypes.func.isRequired,
    postWorkflowAction: PropTypes.func.isRequired,
    fetchFeedItems: PropTypes.func.isRequired,
    fetchActiveCommentActions: PropTypes.func.isRequired,
    fetchActiveInvites: PropTypes.func.isRequired,
    fetchActiveChecks: PropTypes.func.isRequired
  };

  static defaultProps = {
    nActiveInvites: 0,
    nActiveChecks: 0,
    nActiveComments: 0
  };

  constructor(props) {
    super(props);

    const query = querystring.parse(location.search.substring(1));
    this.state = {
      isRightPanelOpen: true,
      searchValue: query.search || '',
      rightPanelType: 'notifications' // one of `notifications`, `comments` or `invites`
    };

    this.handleDebouncedSearch = debounce(
      this.handleDebouncedSearch.bind(this),
      300
    );

    this.handleMore = this.handleMore.bind(this);
    this.handleClickCreateGraph = this.handleClickCreateGraph.bind(this);
    this.handleClickCreateJournal = this.handleClickCreateJournal.bind(this);
    this.handleClickCreateOrganization = this.handleClickCreateOrganization.bind(
      this
    );
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  componentDidMount() {
    const {
      history,
      location,
      searchGraphs,
      fetchActiveCommentActions,
      fetchActiveInvites,
      fetchFeedItems,
      fetchActiveChecks
    } = this.props;
    window.scrollTo(0, 0);
    searchGraphs({
      history,
      query: querystring.parse(location.search.substring(1))
    });
    fetchFeedItems();
    fetchActiveCommentActions();
    fetchActiveInvites({ reset: true });
    fetchActiveChecks();
  }

  componentWillUnmount() {
    this.handleDebouncedSearch.cancel();
  }

  handleToggleRightPanel = e => {
    this.setState({ isRightPanelOpen: !this.state.isRightPanelOpen });
  };

  handleCloseRightPanel = e => {
    if (this.state.isRightPanelOpen) {
      this.setState({ isRightPanelOpen: false });
    }
  };

  handleChangeRightPanelType = nextType => {
    this.setState({ rightPanelType: nextType, isRightPanelOpen: true });
  };

  handleClickCreateGraph(e) {
    const { history, location } = this.props;
    e.preventDefault();
    window.scroll({ top: 0, left: 0, behavior: 'smooth' });
    if (!location.pathname.includes('new/submission')) {
      history.push({
        pathname: '/new/submission',
        search: location.search
      });
    }
  }

  handleClickCreateJournal(e) {
    const { history, location } = this.props;
    e.preventDefault();
    history.push({
      pathname: '/new/journal',
      search: location.search
    });
  }

  handleClickCreateOrganization(e) {
    const { history, location } = this.props;
    e.preventDefault();
    history.push({
      pathname: '/new/organization',
      search: location.search
    });
  }

  handleSubmitSubmissionForm = (
    graph,
    journal,
    workflow,
    editorialOfficeRoleId,
    publicationTypeId
  ) => {
    const { createGraph, history } = this.props;

    createGraph(
      graph,
      journal,
      workflow,
      editorialOfficeRoleId,
      publicationTypeId,
      {
        history
      }
    );
  };

  handleCancelSubmissionForm = () => {
    const { history, location } = this.props;
    const query = querystring.parse(location.search.substring(1));
    history.push({
      pathname: '/',
      search: querystring.stringify(
        omit(query, ['journal', 'workflow', 'type', 'role']) // remove the preset value for the submission form
      )
    });
  };

  handleMore(e) {
    const {
      history,
      searchGraphs,
      searchResults: { nextUrl }
    } = this.props;
    searchGraphs({
      history,
      nextUrl
    });
  }

  handleChangeSearch = e => {
    const value = e.target.value && e.target.value.trim();
    this.setState({ searchValue: e.target.value });
    this.handleDebouncedSearch(value);
  };

  handleDebouncedSearch(value) {
    const { history, location, searchGraphs } = this.props;
    const query = querystring.parse(location.search.substring(1));
    searchGraphs({
      history,
      query: querystring.parse(location.search.substring(1)),
      nextQuery: value
        ? Object.assign({}, query, { search: value })
        : omit(query, ['search'])
    });
  }

  handleAddTag = (graphId, tagName, audienceTypes, role) => {
    const { createTag } = this.props;
    createTag(graphId, tagName, audienceTypes, role, {
      query: querystring.parse(location.search.substring(1))
    });
  };

  handleDeleteTag = (graphId, tagActionId) => {
    const { deleteTag } = this.props;
    deleteTag(graphId, tagActionId, {
      query: querystring.parse(location.search.substring(1))
    });
  };

  handleDeleteGraph = graphId => {
    const { history, location, deleteGraph } = this.props;
    deleteGraph(graphId, {
      history,
      query: querystring.parse(location.search.substring(1))
    });
  };

  handleToggleFacet = nextQuery => {
    const { history, location, searchGraphs } = this.props;
    searchGraphs({
      history,
      query: querystring.parse(location.search.substring(1)),
      nextQuery
    });
  };

  handleEmail = action => {
    const { postWorkflowAction } = this.props;
    postWorkflowAction(getObjectId(action), action);
  };

  render() {
    const {
      nActiveInvites,
      nActiveChecks,
      nActiveComments,
      location,
      searchResults: {
        numberOfItems,
        nextUrl,
        graphIds,
        newGraphIds,
        deletedScopeIds,
        status
      },
      user,
      disabled,
      createGraphStatus,
      showPanel,
      onPanelClick,
      onTogglePanel,
      isReady
    } = this.props;

    const { searchValue, isRightPanelOpen, rightPanelType } = this.state;
    const showMore = nextUrl && graphIds.length < numberOfItems;

    const bem = BemTags();
    const query = querystring.parse(location.search.substring(1));
    const hasSearchQuery = !!query.search;

    return (
      <div className={bem`dashboard`} data-test-ready={isReady.toString()}>
        <Helmet>
          <title>sci.pe • dashboard</title>
        </Helmet>

        <AppLayout leftExpanded={showPanel} rightExpanded={isRightPanelOpen}>
          <AppLayoutHeader>
            <HeaderSearch
              loading={status === 'active'}
              onChangeSearch={this.handleChangeSearch}
              searchValue={searchValue}
              onSearchMenuClick={onTogglePanel}
            >
              <HeaderSearchLeft>
                <div className={bem`__logo-container`}>
                  <Hyperlink to={{ pathname: '/' }}>
                    <Logo className={bem`__header-logo`} />
                  </Hyperlink>
                </div>
              </HeaderSearchLeft>
              <HeaderSearchRight>
                <div className={bem`__header-right`}>
                  <div className={bem`__start-menu`}>
                    <StartMenu />
                  </div>
                  <ConnectedUserBadgeMenu disabled={disabled} />
                </div>
              </HeaderSearchRight>
            </HeaderSearch>
          </AppLayoutHeader>

          <AppLayoutLeft backgroundOnDesktop={false}>
            <DashboardFacets
              query={querystring.parse(location.search.substring(1))}
              onToggleFacet={this.handleToggleFacet}
              onPanelClick={onPanelClick}
            />
          </AppLayoutLeft>

          <AppLayoutMiddle widthMode="maximize">
            <AppLayoutMiddleFooter>
              <div className={bem`__create-button-container`}>
                <PaperActionButton>
                  <PaperActionButtonOption
                    iconName="organization"
                    label="New organization"
                    onClick={this.handleClickCreateOrganization}
                  />
                  <PaperActionButtonOption
                    iconName="journal"
                    label="New journal"
                    onClick={this.handleClickCreateJournal}
                  />
                  <PaperActionButtonOption
                    iconName="pencil"
                    label="New submission"
                    onClick={this.handleClickCreateGraph}
                  />
                </PaperActionButton>
              </div>
            </AppLayoutMiddleFooter>

            <div
              className={bem`__waterfall --${
                showPanel ? 'left-panel-open' : 'left-panel-closed'
              }`}
            >
              <div className={bem`__content`}>
                <div className={bem`__projects`}>
                  <Route
                    exact={true}
                    path="/new/submission"
                    render={props => (
                      <SubmissionForm
                        {...props}
                        user={user}
                        presetPeriodicalId={
                          query && query.journal && `journal:${query.journal}`
                        }
                        presetPublicationTypeId={
                          query && query.workflow && `type:${query.type}`
                        }
                        presetWorkflowId={
                          query &&
                          query.workflow &&
                          `workflow:${query.workflow}`
                        }
                        presetRoleId={
                          query && query.role && `role:${query.role}`
                        }
                        disabled={disabled}
                        createGraphStatus={createGraphStatus.status}
                        createGraphError={createGraphStatus.error}
                        onSubmit={this.handleSubmitSubmissionForm}
                        onCancel={this.handleCancelSubmissionForm}
                      />
                    )}
                  />

                  {/* New projects (appeared within a normal search cycle) */}
                  <ul className={bem`__project-list`}>
                    {newGraphIds.map((newGraphId, i) => (
                      <li
                        className={bem`__project-list-item`}
                        key={newGraphId}
                        style={Object.assign({
                          position: 'relative',
                          zIndex:
                            graphIds.length + newGraphIds.length + 1001 - i
                        })}
                      >
                        <ProjectCard
                          graphId={newGraphId}
                          disabled={disabled}
                          isNew={true}
                          isDeleted={deletedScopeIds.includes(
                            getScopeId(newGraphId)
                          )}
                          onAddTag={this.handleAddTag}
                          onDeleteTag={this.handleDeleteTag}
                          onDeleteGraph={this.handleDeleteGraph}
                        />
                      </li>
                    ))}
                  </ul>

                  {/* Normal search results */}
                  <ul className={bem`__project-list`}>
                    {graphIds.map((graphId, i) => (
                      <li
                        className={bem`__project-list-item`}
                        key={graphId}
                        style={Object.assign({
                          position: 'relative',
                          zIndex: graphIds.length + 1000 - i
                        })}
                      >
                        <ProjectCard
                          graphId={graphId}
                          disabled={disabled}
                          isDeleted={deletedScopeIds.includes(
                            getScopeId(graphId)
                          )}
                          onAddTag={this.handleAddTag}
                          onDeleteTag={this.handleDeleteTag}
                          onDeleteGraph={this.handleDeleteGraph}
                        />
                      </li>
                    ))}
                  </ul>

                  {!graphIds.length ? (
                    <div className="dashboard-body-spacer">
                      {status === 'success' &&
                      location.pathname !== '/new/submission' &&
                      hasSearchQuery ? (
                        <div className={bem`__no-results`}>
                          No search results
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className={bem`__more-projects`}>
                    {showMore ? (
                      <PaperButton
                        className={bem`__more-projects-button`}
                        onClick={this.handleMore}
                      >
                        More
                      </PaperButton>
                    ) : null}
                  </div>
                </div>

                <EmailComposerModal onAction={this.handleEmail} />
              </div>
            </div>
          </AppLayoutMiddle>

          <AppLayoutRight backgroundOnDesktop={false} stickyOnMobile={true}>
            <AppLayoutWidgetPanel>
              <AppLayoutWidgetPanelWidgetIcon
                onClick={this.handleChangeRightPanelType.bind(
                  this,
                  'notifications'
                )}
                isActive={rightPanelType === 'notifications'}
              >
                <Iconoclass
                  iconName="alert"
                  style={{ color: 'var(--grey-500' }}
                />
              </AppLayoutWidgetPanelWidgetIcon>

              {nActiveComments > 0 && (
                <AppLayoutWidgetPanelWidgetIcon
                  onClick={this.handleChangeRightPanelType.bind(
                    this,
                    'comments'
                  )}
                  isActive={rightPanelType === 'comments'}
                >
                  <CounterBadge count={nActiveComments}>
                    <Iconoclass
                      iconName="comment"
                      style={{ color: 'var(--grey-500' }}
                    />
                  </CounterBadge>
                </AppLayoutWidgetPanelWidgetIcon>
              )}

              {nActiveInvites > 0 && (
                <AppLayoutWidgetPanelWidgetIcon
                  onClick={this.handleChangeRightPanelType.bind(
                    this,
                    'invites'
                  )}
                  isActive={rightPanelType === 'invites'}
                >
                  <CounterBadge count={nActiveInvites}>
                    <Iconoclass
                      iconName="personAdd"
                      style={{ color: 'var(--grey-500' }}
                    />
                  </CounterBadge>
                </AppLayoutWidgetPanelWidgetIcon>
              )}

              {nActiveChecks > 0 && (
                <AppLayoutWidgetPanelWidgetIcon
                  onClick={this.handleChangeRightPanelType.bind(
                    this,
                    'digital signatures'
                  )}
                  isActive={rightPanelType === 'digital signatures'}
                >
                  <CounterBadge count={nActiveChecks}>
                    <Iconoclass
                      iconName="signature"
                      style={{ color: 'var(--grey-500' }}
                    />
                  </CounterBadge>
                </AppLayoutWidgetPanelWidgetIcon>
              )}

              <AppLayoutWidgetPanelWidget
                onClickClose={this.handleCloseRightPanel}
                title={
                  rightPanelType === 'comments'
                    ? 'Active comments'
                    : capitalize(rightPanelType)
                }
              >
                {rightPanelType === 'comments' ? (
                  <FeedActiveComments />
                ) : rightPanelType === 'invites' ? (
                  <FeedActiveInvites disabled={disabled} />
                ) : rightPanelType === 'digital signatures' ? (
                  <FeedActiveCheckActions disabled={disabled} />
                ) : (
                  <Feed disabled={disabled} />
                )}
              </AppLayoutWidgetPanelWidget>
            </AppLayoutWidgetPanel>
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
    state => state.graphSearchResults,
    state => state.createGraphStatus,
    state => state.activeInvites.numberOfItems,
    state => state.activeCheckActions.numberOfItems,
    state => state.activeCommentActionSearchResults.numberOfItems,
    state => state.fetchActiveInvitesStatus.isActive,
    state => state.fetchActiveCheckActionsStatus.isActive,
    state => state.fetchActiveCommentActionsStatus.isActive,
    (
      screenWidth,
      searchResults,
      createGraphStatus,
      nActiveInvites,
      nActiveChecks,
      nActiveComments,
      isFetchingActiveComment,
      isFetchingActiveCheckActions,
      isFetchingActiveCommentActions
    ) => {
      return {
        screenWidth,
        searchResults,
        createGraphStatus,
        nActiveInvites,
        nActiveChecks,
        nActiveComments,
        isReady:
          searchResults.status === 'success' &&
          !isFetchingActiveComment &&
          !isFetchingActiveCheckActions &&
          !isFetchingActiveCommentActions
      };
    }
  ),
  {
    createGraph,
    deleteGraph,
    searchGraphs,
    createTag,
    deleteTag,
    postWorkflowAction,
    fetchFeedItems,
    fetchActiveCommentActions,
    fetchActiveInvites,
    fetchActiveChecks
  }
)(withShowPanel(Dashboard));
