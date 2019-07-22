import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import moment from 'moment';
import pickBy from 'lodash/pickBy';
import pluralize from 'pluralize';
import capitalize from 'lodash/capitalize';
import groupBy from 'lodash/groupBy';
import {
  inferStartTime,
  getStageActions,
  getActionPotentialAssignee,
  needActionAssignment,
  isActionAssigned,
  getChecksumValue,
  getActiveAudience,
  getActiveAudiences,
  getObject,
  getLocationIdentifier
} from '@scipe/librarian';
import { getId, arrayify } from '@scipe/jsonld';
import {
  ControlPanel,
  ButtonMenu,
  Price,
  Value,
  Span,
  PaperButton,
  ActionAudience,
  API_LABELS,
  PaperDateInput,
  PaperTimeInput,
  MenuItem,
  getIconNameFromSchema,
  Hyperlink,
  getDisplayName
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import {
  ERROR_NEED_ASSIGNMENT,
  ERROR_NEED_ASSIGNEE,
  ERROR_NEED_ENDORSER_ASSIGNMENT,
  ERROR_NEED_ENDORSER
} from '../constants';
import Annotable from './annotable';
import LiveWorkflowActionUserBadgeMenu from './live-workflow-action-user-badge-menu';
import {
  getCompletedDate,
  getEndorsedDate,
  getDueDateTime,
  getStagedDate
} from '../utils/action';
import Notice from './notice';
import Counter from '../utils/counter';
import ConnectedPayActionPayButton from './connected-pay-action-pay-button';
import {
  pluralizeAudienceType,
  getWorkflowStatusIcon,
  checkIsAutoEndorsedAction
} from '../utils/workflow';
import { isFree } from '../utils/payment-utils';
import { openShell } from '../actions/ui-action-creators';
import { getSelectorGraphParam } from '../utils/annotations';

class AnnotableActionHead extends Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,

    counter: PropTypes.instanceOf(Counter).isRequired,

    stage: PropTypes.object.isRequired,
    action: PropTypes.object.isRequired,
    endorseAction: PropTypes.object,
    serviceActions: PropTypes.arrayOf(PropTypes.object), // instantiated service action for CreateReleaseAction
    blockingActions: PropTypes.array,
    authorizeActions: PropTypes.array,
    completeImpliesSubmit: PropTypes.bool.isRequired,
    isBlocked: PropTypes.bool.isRequired,
    isReadyToBeSubmitted: PropTypes.bool.isRequired,
    canView: PropTypes.bool.isRequired,
    canAssign: PropTypes.bool.isRequired,
    canAssignEndorseAction: PropTypes.bool,
    canComment: PropTypes.bool.isRequired,
    canReschedule: PropTypes.bool.isRequired,
    canCancel: PropTypes.bool,
    canPerform: PropTypes.bool.isRequired,
    canEndorse: PropTypes.bool.isRequired,
    canViewEndorse: PropTypes.bool.isRequired,
    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    graph: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,

    blindingData: PropTypes.object.isRequired,
    saveWorkflowAction: PropTypes.func.isRequired,
    postWorkflowAction: PropTypes.func.isRequired,

    // redux
    openShell: PropTypes.func.isRequired
  };

  static defaultProps = {
    serviceActions: [],
    blockingActions: []
  };

  static getDerivedStateFromProps(props, state) {
    const lastExpectedDuration = props.action && props.action.expectedDuration;
    if (lastExpectedDuration !== state.lastExpectedDuration) {
      return {
        canSubmitNewDueDateTime: false,
        dueDateTime: getDueDateTime(props.action, props.stage),
        lastExpectedDuration
      };
    }
    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      canSubmitNewDueDateTime: false,
      dueDateTime: getDueDateTime(props.action, props.stage)
    };
  }

  handleEndorse = role => {
    const { graph, endorseAction, postWorkflowAction } = this.props;
    postWorkflowAction(getId(graph), endorseAction, {
      postAs: role,
      actionStatus: 'CompletedActionStatus'
    });
  };

  handleAction = action => {
    const { graph, postWorkflowAction } = this.props;
    postWorkflowAction(getId(graph), action);
  };

  handleSubmit(role, stageInsteadOfComplete) {
    const { graph, action, endorseAction, postWorkflowAction } = this.props;

    postWorkflowAction(getId(graph), action, {
      postAs: role,
      actionStatus:
        stageInsteadOfComplete ||
        (endorseAction &&
          endorseAction.actionStatus === 'PotentialActionStatus' &&
          action['@type'] !== 'PayAction')
          ? 'StagedActionStatus'
          : 'CompletedActionStatus'
    });
  }

  handlePaymentSubmitted = (token, role) => {
    const { graph, action, postWorkflowAction } = this.props;

    postWorkflowAction(getId(graph), action, {
      postAs: role,
      actionStatus: 'CompletedActionStatus',
      paymentToken: token
        ? { '@type': 'PaymentToken', value: token.id }
        : undefined // token may be undefined if price was 0
    });
  };

  handleCancel(role) {
    const { graph, action, postWorkflowAction } = this.props;

    postWorkflowAction(
      getId(graph),
      pickBy({
        '@type': 'CancelAction',
        object: getId(action),
        participant: action.participant
      }),
      {
        postAs: role,
        actionStatus: 'CompletedActionStatus'
      }
    );
  }

  handleDueDateTimeChange = nextDate => {
    const { action, stage } = this.props;
    let canSubmitNewDueDateTime = false;
    const startTime = inferStartTime(action, stage);

    if (startTime) {
      const startMoment = moment(startTime);
      const dueMoment = moment(getDueDateTime(action, stage));
      const nextDueMoment = moment(nextDate);
      if (
        !nextDueMoment.isSame(dueMoment) &&
        nextDueMoment.isAfter(startMoment)
      ) {
        canSubmitNewDueDateTime = true;
      }
    }
    this.setState({ dueDateTime: nextDate, canSubmitNewDueDateTime });
  };

  handleReschedule(role) {
    const { dueDateTime } = this.state;
    const { graph, action, stage, postWorkflowAction } = this.props;
    const startTime = inferStartTime(action, stage);

    if (startTime) {
      const startMoment = moment(startTime);
      const dueMoment = moment(getDueDateTime(action, stage));
      const nextDueMoment = moment(dueDateTime);
      if (
        !nextDueMoment.isSame(dueMoment) &&
        nextDueMoment.isAfter(startMoment)
      ) {
        const nextDuration = moment
          .duration(nextDueMoment.diff(startMoment))
          .toISOString();

        postWorkflowAction(
          getId(graph),
          pickBy({
            '@type': 'ScheduleAction',
            participant: action.participant,
            object: getId(action),
            expectedDuration: nextDuration
          }),
          {
            postAs: role,
            actionStatus: 'CompletedActionStatus'
          }
        );
      }
    }
  }

  renderButton() {
    const {
      user,
      action,
      endorseAction,
      graph,
      acl,
      disabled,
      readOnly,
      isReadyToBeSubmitted,
      isBlocked,
      authorizeActions,
      canEndorse,
      canPerform
    } = this.props;

    if (!graph || !acl) {
      return null;
    }

    const stageInsteadOfComplete =
      action.actionStatus === 'ActiveActionStatus' &&
      (getActiveAudience(action).length ||
        authorizeActions.some(action => {
          return action.completeOn === 'OnObjectStagedActionStatus';
        }));

    const activeRoles = acl.getActiveRoles(user);

    const agentUserRoles = activeRoles.filter(role => {
      const agent = action.agent;
      if (agent) {
        return (
          agent.roleName === role.roleName &&
          (!agent.name || agent.name === role.name)
        );
      }
    });

    const endorserUserRoles = endorseAction
      ? activeRoles.filter(role => {
          const agent = endorseAction.agent;
          if (agent) {
            return (
              agent.roleName === role.roleName &&
              (!agent.name || agent.name === role.name)
            );
          }
        })
      : [];

    // endorse case
    if (
      !readOnly &&
      canEndorse &&
      endorseAction.actionStatus !== 'CompletedActionStatus' &&
      action.actionStatus === 'StagedActionStatus'
    ) {
      const verb = 'Endorse';

      return endorserUserRoles.length === 1 ? (
        <PaperButton
          data-testid="annotable-action-button"
          capsule={true}
          raised={true}
          disabled={
            disabled ||
            (action.actionStatus === 'StagedActionStatus' &&
              !isReadyToBeSubmitted) ||
            action.actionStatus === 'ActiveActionStatus'
          }
          onClick={this.handleEndorse.bind(this, endorserUserRoles[0])}
        >
          <Iconoclass
            iconName="thumbUp"
            size="16px"
            className="annotable-action-head__endorse__button-icon"
          />
          <span>{verb}</span>
        </PaperButton>
      ) : (
        <ButtonMenu
          data-testid="annotable-action-button"
          capsule={true}
          raised={true}
          disabled={disabled}
        >
          <span>{`${verb} As…`}</span>
          {endorserUserRoles.map(role => (
            <MenuItem
              key={getId(role)}
              onClick={this.handleEndorse.bind(this, role)}
              disabled={
                disabled ||
                (action.actionStatus === 'StagedActionStatus' &&
                  !isReadyToBeSubmitted) ||
                action.actionStatus === 'ActiveActionStatus'
              }
            >
              {role.name ? `${role.name} (${role.roleName})` : role.roleName}
            </MenuItem>
          ))}
        </ButtonMenu>
      );
    }

    const isAutoEndorsedAction = checkIsAutoEndorsedAction(
      action,
      endorseAction
    );

    const isWaitingForEndorsement =
      !isAutoEndorsedAction &&
      !!endorseAction &&
      !canEndorse &&
      endorseAction.actionStatus !== 'CompletedActionStatus' &&
      action.actionStatus === 'StagedActionStatus';

    // Pay case (submit / donate) (staging payment is done below)
    if (
      !readOnly &&
      canPerform &&
      action['@type'] === 'PayAction' &&
      (!stageInsteadOfComplete || action.actionStatus === 'StagedActionStatus')
    ) {
      const verb = isFree(action.priceSpecification, {
        requestedPrice: action.requestedPrice
      })
        ? 'Complete'
        : 'Pay';

      return (
        <ConnectedPayActionPayButton
          data-testid="annotable-action-button"
          mode="payment"
          roles={agentUserRoles}
          disabled={
            disabled ||
            !canPerform ||
            isBlocked ||
            !isReadyToBeSubmitted ||
            isWaitingForEndorsement
          }
          priceSpecification={action.priceSpecification}
          requestedPrice={action.requestedPrice}
          numberOfUnit={1}
          checkoutInfo={
            <Notice iconName="money">
              <span>Amount due:&nbsp;</span>
              <strong>
                <Price
                  requestedPrice={
                    endorseAction &&
                    endorseAction.actionStatus === 'CompletedActionStatus'
                      ? action.requestedPrice
                      : undefined
                  }
                  priceSpecification={action.priceSpecification}
                  numberOfUnit={1}
                />
              </strong>
            </Notice>
          }
          onToken={this.handlePaymentSubmitted}
        >
          {agentUserRoles.length > 1 ? `${verb} As…` : verb}
        </ConnectedPayActionPayButton>
      );
    }

    // stage / submit case
    if (
      !readOnly &&
      canPerform &&
      (action['@type'] !== 'PayAction' ||
        (action['@type'] === 'PayAction' &&
          action.actionStatus === 'ActiveActionStatus'))
    ) {
      const verb = stageInsteadOfComplete ? 'Stage' : 'Submit';

      return agentUserRoles.length === 1 ? (
        <PaperButton
          data-testid="annotable-action-button"
          capsule={true}
          raised={true}
          disabled={
            disabled ||
            !canPerform ||
            isBlocked ||
            !isReadyToBeSubmitted ||
            isWaitingForEndorsement
          }
          onClick={this.handleSubmit.bind(
            this,
            agentUserRoles[0],
            stageInsteadOfComplete
          )}
        >
          {verb}
        </PaperButton>
      ) : (
        <ButtonMenu
          data-testid="annotable-action-button"
          capsule={true}
          raised={true}
          disabled={
            disabled ||
            !canPerform ||
            isBlocked ||
            !isReadyToBeSubmitted ||
            isWaitingForEndorsement
          }
        >
          <span>{verb} As…</span>
          {agentUserRoles.map(role => (
            <MenuItem
              key={getId(role)}
              onClick={this.handleSubmit.bind(
                this,
                role,
                stageInsteadOfComplete
              )}
              disabled={
                disabled ||
                !canPerform ||
                isBlocked ||
                !isReadyToBeSubmitted ||
                isWaitingForEndorsement
              }
            >
              {role.name ? `${role.name} (${role.roleName})` : role.roleName}
            </MenuItem>
          ))}
        </ButtonMenu>
      );
    }

    // Note if the action is waiting for endorsement we don't display a button as we exclusively relies on live / auto saving updates
    return null;
  }

  render() {
    const {
      user,
      action,
      endorseAction,
      graphId,
      graph,
      acl,
      counter,
      blindingData,
      disabled,
      readOnly,
      isBlocked,
      authorizeActions,
      blockingActions,
      canReschedule,
      canComment,
      canCancel,
      canEndorse,
      canViewEndorse,
      canPerform,
      canAssign,
      canAssignEndorseAction,
      stage,
      annotable,
      displayAnnotations,
      openShell
    } = this.props;

    const { dueDateTime, canSubmitNewDueDateTime } = this.state;

    if (!graph || !acl) {
      return null;
    }

    const roleName = action.agent && action.agent.roleName;

    const activeRoles = acl.getActiveRoles(user);

    const adminUserRoles = activeRoles.filter(role =>
      acl.checkPermission(role, 'AdminPermission')
    );

    const actionIconName = getIconNameFromSchema(action);

    const statusIcon = getWorkflowStatusIcon(user, acl, action, stage);

    const isAutoEndorsedAction = checkIsAutoEndorsedAction(
      action,
      endorseAction
    );

    return (
      <header
        className={classNames('annotable-action-head', {
          'annotable-action-head--canceled':
            action.actionStatus === 'CanceledActionStatus',
          'annotable-action-head--active':
            (canPerform && action.actionStatus === 'EndorsedActionStatus') ||
            action.actionStatus === 'ActiveActionStatus',
          'annotable-action-head--completed':
            action.actionStatus === 'CompletedActionStatus',
          'annotable-action-head--failed':
            action.actionStatus === 'FailedActionStatus',
          'annotable-action-head--staged':
            action.actionStatus === 'StagedActionStatus',
          'annotable-action-head--waiting':
            statusIcon === 'time' ||
            (!canPerform && action.actionStatus === 'EndorsedActionStatus')
        })}
      >
        {/* Top banner */}
        <div
          className={classNames('annotable-action-head__banner', {
            'annotable-action-head__banner--canceled':
              action.actionStatus === 'CanceledActionStatus',
            'annotable-action-head__banner--active':
              (canPerform && action.actionStatus === 'EndorsedActionStatus') ||
              action.actionStatus === 'ActiveActionStatus',
            'annotable-action-head__banner--completed':
              action.actionStatus === 'CompletedActionStatus',
            'annotable-action-head__banner--failed':
              action.actionStatus === 'FailedActionStatus',
            'annotable-action-head__banner--staged':
              action.actionStatus === 'StagedActionStatus',
            'annotable-action-head__banner--waiting':
              statusIcon === 'time' ||
              (!canPerform && action.actionStatus === 'EndorsedActionStatus')
          })}
        >
          <h3 className="annotable-action-head__banner-title">
            <Iconoclass
              iconName={actionIconName}
              className="annotable-action-head__banner-icon"
            />
            <Span>
              {action.name || API_LABELS[action['@type']] || 'Untitled action'}
            </Span>

            {/* SUBMIT / STAGE / PAY / ENDORSE button */}
            <span className="annotable-action-head__banner-controls">
              {this.renderButton()}
              <span className="annotable-action-head__banner-status-label">
                {action.actionStatus === 'CanceledActionStatus' && 'Canceled'}
              </span>
              <Iconoclass tagName="span" iconName={statusIcon} />
            </span>
          </h3>
        </div>

        <div className="annotable-action-head__notices">
          <div className="annotable-action-head__notices__bg">
            <StatusNotice
              className="annotable-action-head__notice"
              data-testid="status-notice"
              action={action}
              endorseAction={endorseAction}
            />

            <WaitingNotice
              className="annotable-action-head__notice"
              data-testid="waiting-notice"
              user={user}
              acl={acl}
              action={action}
              stage={stage}
              graph={acl.getScope()}
              blindingData={blindingData}
              canPerform={canPerform}
              endorseAction={endorseAction}
              canEndorse={canEndorse}
              canAssign={canAssign}
              canAssignEndorseAction={canAssignEndorseAction}
            />

            {isBlocked && (
              <BlockingActionsNotice
                className="annotable-action-head__notice"
                data-testid="blocked-notice"
                graph={graph}
                blockingActions={blockingActions}
              />
            )}

            {canComment && !isBlocked && (
              <CommentNotice
                data-testid="comment-notice"
                className="annotable-action-head__notice"
                blindingData={blindingData}
                action={action}
                user={user}
                acl={acl}
                canPerform={canPerform}
                endorseAction={endorseAction}
                canEndorse={canEndorse}
                canViewEndorse={canViewEndorse}
                openShell={openShell}
              />
            )}
          </div>
        </div>
        <div className="selectable-indent">
          {/* Action agent / endorser row */}
          <Annotable
            graphId={graphId}
            counter={counter.increment({
              value: getLocationIdentifier(action['@type'], 'actionStatus'),
              level: 3,
              key: `annotabe-action-head-${getId(action)}-actionStatus`
            })}
            selector={{
              '@type': 'NodeSelector',
              graph: getSelectorGraphParam(action),
              node: getId(action),
              selectedProperty: 'actionStatus'
            }}
            selectable={false}
            annotable={annotable && canComment}
            displayAnnotations={displayAnnotations}
            info={getInfo({
              user,
              acl,
              stage,
              action,
              endorseAction,
              canAssign,
              canAssignEndorseAction,
              isAutoEndorsedAction
            })}
          >
            <div className="annotable-action-head__agent-endorser">
              <div className="annotable-action-head__agent">
                <LiveWorkflowActionUserBadgeMenu
                  data-testid="annotable-action-head-agent"
                  className="annotable-action-head__agent__userbadge"
                  user={user}
                  action={action}
                  graph={acl.getScope() /* needs access to the live graph*/}
                  disabled={disabled}
                  readOnly={readOnly}
                  stage={stage}
                  roleName={roleName}
                  acl={acl}
                  onAction={this.handleAction}
                />
                <Iconoclass iconName="arrowOpenRight" />
                <ActionAudience
                  data-testid="annotable-action-head-audience"
                  user={user}
                  graph={acl.getScope() /* needs access to the live graph*/}
                  audienceProp="participant"
                  action={action}
                  readOnly={true}
                  disabled={true}
                  blindingData={blindingData}
                  authorizeActions={authorizeActions}
                />
              </div>

              {!!endorseAction && !isAutoEndorsedAction && (
                <div className="annotable-action-head__endorser">
                  <span className="annotable-action-head__endorser-label">
                    Endorsement
                  </span>
                  <LiveWorkflowActionUserBadgeMenu
                    data-testid="annotable-action-head-endorser"
                    user={user}
                    action={endorseAction}
                    graph={acl.getScope() /* needs access to the live graph*/}
                    acl={acl}
                    disabled={disabled}
                    readOnly={readOnly}
                    stage={stage}
                    roleName={roleName}
                    onAction={this.handleAction}
                  />
                </div>
              )}
            </div>
          </Annotable>

          {/* Action description */}
          {!!action.description && (
            <Annotable
              graphId={graphId}
              counter={counter.increment({
                value: getLocationIdentifier(action['@type'], 'description'),
                level: 3,
                key: `annotabe-action-head-${getId(action)}-description`
              })}
              selector={{
                '@type': 'NodeSelector',
                graph: getSelectorGraphParam(action),
                node: getId(action),
                selectedProperty: 'description'
              }}
              selectable={false}
              annotable={annotable && canComment}
              displayAnnotations={displayAnnotations}
            >
              {/* wrapper div is needed for the next version of annotable that will force children to be a single element */}
              <div>
                <Iconoclass
                  iconName="info"
                  size="18px"
                  className="annotable-action-head__description-content-icon"
                />
                <Value className="annotable-action-head__description-content">
                  {action.description}
                </Value>
              </div>
            </Annotable>
          )}

          {/* Reschedule / Cancel row */}
          {action.actionStatus !== 'CompletedActionStatus' &&
            action.actionStatus !== 'CanceledActionStatus' &&
            action.actionStatus !== 'EndorsedActionStatus' && (
              <Annotable
                graphId={graphId}
                counter={counter.increment({
                  value: getLocationIdentifier(
                    action['@type'],
                    'expectedDuration'
                  ),
                  level: 3,
                  key: `annotabe-action-head-${getId(action)}-expectedDuration`
                })}
                selector={{
                  '@type': 'NodeSelector',
                  graph: getSelectorGraphParam(action),
                  node: getId(action),
                  selectedProperty: 'expectedDuration'
                }}
                selectable={false}
                annotable={annotable && canComment}
                displayAnnotations={displayAnnotations}
              >
                <div className="annotable-action-head__schedule">
                  <PaperDateInput
                    data-test-now="true"
                    label="Due date"
                    name="date"
                    showCalendar="menu"
                    value={dueDateTime}
                    readOnly={readOnly || !canReschedule}
                    disabled={disabled || !canReschedule}
                    onChange={this.handleDueDateTimeChange}
                    portal={true}
                  />
                  <PaperTimeInput
                    data-test-now="true"
                    label="Due time"
                    name="time"
                    readOnly={readOnly || !canReschedule}
                    disabled={disabled || !canReschedule}
                    onChange={this.handleDueDateTimeChange}
                    value={dueDateTime}
                  >
                    <MenuItem value="09:00">
                      <span style={{ color: 'grey' }}>09:00 AM </span> Morning
                    </MenuItem>
                    <MenuItem value="12:00">
                      <span style={{ color: 'grey' }}>12:00 PM </span> Afternoon
                    </MenuItem>
                    <MenuItem value="18:00">
                      <span style={{ color: 'grey' }}>06:00 PM </span> Evening
                    </MenuItem>
                  </PaperTimeInput>

                  {!readOnly && (canReschedule || canCancel) && (
                    <ControlPanel>
                      {!!canCancel && (
                        <Fragment>
                          {adminUserRoles.length === 1 ? (
                            <PaperButton
                              disabled={disabled}
                              onClick={this.handleCancel.bind(
                                this,
                                adminUserRoles[0]
                              )}
                            >
                              Cancel
                            </PaperButton>
                          ) : (
                            <ButtonMenu disabled={disabled}>
                              <span>Cancel As…</span>
                              {adminUserRoles.map(role => (
                                <MenuItem
                                  key={getId(role)}
                                  disabled={disabled}
                                  onClick={this.handleCancel.bind(this, role)}
                                >
                                  {role.name
                                    ? `${role.name} (${role.roleName})`
                                    : role.roleName}
                                </MenuItem>
                              ))}
                            </ButtonMenu>
                          )}
                        </Fragment>
                      )}

                      {!!canReschedule && (
                        <Fragment>
                          {adminUserRoles.length === 1 ? (
                            <PaperButton
                              disabled={disabled || !canSubmitNewDueDateTime}
                              onClick={this.handleReschedule.bind(
                                this,
                                adminUserRoles[0]
                              )}
                            >
                              Reschedule
                            </PaperButton>
                          ) : (
                            <ButtonMenu
                              disabled={disabled || !canSubmitNewDueDateTime}
                            >
                              <span>Reschedule As…</span>
                              {adminUserRoles.map(role => (
                                <MenuItem
                                  key={getId(role)}
                                  disabled={
                                    disabled || !canSubmitNewDueDateTime
                                  }
                                  onClick={this.handleReschedule.bind(
                                    this,
                                    role
                                  )}
                                >
                                  {role.name
                                    ? `${role.name} (${role.roleName})`
                                    : role.roleName}
                                </MenuItem>
                              ))}
                            </ButtonMenu>
                          )}
                        </Fragment>
                      )}
                    </ControlPanel>
                  )}
                </div>
              </Annotable>
            )}
        </div>
      </header>
    );
  }
}

