import querystring from 'querystring';
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Helmet } from 'react-helmet-async';
import { getId, unprefix } from '@scipe/jsonld';
import { getScopeId, getAgentId, getStageActions } from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import {
  Header,
  StartMenu,
  AppLayout,
  AppLayoutLeft,
  AppLayoutMiddle,
  AppLayoutHeader,
  AppLayoutSubHeader,
  PaperSwitch,
  CSS_HEADER_HEIGHT,
  CSS_MOBILE,
  CSS_SMALL_TABLET,
  CSS_TABLET,
  CSS_SMALL_DESKTOP,
  CSS_LARGE_DESKTOP,
  CSS_XLARGE_DESKTOP,
  CSS_XXLARGE_DESKTOP
} from '@scipe/ui';
import PublisherSidebar from './publisher-sidebar';
import ConnectedUserBadgeMenu from '../connected-user-badge-menu';
import { parseAnnotableQueryParameters } from '../../utils/annotations';
import { openReaderPreview } from '../../actions/ui-action-creators';
import { repositionAnnotations } from '../../actions/annotation-action-creators';
import {
  getSortedStages,
  getInstance,
  getWorkflowAction,
  getOverwriteNodeMap,
  getFileAction
} from '../../utils/workflow';
import ResourceView from '../resource-view';
import {
  createActionMapSelector,
  createGraphAclSelector
} from '../../selectors/graph-selectors';
import {
  getFetchableEncodings,
  checkIfIsStillFetching
} from '../../utils/encoding-utils';
import withShowPanel from '../../hoc/with-show-panel';
import PublisherJoinSubHeader from './publisher-join-sub-header';

