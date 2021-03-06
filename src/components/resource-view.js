import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, unprefix } from '@scipe/jsonld';
import {
  AppLayoutVirtualRightMargin,
  AppLayoutMiddleLeftSpacer,
  AppLayoutMiddleRightSpacer,
  LinkInterceptor
} from '@scipe/ui';
import { getScopeId, getLocationIdentifier } from '@scipe/librarian';
import {
  createGraphDataSelector,
  createGraphAclSelector,
  createActionMapSelector,
  createCommentMapSelector
} from '../selectors/graph-selectors';
import {
  saveWorkflowAction,
  postWorkflowAction
} from '../actions/workflow-action-creators';
import {
  getAnnotableActionData,
  getHydratedTopLevelResources,
  getOverwriteNodeMap
} from '../utils/workflow';
import Shell from './shell';
import DocumentLoader from './document-loader';
import AnnotableAction from './annotable-action';
import Permalink from './permalink';
import withAnnotable from '../hoc/with-annotable';
import { openShell, scrollToHash } from '../actions/ui-action-creators';
import Counter from '../utils/counter';
import Iconoclass from '@scipe/iconoclass';

class ResourceView extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    journalId: PropTypes.string.isRequired,
    stageId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired,
    actionIndex: PropTypes.number.isRequired,
    stageIndex: PropTypes.number.isRequired,
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool,
    displayedVersion: PropTypes.string,

    // redux
    isReadyForVisualRegressionTesting: PropTypes.bool.isRequired, // Used for backstop.js for now
    graph: PropTypes.object,
    acl: PropTypes.object.isRequired,
    annotableActionData: PropTypes.shape({
      stage: PropTypes.object,
      action: PropTypes.object,
      nComments: PropTypes.number,
      endorseAction: PropTypes.object,
      serviceActions: PropTypes.arrayOf(PropTypes.object), // instantiated service action for CreateReleaseAction
      blockingActions: PropTypes.array,
      authorizeActions: PropTypes.array, // needed to display future audiences
      isBlocked: PropTypes.bool,
      isReadyToBeSubmitted: PropTypes.bool,
      canView: PropTypes.bool,
      canAssign: PropTypes.bool,
      canAssignEndorseAction: PropTypes.bool,
      canComment: PropTypes.bool,
      canReschedule: PropTypes.bool,
      canCancel: PropTypes.bool,
      canPerform: PropTypes.bool,
      canEndorse: PropTypes.bool,
      canViewEndorse: PropTypes.bool,
      completeImpliesSubmit: PropTypes.bool
    }).isRequired,
    blindingData: PropTypes.object,
    saveWorkflowAction: PropTypes.func.isRequired,
    postWorkflowAction: PropTypes.func.isRequired,
    openShell: PropTypes.func.isRequired,
    scrollToHash: PropTypes.func.isRequired
  };

  static defaultProps = {
    displayAnnotations: true,
    annotableActionData: {}
  };

  constructor(props) {
    super(props);

    this.state = {
      isLoading: true
    };
    this.counterCache = {};
  }

  componentDidMount() {
    this._isMounted = true;
    this.deferContentRendering();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.actionId !== prevProps.actionId) {
      this.deferContentRendering();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    cancelAnimationFrame(this.animId);
  }

  deferContentRendering() {
    // We defer the content rendering to avoid blocking the UI during route transitions
    clearTimeout(this.animId);
    this.setState({ isLoading: true }, () => {
      // wait for 2 animation frames before rendering
      this.animId = requestAnimationFrame(() => {
        this.animId = requestAnimationFrame(() => {
          if (this._isMounted) {
            this.setState({ isLoading: false });
          }
        });
      });
    });
  }

  handleLink = (e, $a, type, resourceId, parsed) => {
    const { openShell, scrollToHash } = this.props;

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
        if (parsed.hash && parsed.hash.startsWith('#v')) {
          // First special case, the link is within a container with a
          // `data-data-force-scroll` attribute
          // => we scroll
          const $forceScrollContainer = document.querySelector(
            '[data-force-scroll]'
          );

          if ($forceScrollContainer) {
            scrollToHash(parsed.hash, { queue: true });
            return;
          }

          // handle `data-prevent-link-interceptor` attributee
          if (
            $a.hasAttribute('data-prevent-link-interceptor') &&
            String($a.getAttribute('data-prevent-link-interceptor')) === 'true'
          ) {
            return;
          }

          // for `location`, the event will be prevented by openShell based on wether the shell is already open or not
          e.persist();
          openShell('location', parsed.hash, {
            hash: parsed.hash,
            e
          });
        }

        break;
    }
  };

  createCounter() {
    const {
      journalId,
      graphId,
      stageIndex,
      actionIndex,
      annotableActionData: { action }
    } = this.props;

    const key = `${graphId}-${getId(action)}-${stageIndex}-${actionIndex}`;
    if (key in this.counterCache) {
      return this.counterCache[key];
    }

    const counter = new Counter({
      origin: window.location.origin,
      pathname: `/${unprefix(journalId)}/${unprefix(
        getScopeId(graphId)
      )}/submission`,
      hashLevel: 3,
      search: `?stage=${stageIndex}&action=${actionIndex}`,
      counts: [
        stageIndex,
        actionIndex,
        getLocationIdentifier(action['@type']),
        0
      ]
    });

    this.counterCache[key] = counter;

    return this.counterCache[key];
  }

  render() {
    const {
      graphId,
      journalId,
      stageId,
      actionId,
      user,
      disabled,
      readOnly,
      displayAnnotations,
      graph,
      displayedVersion,
      acl,
      annotableActionData: {
        stage,
        action,
        nComments,
        endorseAction,
        serviceActions,
        blockingActions,
        authorizeActions,
        isBlocked,
        isReadyToBeSubmitted,
        canView,
        canAssign,
        canAssignEndorseAction,
        canReschedule,
        canCancel,
        canComment,
        canPerform,
        canEndorse,
        canViewEndorse,
        completeImpliesSubmit
      },
      blindingData,
      saveWorkflowAction,
      postWorkflowAction,
      isReadyForVisualRegressionTesting
    } = this.props;

    const { isLoading } = this.state;

    const counter = this.createCounter();

    return (
      <LinkInterceptor
        className="resource-view max-indent-level-1--delete"
        onLink={this.handleLink}
      >
        <div
          className="resource-view__body"
          id="resource-view__portal-context"
          data-test-ready={isReadyForVisualRegressionTesting.toString()}
        >
          <div className="resource-view__outbound-divider">
            <span>Outbound Resources</span>
            <Iconoclass
              iconName="outbound"
              className="received-attachment-container__icon"
              size="18px"
            />
          </div>

          <DocumentLoader
            forceLoading={!action || isLoading}
            label={isLoading ? 'Loading…' : 'Syncing Documents…'}
          >
            <div className="resource-view__action-type-groups reverse-z-index">
              <section className="resource-view__action" id={actionId}>
                <Permalink first={true} counter={counter} />

                <div className="resource-view__action-content">
                  <AnnotableAction
                    key={
                      actionId /* needed so that react doesn't try to reconcile on stage / actin transition (too costly given the annotation need to change) */
                    }
                    user={user}
                    graphId={graphId}
                    journalId={journalId}
                    stageId={stageId}
                    displayedVersion={displayedVersion}
                    counter={counter}
                    stage={stage}
                    action={action}
                    nComments={nComments}
                    endorseAction={endorseAction}
                    authorizeActions={authorizeActions}
                    serviceActions={serviceActions}
                    blockingActions={blockingActions}
                    isBlocked={isBlocked}
                    isReadyToBeSubmitted={isReadyToBeSubmitted}
                    canEndorse={canEndorse}
                    canViewEndorse={canViewEndorse}
                    canPerform={canPerform}
                    canView={canView}
                    canAssign={canAssign}
                    canAssignEndorseAction={canAssignEndorseAction}
                    canComment={canComment}
                    canReschedule={canReschedule}
                    canCancel={canCancel}
                    completeImpliesSubmit={completeImpliesSubmit}
                    disabled={disabled}
                    readOnly={!!readOnly}
                    annotable={!disabled}
                    displayAnnotations={displayAnnotations}
                    graph={graph}
                    acl={acl}
                    blindingData={blindingData}
                    saveWorkflowAction={saveWorkflowAction}
                    postWorkflowAction={postWorkflowAction}
                  />
                </div>
              </section>
            </div>
          </DocumentLoader>
        </div>

        <AppLayoutVirtualRightMargin />

        <div className="resource-view__shell-positioner">
          <AppLayoutMiddleLeftSpacer />

          <Shell
            journalId={journalId}
            graphId={
              displayedVersion
                ? `${getScopeId(graphId)}?version=${displayedVersion}`
                : graphId
            }
            stageId={stageId}
            readOnly={readOnly}
            disabled={disabled}
            counter={counter}
            actionId={actionId}
            blindingData={blindingData}
            renderingContextPathname={counter.pathname}
            renderingContextSearch={counter.search}
          />
          <AppLayoutMiddleRightSpacer />
        </div>
      </LinkInterceptor>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    (state, props) => props.stageId,
    (state, props) => props.actionId,
    createGraphDataSelector(),
    createActionMapSelector(),
    createCommentMapSelector(),
    createGraphAclSelector(),
    (
      user,
      stageId,
      actionId,
      graphData = {},
      actionMap = {},
      commentMap = {},
      graphAcl
    ) => {
      // TODO? get rid of hydratedTopLevelResources
      const graph = graphData.graph;
      const overwriteNodeMap = getOverwriteNodeMap(actionId, {
        user,
        actionMap,
        acl: graphAcl
      });
      const nodeMap = overwriteNodeMap || graphData.nodeMap;

      const hydratedTopLevelResources = getHydratedTopLevelResources(
        graph,
        nodeMap
      );

      return {
        graph: graphData.graph,
        acl: graphAcl,
        annotableActionData: getAnnotableActionData(
          graphData.graph,
          stageId,
          actionId,
          user,
          graphAcl,
          actionMap,
          commentMap,
          hydratedTopLevelResources
        ),
        blindingData:
          graphAcl &&
          graphAcl.getBlindingData(user, {
            ignoreEndDateOnPublicationOrRejection: true
          })
      };
    }
  ),
  {
    saveWorkflowAction,
    postWorkflowAction,
    openShell,
    scrollToHash
  }
)(withAnnotable(ResourceView));