export default connect(
  null,
  { openShell }
)(AnnotableActionHead);

function getInfo({
  user,
  acl,
  stage,
  action,
  endorseAction,
  canAssign,
  canAssignEndorseAction,
  isAutoEndorsedAction
} = {}) {
  const types = [];

  if (canAssign || canAssignEndorseAction) {
    const workflowActions = getStageActions(stage);

    if (canAssign) {
      const isAssigned = isActionAssigned(action);
      const needAssignment = needActionAssignment(action);

      if (needAssignment && !isAssigned) {
        types.push(ERROR_NEED_ASSIGNMENT);
      }

      const potentialAssigneeRoles = getActionPotentialAssignee(
        action,
        acl.getScope(),
        {
          workflowActions
        }
      );

      if (!isAssigned && !potentialAssigneeRoles.length) {
        types.push(ERROR_NEED_ASSIGNEE);
      }
    }

    // ! special case for PayAction if price is 0 we auto endorse => we shouldn't display any endorse errors as we don't show the endorse UI
    if (canAssignEndorseAction && !isAutoEndorsedAction) {
      const isAssigned = isActionAssigned(endorseAction);
      const needAssignment = needActionAssignment(endorseAction);

      if (needAssignment && !isAssigned) {
        types.push(ERROR_NEED_ENDORSER_ASSIGNMENT);
      }

      const potentialAssigneeRoles = getActionPotentialAssignee(
        endorseAction,
        acl.getScope(),
        {
          workflowActions
        }
      );
      if (!isAssigned && !potentialAssigneeRoles.length) {
        types.push(ERROR_NEED_ENDORSER);
      }
    }
  }

  return types.length === 0 ? undefined : types.length === 1 ? types[0] : types;
}

class BlockingActionsNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string,
    graph: PropTypes.object,
    blockingActions: PropTypes.arrayOf(PropTypes.object)
  };

  render() {
    const { id, className, graph, blockingActions } = this.props;

    const byType = groupBy(blockingActions, action => action['@type']);

    return (
      <div
        id={id}
        className={classNames(
          'annotable-action-head-notice',
          'annotable-action-head-notice--blocking',
          className
        )}
        data-testid={this.props['data-testid']}
      >
        <Iconoclass
          iconName="warningTriangle"
          round={false}
          size="18px"
          className="annotable-action-head-notice__icon"
        />
        <div className={'annotable-action-head-notice__content'}>
          Blocked by {blockingActions.length}{' '}
          {pluralize('action', blockingActions.length)} (
          <ul className="annotable-action-head-notice__action-counts-list">
            {Object.keys(byType).map(type => (
              <li
                key={type}
                className="annotable-action-head-notice__action-counts-list__item"
              >
                <Hyperlink
                  page="publisher"
                  graph={graph}
                  action={byType[type][0]}
                >
                  {API_LABELS[type] || type}
                </Hyperlink>

                {byType[type].length > 1 && (
                  <Iconoclass
                    className="annotable-action-head-notice__action-counts-list__item-icon"
                    iconName={byType[type].length.toString()}
                    size="16px"
                    round={true}
                  />
                )}
              </li>
            ))}
          </ul>
          )
        </div>
      </div>
    );
  }
}

class WaitingNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string,
    user: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,
    action: PropTypes.object.isRequired,
    stage: PropTypes.object.isRequired,
    graph: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,
    endorseAction: PropTypes.object,
    canPerform: PropTypes.bool,
    canEndorse: PropTypes.bool,
    canAssign: PropTypes.bool,
    canAssignEndorseAction: PropTypes.bool
  };

  render() {
    const {
      id,
      className,
      action,
      acl,
      user,
      stage,
      graph,
      endorseAction,
      canPerform,
      canAssign,
      canAssignEndorseAction,
      canEndorse,
      blindingData
    } = this.props;

    const workflowActions = getStageActions(stage);

    const potentialAssigneeRoles = getActionPotentialAssignee(action, graph, {
      workflowActions
    });

    const isAssigned = isActionAssigned(action);
    const needAssignment = needActionAssignment(action);

    const isAutoEndorsedAction = checkIsAutoEndorsedAction(
      action,
      endorseAction
    );

    let endorseActionPotentialAssigneeRoles,
      endorseActionIsAssigned,
      endorseActionNeedAssignment;
    if (endorseAction) {
      endorseActionPotentialAssigneeRoles = getActionPotentialAssignee(
        endorseAction,
        graph,
        {
          workflowActions
        }
      );
      endorseActionIsAssigned = isActionAssigned(endorseAction);
      endorseActionNeedAssignment = needActionAssignment(endorseAction);
    }

    const isWaitingAuthorUpload =
      canPerform &&
      action['@type'] === 'TypesettingAction' &&
      (action.actionStatus === 'ActiveActionStatus' ||
        action.actionStatus === 'StagedActionStatus') &&
      arrayify(action.comment).some(comment => {
        const encoding = getObject(action);
        const sha = getChecksumValue(encoding, 'sha256');
        return (
          encoding &&
          sha &&
          comment['@type'] === 'RevisionRequestComment' &&
          comment.ifMatch === sha
        );
      });

    // early return if action is completed, canceled or user can assign either the agent or the endorser and is not waiting for author upload
    if (
      action.actionStatus === 'CompletedActionStatus' ||
      action.actionStatus === 'CanceledActionStatus' ||
      (canAssign && needAssignment && !isAssigned) ||
      (canAssign && !isAssigned && !potentialAssigneeRoles.length) ||
      (!isAutoEndorsedAction &&
        !isWaitingAuthorUpload &&
        endorseAction &&
        canAssignEndorseAction &&
        endorseActionNeedAssignment &&
        !endorseActionIsAssigned) ||
      (!isAutoEndorsedAction &&
        !isWaitingAuthorUpload &&
        endorseAction &&
        canAssignEndorseAction &&
        !endorseActionIsAssigned &&
        !endorseActionPotentialAssigneeRoles.length)
    ) {
      return null;
    }

    // We gather a list of items so that we can generate a list starting with "waiting for:" <items>
    const items = [];

    // Wait for author upload
    if (isWaitingAuthorUpload) {
      items.push('author revision upload');
    }

    // Wait for assignment or invite acceptance
    if (!canAssign && needAssignment && !isAssigned) {
      const {
        agent: { name, roleName }
      } = action;

      const isInvitedForAction = acl
        .getPendingInviteActions()
        .some(
          inviteAction =>
            getId(action) && getId(inviteAction.purpose) === getId(action)
        );

      items.push(
        `${capitalize(roleName)} ${name ? `(${name}) ` : ''} ${
          isInvitedForAction ? 'acceptance' : 'assigment'
        }`
      );
    }

    // Wait for completion (endorsement case)
    if (
      action.actionStatus !== 'CompletedActionStatus' &&
      action.actionStatus !== 'StagedActionStatus' &&
      endorseAction &&
      !canPerform
    ) {
      const {
        agent: { name, roleName }
      } = action;

      const displayName = getId(action.agent)
        ? getDisplayName(blindingData, action.agent, {
            addRoleNameSuffix: true
          })
        : `${capitalize(roleName)} ${name ? `(${name}) ` : ''}`;

      items.push(`${displayName} completion`);
    }

    if (
      !isAutoEndorsedAction &&
      !!endorseAction &&
      !canEndorse &&
      endorseAction.actionStatus !== 'CompletedActionStatus' &&
      action.actionStatus !== 'CompletedActionStatus' &&
      action.actionStatus !== 'ActiveActionStatus' &&
      action.actionStatus !== 'PotentialActionStatus'
    ) {
      const {
        agent: { name, roleName }
      } = endorseAction;

      const displayName = getId(endorseAction.agent)
        ? getDisplayName(blindingData, endorseAction.agent, {
            addRoleNameSuffix: true
          })
        : `${capitalize(roleName)} ${name ? `(${name}) ` : ''}`;

      items.push(`${displayName} endorsement`);
    }

    // Wait for completion (no endorsement case)
    if (
      action.actionStatus !== 'CompletedActionStatus' &&
      !endorseAction &&
      !canPerform
    ) {
      const {
        agent: { name, roleName }
      } = action;

      const displayName = getId(action.agent)
        ? getDisplayName(blindingData, action.agent, {
            addRoleNameSuffix: true
          })
        : `${capitalize(roleName)} ${name ? `(${name}) ` : ''}`;

      items.push(`${displayName} completion`);
    }

    if (!items.length) {
      return null;
    }

    return (
      <div
        id={id}
        className={classNames(
          'annotable-action-head-notice',
          'annotable-action-head-notice--waiting',
          className
        )}
        data-testid={this.props['data-testid']}
      >
        <Iconoclass
          iconName="time"
          round={false}
          size="18px"
          className="annotable-action-head-notice__icon"
        />
        <div className={'annotable-action-head-notice__content'}>
          {items.length === 1 ? (
            `Waiting for ${items[0]}`
          ) : (
            <Fragment>
              <h5 className="annotable-action-head-notice__title">
                Waiting For The Following Actions
              </h5>

              <ol className="annotable-action-head-notice__list">
                {items.map(item => (
                  <li
                    key={item}
                    className="annotable-action-head-notice__list-item"
                  >
                    {item}
                  </li>
                ))}
              </ol>
            </Fragment>
          )}
        </div>
      </div>
    );
  }
}

class CommentNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string,
    blindingData: PropTypes.object.isRequired,
    action: PropTypes.object.isRequired,
    canPerform: PropTypes.bool,
    endorseAction: PropTypes.object,
    canEndorse: PropTypes.bool,
    canViewEndorse: PropTypes.bool,
    acl: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
    openShell: PropTypes.func.isRequired
  };

  handleOpenShell = e => {
    const { openShell, action } = this.props;
    const [stageIndex, actionIndex] = action.identifier.split('.');
    openShell('comments', getId(action), {
      params: { search: `?stage=${stageIndex}&action=${actionIndex}` }
    });
  };

  render() {
    const {
      id,
      className,
      endorseAction,
      blindingData,
      action,
      canPerform,
      canEndorse,
      canViewEndorse,
      user,
      acl
    } = this.props;

    const isAutoEndorsedAction = checkIsAutoEndorsedAction(
      action,
      endorseAction
    );

    let txt;
    if (
      // the user can endorse the action
      (canEndorse || canViewEndorse) &&
      endorseAction &&
      endorseAction.actionStatus !== 'CompletedActionStatus' &&
      !isAutoEndorsedAction
    ) {
      if (canEndorse) {
        txt = `You can add comments to engage with the ${action.agent.name ||
          action.agent.roleName} before endorsing the action`;
      } else {
        txt = `You can add comments to engage with the ${action.agent.name ||
          action.agent.roleName} before the action is endorsed${
          getId(endorseAction.agent)
            ? ` by ${getDisplayName(blindingData, endorseAction.agent, {
                addRoleNameSuffix: true
              })}`
            : ''
        }`;
      }
    } else if (
      // The user is waiting for endorsement, he / she can keep adding comments / respond
      endorseAction &&
      endorseAction.actionStatus !== 'CompletedActionStatus' &&
      canPerform &&
      action.actionStatus === 'StagedActionStatus' &&
      !(canEndorse || canViewEndorse) &&
      !isAutoEndorsedAction
    ) {
      txt = `You can add comments to engage with the endorser (${endorseAction
        .agent.name || endorseAction.agent.roleName})`;
    } else {
      const roleNameData = acl.getRoleNameData(user, {
        ignoreEndDateOnPublicationOrRejection: true
      });
      const audiences = getActiveAudiences(action.participant);
      const isPartOfAudiences = audiences.some(audience =>
        roleNameData.has(audience.audienceType)
      );
      let subject;
      if (audiences.length) {
        if (audiences.length > 1) {
          subject = audiences
            .slice(0, audiences.length - 1)
            .map(audience => pluralizeAudienceType(audience.audienceType))
            .join(', ');

          subject = `${subject} and ${pluralizeAudienceType(
            audiences[audiences.length - 1].audienceType
          )}`;

          if (!isPartOfAudiences) {
            subject = `You, ${subject}`;
          } else {
            subject = capitalize(subject);
          }
        } else {
          subject = pluralizeAudienceType(audiences[0].audienceType);
          if (!isPartOfAudiences) {
            subject = `You and ${subject}`;
          } else {
            subject = capitalize(subject);
          }
        }
      } else {
        subject = 'You';
      }

      txt = `${subject} can participate in the staging discussion`;
    }

    return (
      <div
        id={id}
        className={classNames(
          'annotable-action-head-notice',
          'annotable-action-head-notice--comment',
          className
        )}
        data-testid={this.props['data-testid']}
      >
        <Iconoclass
          iconName="feedback"
          round={false}
          size="18px"
          className="annotable-action-head-notice__icon"
        />
        <div className={'annotable-action-head-notice__content'}>{txt}</div>
        {/*<PaperButton onClick={this.handleOpenShell}>Add comments</PaperButton>*/}
      </div>
    );
  }
}

class StatusNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string,
    action: PropTypes.object.isRequired,
    endorseAction: PropTypes.object
  };

  render() {
    const { id, className, action, endorseAction } = this.props;

    const isAutoEndorsedAction = checkIsAutoEndorsedAction(
      action,
      endorseAction
    );

    let txt;
    if (action.actionStatus === 'CompletedActionStatus') {
      txt = `Completed${
        endorseAction &&
        endorseAction.actionStatus === 'CompletedActionStatus' &&
        getId(endorseAction.agent) !== 'bot:scipe' &&
        !isAutoEndorsedAction
          ? ` after ${endorseAction.agent.name ||
              endorseAction.agent.roleName} endorsement`
          : ''
      } on ${getCompletedDate(action)}`;
    } else if (action.actionStatus === 'CanceledActionStatus') {
      txt = `Canceled on ${getCompletedDate(action)}`;
    } else if (action.actionStatus === 'StagedActionStatus') {
      if (endorseAction && !isAutoEndorsedAction) {
        txt = `Submitted for endorsement on ${getStagedDate(action)}`;
      } else {
        txt = `Staged on ${getStagedDate(action)}`;
      }
    } else if (action.actionStatus === 'EndorsedActionStatus') {
      txt = `${
        action['@type'] === 'PayAction' ? 'Approved' : 'Endorsed'
      } on ${getEndorsedDate(action)}`;
    }

    if (!txt) {
      return null;
    }

    return (
      <div
        id={id}
        className={classNames(
          'annotable-action-head-notice',
          'annotable-action-head-notice--status',
          className
        )}
        data-testid={this.props['data-testid']}
      >
        <Iconoclass
          iconName="info"
          round={false}
          size="18px"
          className="annotable-action-head-notice__icon"
        />
        <div className={'annotable-action-head-notice__content'}>{txt}</div>
      </div>
    );
  }
}
