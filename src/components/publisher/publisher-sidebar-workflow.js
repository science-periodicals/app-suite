import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import moment from 'moment';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import pluralize from 'pluralize';
import { getId, arrayify, textify, unprefix } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import {
  API_LABELS,
  Hyperlink,
  Span,
  DateFromNow,
  Div,
  Tooltip,
  Timeline,
  ActionIdentifier
} from '@scipe/ui';
import {
  getScopeId,
  getStageActions,
  getActionOrder,
  getBlockingActions
} from '@scipe/librarian';
import {
  createGraphAclSelector,
  createActionMapSelector
} from '../../selectors/graph-selectors';
import {
  getSortedStages,
  getWorkflowStatusIcon,
  getInstance
} from '../../utils/workflow';
import { StatusNotice, WarningNotice } from '../notice';
import { StyleSection, StyleList, StyleListRow } from './publisher-sidebar';
import { getAnnotableQueryParameters } from '../../utils/annotations';
import LiveWorkflowActionUserBadgeMenu from '../live-workflow-action-user-badge-menu';

class PublisherSidebarWorkflow extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    actionId: PropTypes.string,
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,

    history: PropTypes.object.isRequired,
    search: PropTypes.string.isRequired,

    // redux
    actionMap: PropTypes.object,
    acl: PropTypes.object.isRequired,
    graph: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {
      hoveredActionIds: []
    };
  }

  handleHoverAction(actionId) {
    this.setState({
      hoveredActionIds: [actionId]
    });
  }

  handleHoverOutAction(actionId) {
    this.setState({
      hoveredActionIds: []
    });
  }

  handleHoverTimeline = (graphId, hoveredActionIds) => {
    this.setState({
      hoveredActionIds
    });
  };

  handleHoverOutTimeline = () => {
    this.setState({
      hoveredActionIds: []
    });
  };

  handleClickTimeline(stages, graphId, actionIds) {
    const { journalId, actionMap, search, history } = this.props;

    const actionId = actionIds[0];

    // due to possibility of cycles we need to get the action of the stage to be sure that it's the right instance
    const stage = stages.find(stage => {
      const actions = getStageActions(stage);
      return actions.some(action => getId(action) === actionId);
    });

    const { query } = getAnnotableQueryParameters(
      {
        stageId: getId(stage),
        actionId: arrayify(actionIds)[0]
      },
      actionMap
    );

    history.push({
      pathname: `/${unprefix(journalId)}/${unprefix(
        getScopeId(graphId)
      )}/submission`,
      search: querystring.stringify(
        Object.assign(querystring.parse(search.substring(1)), query)
      )
    });
  }

  getStatusName(action) {
    switch (action.actionStatus) {
      case 'CanceledActionStatus':
        return 'canceled';
      case 'ActiveActionStatus':
        return 'active';
      case 'CompletedActionStatus':
        return 'completed';
      case 'FailedActionStatus':
        return 'failed';
      case 'EndorsedActionStatus':
      case 'StagedActionStatus':
        return 'staged';
      case 'WaitingActionStatus':
        return 'waiting';
    }
  }

  renderActionTocData(actionTocData, stage) {
    const { user, actionMap, graph, journalId, actionId, acl } = this.props;

    return (
      <StyleList>
        {actionTocData.map(({ action, statusIcon }) => (
          <StyleListRow key={getId(action)} active={getId(action) === actionId}>
            <div
              className={`publisher-sidebar-workflow__action-bullet publisher-sidebar-workflow__action-bullet--${this.getStatusName(
                action
              )}`}
            />
            <div
              className="publisher-sidebar-workflow__user-info"
              onMouseEnter={this.handleHoverAction.bind(this, getId(action))}
              onMouseLeave={this.handleHoverOutAction.bind(this, getId(action))}
            >
              <LiveWorkflowActionUserBadgeMenu
                user={user}
                acl={acl}
                action={action}
                stage={stage}
                graph={graph}
                disabled={true}
                readOnly={true}
              />

              <Hyperlink
                page="publisher"
                graph={graph}
                periodical={journalId}
                query={
                  getAnnotableQueryParameters(
                    { stageId: getId(stage), actionId: getId(action) },
                    actionMap
                  ).query
                }
              >
                <Span>
                  {action.name ||
                    API_LABELS[action['@type']] ||
                    action['@type']}
                </Span>
              </Hyperlink>
            </div>
            <div className="publisher-sidebar-workflow__status-icons">
              <ActionIdentifier>{action.identifier}</ActionIdentifier>
              <Iconoclass iconName={statusIcon} iconSize={18} />
            </div>
          </StyleListRow>
        ))}
      </StyleList>
    );
  }

  render() {
    const { user, actionMap, graph, stageId, actionId, acl } = this.props;

    const { hoveredActionIds } = this.state;

    if (!graph || !acl) return null;
    const stages = getSortedStages(actionMap);
    const stage = stageId
      ? stages.find(stage => getId(stage) === stageId)
      : stages[0];

    const stageActions = getStageActions(stage).map(action =>
      getInstance(action, { actionMap, user, acl })
    );

    const isViewingPreviousStage = getId(stage) !== getId(stages[0]);

    const isPublished = !!graph.datePublished;
    const isRejected = !!graph.dateRejected;

    const blockingActions = [];
    const actionableActions = [];
    const actionTocData = [];

    stageActions
      .filter(action => action['@type'] !== 'EndorseAction')
      .forEach(action => {
        const _blockingActions = getBlockingActions(action, stage).map(action =>
          getInstance(action, { actionMap, user, acl })
        );

        const canDo = acl.checkPermission(user, 'PerformActionPermission', {
          action
        });

        if (canDo) {
          if (!_blockingActions.length) {
            actionableActions.push(action);
          }
          _blockingActions.forEach(_action => {
            if (
              !blockingActions.some(action => getId(action) == getId(_action))
            ) {
              blockingActions.push(_action);
            }
          });
        }

        const statusIcon = getWorkflowStatusIcon(user, acl, action, stage);

        actionTocData.push({
          action,
          canDo: !!canDo,
          isBlocked: !!_blockingActions.length,
          statusIcon
        });
      });

    actionTocData.sort((a, b) => {
      const orderA = getActionOrder(a.action);
      const orderB = getActionOrder(b.action);
      if (orderA === orderB) {
        if (a.action.identifier && b.action.identifier) {
          const [, ia] = a.action.identifier.split('.');
          const [, ib] = b.action.identifier.split('.');
          return parseInt(ia, 10) - parseInt(ib, 10);
        }
      }
      return orderA - orderB;
    });

    const isActionable =
      !isPublished && !isRejected && !!actionableActions.length;

    const isBlocked =
      !isPublished && !isRejected && !isActionable && !!blockingActions.length;

    const thisYear = moment().year();

    // TODO waiting for stage completion (if not blocked, nothing to do and pending actions)
    // TODO x action to assign, x action to complete

    return (
      <StyleSection className="publisher-sidebar-workflow">
        <Timeline
          graph={graph}
          actions={Object.values(actionMap)}
          alwaysShowText={true}
          onHover={this.handleHoverTimeline}
          onHoverOut={this.handleHoverOutTimeline}
          hoveredActionIds={hoveredActionIds}
          clickedActionIds={[actionId]}
          onClick={this.handleClickTimeline.bind(this, stages)}
        />

        {isViewingPreviousStage ? (
          <WarningNotice className="publisher-sidebar__notice">
            You are viewing a previous stage
          </WarningNotice>
        ) : (
          <Fragment>
            {isPublished && (
              <StatusNotice className="publisher-sidebar__notice">
                <span>
                  Published <DateFromNow>{graph.datePublished}</DateFromNow>
                </span>
              </StatusNotice>
            )}

            {isRejected && (
              <StatusNotice className="publisher-sidebar__notice">
                <span>
                  Rejected <DateFromNow>{graph.dateRejected}</DateFromNow>
                </span>
              </StatusNotice>
            )}

            {isBlocked && (
              <Fragment>
                <StatusNotice className="publisher-sidebar__notice">
                  {`Waiting on ${blockingActions.length} ${pluralize(
                    'action',
                    blockingActions.length
                  )}`}
                </StatusNotice>
              </Fragment>
            )}
          </Fragment>
        )}

        <StyleList>
          {stages.reverse().map((stage, i) => {
            const stageName = stage.name
              ? `${textify(stage.name)} (${stage.identifier})`
              : `Stage ${stage.identifier}`;

            return (
              <li
                className={`publisher-sidebar-workflow__stage${
                  stageId == getId(stage)
                    ? ' publisher-sidebar-workflow__stage--active'
                    : ''
                }`}
                key={getId(stage)}
              >
                <div className="publisher-sidebar-workflow__stage-header">
                  {/* stage name */}
                  <div className="publisher-sidebar-workflow__stage-bullet" />
                  <div className="publisher-sidebar-workflow__stage-header-content">
                    <Hyperlink
                      page="publisher"
                      graph={graph}
                      query={
                        getAnnotableQueryParameters(
                          { stageId: getId(stage) },
                          actionMap
                        ).query
                      }
                    >
                      <Div className="publisher-sidebar-workflow__stage-name">
                        {stageName}
                      </Div>
                    </Hyperlink>

                    <div className="publisher-sidebar-workflow__time-range">
                      <Tooltip
                        displayText={moment(stage.startTime).format(
                          'MMMM D YYYY, h:mm a'
                        )}
                      >
                        <span className="publisher-sidebar-workflow__time">
                          {moment(stage.startTime).year() !== thisYear
                            ? moment(stage.startTime).format(
                                'MMM D YYYY, h:mm a'
                              )
                            : moment(stage.startTime).format('MMM D, h:mm a')}
                        </span>
                      </Tooltip>
                      <span className="publisher-sidebar-workflow__time-middle">
                        —
                      </span>
                      {stages[i + 1] ||
                      graph.datePublished ||
                      graph.dateRejected ? (
                        <Tooltip
                          displayText={moment(
                            graph.datePublished ||
                              graph.dateRejected ||
                              stages[i + 1].startTime
                          ).format('MMMM D YYYY, h:mm a')}
                        >
                          <span className="publisher-sidebar-workflow__time">
                            {moment(stage.startTime).year() !== thisYear
                              ? moment(
                                  graph.datePublished ||
                                    graph.dateRejected ||
                                    stages[i + 1].startTime
                                ).format('MMM D YYYY, h:mm a')
                              : moment(
                                  graph.datePublished ||
                                    graph.dateRejected ||
                                    stages[i + 1].startTime
                                ).format('MMM D, h:mm a')}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="publisher-sidebar-workflow__time" />
                      )}
                    </div>
                  </div>
                </div>
                {/* The list of action of the stage (only displayed if the stage is active (selected / being viewed) */}
                {stageId === getId(stage) ? (
                  <div className="publisher-sidebar-workflow__action-list">
                    {this.renderActionTocData(actionTocData, stage)}
                  </div>
                ) : null}
              </li>
            );
          })}
        </StyleList>
      </StyleSection>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.graphId,
    (state, props) => state.scopeMap[getScopeId(props.graphId)],
    createGraphAclSelector(),
    createActionMapSelector(),
    (graphId, scopeData = {}, acl, actionMap) => {
      const { graphMap } = scopeData;
      let graph;
      if (graphMap) {
        const graphData = graphMap[getScopeId(graphId)];
        if (graphData) {
          graph = graphData.graph;
        }
      }

      return {
        actionMap,
        graph,
        acl
      };
    }
  )
)(PublisherSidebarWorkflow);