class Publisher extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    match: PropTypes.shape({
      params: PropTypes.shape({
        journalId: PropTypes.string.isRequired,
        graphId: PropTypes.string.isRequired
      }).isRequired
    }).isRequired,

    user: PropTypes.object,
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,

    // withShowPanel HoC
    showPanel: PropTypes.bool.isRequired,
    onPanelClick: PropTypes.func.isRequired,
    onTogglePanel: PropTypes.func.isRequired,

    // redux
    isReady: PropTypes.bool.isRequired, // Used for backstop.js for now
    canViewFilesAttachment: PropTypes.bool,
    isPreviewOutdated: PropTypes.bool,
    screenWidth: PropTypes.oneOf([
      CSS_MOBILE,
      CSS_SMALL_TABLET,
      CSS_TABLET,
      CSS_SMALL_DESKTOP,
      CSS_LARGE_DESKTOP,
      CSS_XLARGE_DESKTOP,
      CSS_XXLARGE_DESKTOP
    ]),
    graphId: PropTypes.string,
    stageId: PropTypes.string,
    actionId: PropTypes.string,
    stageIndex: PropTypes.number,
    actionIndex: PropTypes.number,
    counts: PropTypes.array.isRequired,
    latestStageId: PropTypes.string,
    isBeingInvited: PropTypes.bool,
    openReaderPreview: PropTypes.func.isRequired,
    repositionAnnotations: PropTypes.func.isRequired
  };

  componentDidMount() {
    this.maybeRedirect();

    if (location.hash) {
      this._needScroll = location.hash; // the id to scroll to
      this.tryToScroll();
    } else {
      window.scrollTo(0, 0);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.props.location.search !== prevProps.location.search ||
      this.props.stageIndex !== prevProps.stageIndex ||
      this.props.actionIndex !== prevProps.actionIndex
    ) {
      this.maybeRedirect();
    }

    // scroll to id
    const hash = this.props.location.hash;
    const prevHash = prevProps.location.hash;

    if (hash && prevHash !== hash) {
      this._needScroll = hash; // the id to scroll to
      this.tryToScroll();
    }

    // when the panel is expanded and collapsed we need to reposition the annoation as the width of the publisher main body changes
    if (
      this.props.showPanel !== prevProps.showPanel &&
      (this.props.screenWidth > CSS_TABLET ||
        prevProps.screenWidth > CSS_TABLET) // only matter if screen width is larger than Tablet otherwise the side bar overlays on top instead of "pushing" the content
    ) {
      this.timeoutId = setTimeout(() => {
        this.props.repositionAnnotations(null, { caller: 'publisher' });
      }, 210); // the CSS transition is 0.2 sec (see app-layout.css in UI)
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutId);
  }

  tryToScroll() {
    // TODO track loading and keep re-scrolling untill all content is loaded
    const hash = this._needScroll;
    if (hash) {
      const $target = document.getElementById(hash.substring(1));
      if ($target) {
        const rect = $target.getBoundingClientRect();
        window.scroll({
          top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT - 40,
          behavior: 'smooth'
        });

        delete this._needScroll;
      }
    }
  }

  maybeRedirect() {
    const {
      history,
      location,
      stageIndex,
      actionIndex,
      latestStageId
    } = this.props;

    // if latestStageId is undefined, we wait untill we get data
    if (latestStageId != null) {
      const query = querystring.parse(location.search.substring(1));
      if (
        query.stage !== String(stageIndex) ||
        query.action !== String(actionIndex)
      ) {
        history.replace({
          pathname: location.pathname,
          search: `?${querystring.stringify(
            Object.assign({}, query, { stage: stageIndex, action: actionIndex })
          )}`
        });
      }
    }
  }

  handlePreview = () => {
    const {
      history,
      location,
      openReaderPreview,
      match,
      graphId,
      isPreviewOutdated
    } = this.props;

    const journalId = `journal:${match.params.journalId}`;

    openReaderPreview(history, location, journalId, graphId, isPreviewOutdated);
  };

  render() {
    const {
      match,
      history,
      location,
      user,
      disabled: _disabled,
      readOnly: _readOnly,
      isBeingInvited,
      graphId,
      stageId,
      actionId,
      stageIndex,
      actionIndex,
      latestStageId,
      screenWidth,
      showPanel,
      onPanelClick,
      onTogglePanel,
      canViewFilesAttachment,
      isReady
    } = this.props;

    const disabled = _disabled || isBeingInvited;
    const readOnly = _readOnly || isBeingInvited;

    const query = querystring.parse(location.search.substring(1));
    const displayedVersion = query.version;
    const isViewingPreviousStage = stageId !== latestStageId;

    const scopeId = `graph:${match.params.graphId}`;
    const journalId = `journal:${match.params.journalId}`;

    let status, statusMessage;
    let prevStage = latestStageId !== stageId;
    if (prevStage) {
      status = 'warning';
      statusMessage = `You are viewing a previous stage`;
    }

    return (
      <AppLayout
        leftExpanded={showPanel}
        rightExpanded={false}
        virtualRight={screenWidth >= CSS_TABLET}
      >
        <AppLayoutHeader>
          <Helmet>
            <title>sci.pe • submission</title>
          </Helmet>
          <Header
            showHamburger={true}
            status={status}
            statusMessage={statusMessage}
            onClickHamburger={onTogglePanel}
            userBadgeMenu={<ConnectedUserBadgeMenu />}
            crumbs={getCrumbs(location, query, journalId, scopeId)}
            homeLink={{ to: { pathname: '/' } }}
            showHome={true}
            logoLink={{ to: { pathname: '/' } }}
            startMenu={<StartMenu />}
          >
            <PaperSwitch
              checked={false}
              onClick={this.handlePreview}
              disabled={!canViewFilesAttachment}
            >
              <Iconoclass
                iconName="manuscriptPreview"
                size="14px"
                iconSize={16}
                style={{ left: '-1px', color: 'var(--grey-700)' }}
              />
            </PaperSwitch>
          </Header>
        </AppLayoutHeader>

        <AppLayoutSubHeader>
          <PublisherJoinSubHeader history={history} graphId={graphId} />
        </AppLayoutSubHeader>

        <AppLayoutLeft backgroundOnDesktop={false}>
          {graphId != null &&
            stageId != null &&
            actionId != null &&
            stageIndex != null &&
            actionIndex != null && (
              <PublisherSidebar
                user={user}
                journalId={journalId}
                graphId={
                  /* For the sidebar we always render based on the displayed version */
                  displayedVersion
                    ? `${getScopeId(graphId)}?version=${displayedVersion}`
                    : graphId
                }
                stageId={stageId}
                actionId={actionId}
                location={location}
                history={history}
                disabled={!!disabled}
                readOnly={!!readOnly}
                canViewFilesAttachment={canViewFilesAttachment}
                onPanelClick={onPanelClick}
              />
            )}
        </AppLayoutLeft>

        <AppLayoutMiddle widthMode="auto">
          {graphId != null &&
            stageId != null &&
            actionId != null &&
            stageIndex != null &&
            actionIndex != null && (
              <ResourceView
                isReady={isReady}
                displayedVersion={displayedVersion}
                user={user}
                journalId={journalId}
                graphId={graphId}
                stageId={stageId}
                actionId={actionId}
                stageIndex={stageIndex}
                actionIndex={actionIndex}
                disabled={isViewingPreviousStage ? true : !!disabled}
                readOnly={isViewingPreviousStage ? true : !!readOnly}
              />
            )}
        </AppLayoutMiddle>
      </AppLayout>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.user,
    (state, props) => props.location,
    (state, props) => state.screenWidth,
    state => state.pouch.isLoadingFromPouch,
    state => state.fetchEncodingStatus,
    (state, props) => {
      const scopeData = state.scopeMap[`graph:${props.match.params.graphId}`];
      return scopeData && scopeData.graphMap;
    },
    createActionMapSelector({
      getGraphId: function(state, props) {
        return `graph:${props.match.params.graphId}`;
      }
    }),
    createGraphAclSelector({
      getGraphId: function(state, props) {
        return `graph:${props.match.params.graphId}`;
      }
    }),
    (
      user,
      location,
      screenWidth,
      isLoadingFromPouch,
      fetchEncodingStatus,
      graphMap = {},
      actionMap = {},
      acl
    ) => {
      const query = querystring.parse(location.search.substring(1));

      const {
        graphId,
        stageId,
        latestStageId,
        actionId,
        stageIndex,
        actionIndex
      } = parseAnnotableQueryParameters(query, actionMap, { user, acl });

      const action = getWorkflowAction(actionId, { user, acl, actionMap });

      // We find the latest action that provided the files (if the current stage doesn't have one, we look at the stage before that etc.)
      let isPreviewOutdated, canViewFilesAttachment;
      if (action && action['@type'] === 'TypesettingAction') {
        isPreviewOutdated = false;
        canViewFilesAttachment = acl.checkPermission(
          user,
          'ViewActionPermission',
          {
            action
          }
        );
      } else {
        const stages = getSortedStages(actionMap);
        const sortedStageIndex = stages.findIndex(
          stage => getId(stage) === stageId
        );

        // TODO get file action for instrument unless it is a publish action in this case fileAction is the publish action ?
        const fileAction = getFileAction(action, { user, actionMap, acl });

        let latestFileAction;
        for (let i = 0; i <= sortedStageIndex; i++) {
          const actions = getStageActions(stages[i]);
          latestFileAction = actions.find(
            action =>
              action['@type'] === 'CreateReleaseAction' ||
              action['@type'] === 'PublishAction'
          );

          if (latestFileAction) {
            latestFileAction = getInstance(latestFileAction, {
              actionMap,
              user,
              acl
            });
            break;
          }
        }

        isPreviewOutdated = getId(latestFileAction) !== getId(fileAction);

        // we only display file attachment if the user has access to the
        // `action` (rendering context) and if the file action is not `action` if
        // it has been completed _or_ the user has write access to it (we don't
        // display files attachment when file action is not completed)
        canViewFilesAttachment =
          acl.checkPermission(user, 'ViewActionPermission', {
            action
          }) &&
          (getId(action) === getId(fileAction) ||
            (fileAction &&
              ((fileAction.actionStatus === 'CompletedActionStatus' &&
                acl.checkPermission(user, 'ViewActionPermission', {
                  action: fileAction
                })) ||
                acl.checkPermission(user, 'PerformActionPermission', {
                  action: fileAction
                }))));
      }

      let isReady = isLoadingFromPouch === false;
      if (isReady && canViewFilesAttachment) {
        // We wait for all the fetchable encoding to have loaded
        const graphData = graphMap[graphId];
        if (graphData) {
          const overwriteNodeMap = getOverwriteNodeMap(actionId, {
            user,
            acl,
            actionMap
          });

          const fetchableEncodings = getFetchableEncodings(
            graphData.graph,
            overwriteNodeMap || graphData.nodeMap
          );

          const isStillFetching = checkIfIsStillFetching(
            fetchableEncodings,
            fetchEncodingStatus
          );

          isReady = !isStillFetching;
        }
      }

      return {
        isReady,
        isPreviewOutdated,
        canViewFilesAttachment,
        screenWidth,
        counts: [0, 0, 0, 0, 0], // TODO remove
        graphId,
        stageId,
        actionId,
        stageIndex,
        actionIndex,
        latestStageId,
        isBeingInvited: Object.values(actionMap).some(action => {
          return (
            action['@type'] === 'InviteAction' &&
            (action.actionStatus === 'PotentialActionStatus' ||
              action.actionStatus === 'ActiveActionStatus') &&
            getAgentId(action.recipient) === getId(user)
          );
        })
      };
    }
  ),
  { openReaderPreview, repositionAnnotations }
)(
  withShowPanel(Publisher, {
    show: function(screenWidth) {
      return screenWidth >= CSS_SMALL_DESKTOP; // publisher has 3 column layout with CSS_SMALL_DESKTOP
    }
  })
);

function getCrumbs(location, query, journalId, graphId) {
  return [
    {
      key: 'journal',
      page: 'journal',
      periodical: journalId,
      reset: true,
      children: unprefix(getId(journalId))
    },
    {
      key: 'submission',
      to: location.pathname,
      children: unprefix(getScopeId(graphId))
    }
  ];
}
