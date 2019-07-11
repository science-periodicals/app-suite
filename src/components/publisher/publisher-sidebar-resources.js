import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import querystring from 'querystring';
import { Link } from 'react-router-dom';
import {
  getIconNameFromSchema,
  getDisplayName,
  API_LABELS,
  ActionIdentifier,
  Version
} from '@scipe/ui';
import { getId, arrayify, unprefix } from '@scipe/jsonld';
import {
  getStageActions,
  getStageId,
  getObjectId,
  getVersion,
  getScopeId
} from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import {
  createActionMapSelector,
  createCommentMapSelector,
  createGraphAclSelector,
  createGraphDataSelector
} from '../../selectors/graph-selectors';
import { StyleSection, StyleList, StyleListRow } from './publisher-sidebar';
import {
  getWorkflowAction,
  getSortedStages,
  getInstance
} from '../../utils/workflow';
import ScrollLink from '../scroll-link';
import ShellLink from '../shell/shell-link';
import { getDisplayVersion } from '../../utils/graph-utils';
import { getSelectorGraphParam } from '../../utils/annotations';

class PublisherSidebarResources extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,

    graphId: PropTypes.string.isRequired,
    journalId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    actionId: PropTypes.string,

    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,

    history: PropTypes.object.isRequired,
    search: PropTypes.string.isRequired,

    //redux
    graph: PropTypes.object,
    action: PropTypes.object,
    actionHasStagingDiscussion: PropTypes.bool,
    acl: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,
    filesProviderAction: PropTypes.object,
    instruments: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  handleScrollTop = e => {
    window.scroll({
      top: 0,
      behavior: 'smooth'
    });
  };

  render() {
    const {
      graphId,
      journalId,
      search,
      action,
      actionHasStagingDiscussion,
      graph,
      instruments,
      filesProviderAction,
      acl,
      user,
      blindingData
    } = this.props;

    const pathname = `/${unprefix(journalId)}/${unprefix(
      getScopeId(graphId)
    )}/submission`;

    const reviewAttachmentLinkType =
      action['@type'] === 'AssessAction' ||
      action['@type'] === 'CreateReleaseAction'
        ? 'shell'
        : 'transition';

    const canView = acl.checkPermission(user, 'ViewActionPermission', {
      action
    });

    const query = querystring.parse(search.substring(1));
    let displayedVersion, versionType;
    if (filesProviderAction) {
      const currentVersion = getVersion(
        getSelectorGraphParam(filesProviderAction)
      );
      if (query.version && currentVersion !== query.version) {
        displayedVersion = query.version;
        versionType = 'prev';
      } else {
        displayedVersion = currentVersion;
        versionType = 'version';
      }
    }

    return (
      <StyleSection className="publisher-sidebar-resources">
        <StyleList>
          {(action ||
            (filesProviderAction && graph && getId(graph.mainEntity)) ||
            instruments) && (
            <li className="publisher-sidebar-resources__divider">
              <span>Outbound</span>
              <Iconoclass
                iconName="outbound"
                className="publisher-sidebar-resources__divider__icon"
                size="18px"
              />
            </li>
          )}

          {!!action && (
            <StyleListRow>
              <span className="publisher-sidebar-resources__name">
                <Iconoclass
                  iconName={getIconNameFromSchema(action)}
                  className="publisher-sidebar-resources__icon"
                />
                <Link
                  onClick={this.handleScrollTop}
                  to={{
                    pathname,
                    search
                  }}
                >
                  {API_LABELS[action['@type']]} action
                </Link>
              </span>
              <span className="sa__default-ui-type--light">
                <ActionIdentifier>
                  {actionHasStagingDiscussion ? (
                    <ShellLink
                      type="comments"
                      nodeId={getId(action)}
                      iconName="comment"
                    >
                      {action.identifier}
                    </ShellLink>
                  ) : (
                    action.identifier
                  )}
                </ActionIdentifier>
              </span>
            </StyleListRow>
          )}

          {!!(
            canView &&
            filesProviderAction &&
            (getId(filesProviderAction) === getId(action) ||
              filesProviderAction.actionStatus === 'CompletedActionStatus') &&
            graph &&
            getId(graph.mainEntity)
          ) && (
            <StyleListRow>
              <span className="publisher-sidebar-resources__name">
                <Iconoclass
                  iconName="attachment"
                  className="publisher-sidebar-resources__icon"
                />
                <ScrollLink
                  to={{
                    pathname,
                    search,
                    hash: `#${filesProviderAction.identifier}`,
                    params: { reviewAttachmentLinkType }
                  }}
                >
                  Files
                </ScrollLink>
              </span>
              <span className="sa__default-ui-type--light">
                <Version type={versionType} badge={true}>
                  {getDisplayVersion(displayedVersion, { semverLight: true })}
                </Version>
              </span>
            </StyleListRow>
          )}

          {!!(canView && instruments && instruments.length) && (
            <Fragment>
              <div className="publisher-sidebar-resources__divider">
                <span>Inbound</span>
                <Iconoclass
                  iconName="inbound"
                  className="publisher-sidebar-resources__divider__icon"
                  size="18px"
                />
              </div>

              <div>
                {instruments.map(instrument => (
                  <StyleListRow key={getId(instrument)}>
                    <span className="publisher-sidebar-resources__name">
                      <Iconoclass
                        iconName="email"
                        className="publisher-sidebar-resources__icon"
                      />
                      <ScrollLink
                        to={{
                          pathname,
                          search,
                          hash:
                            instrument['@type'] === 'DocumentObject'
                              ? '#document-to-typeset'
                              : instrument['@type'] === 'CreateReleaseAction'
                              ? `#${instrument.identifier}-inbound`
                              : `#${instrument.identifier}`
                        }}
                      >
                        {getName(instrument, blindingData)}
                      </ScrollLink>
                    </span>
                    {instrument['@type'] !== 'DocumentObject' && (
                      <span className="sa__default-ui-type--light">
                        <ActionIdentifier>
                          <ShellLink
                            hash={`#${instrument.identifier}`}
                            type="attachment"
                            nodeId={getId(instrument)}
                          >
                            {instrument.identifier}
                          </ShellLink>
                        </ActionIdentifier>
                      </span>
                    )}
                  </StyleListRow>
                ))}
              </div>
            </Fragment>
          )}
        </StyleList>
      </StyleSection>
    );
  }
}

export default connect(state =>
  createSelector(
    state => state.user,
    createGraphAclSelector(),
    createGraphDataSelector(),
    (state, props) => props.actionId,
    createActionMapSelector(),
    createCommentMapSelector(),
    (user, acl, graphData, actionId, actionMap, commentMap) => {
      const action = getWorkflowAction(actionId, { user, acl, actionMap });

      const canPerform = acl.checkPermission(user, 'PerformActionPermission', {
        action
      });

      const canView = acl.checkPermission(user, 'ViewActionPermission', {
        action
      });

      // TODO make an util
      const canComment =
        action.actionStatus === 'StagedActionStatus' && (canPerform || canView); // Note canEndorse and canViewEndorse is already covered by canView (adding them would create false positive when the action is in ActiveActionStatus

      const actionHasStagingDiscussion =
        canComment ||
        Object.values(commentMap).some(
          commentAction => getObjectId(commentAction) === getId(action)
        );

      let filesProviderAction;
      const instruments = [];
      if (action && action.actionStatus !== 'CanceledActionStatus') {
        // We find the latest create release action (if the current stage doesn't have a CreateReleaseAction, we find the one before that)
        const stages = getSortedStages(actionMap);
        const stageIndex = stages.findIndex(
          stage => getId(stage) === getStageId(action)
        );

        for (let i = stageIndex; i < stages.length; i++) {
          const actions = getStageActions(stages[i]);
          filesProviderAction = actions.find(
            action => action['@type'] === 'CreateReleaseAction'
          );

          if (filesProviderAction) {
            filesProviderAction = getInstance(filesProviderAction, {
              actionMap,
              user,
              acl
            });
            break;
          }
        }

        switch (action['@type']) {
          case 'PublishAction':
            filesProviderAction = action;
            break;

          case 'CreateReleaseAction':
            // Need the previous assessment and the associate reviews
            if (getId(action.instrument)) {
              const assessAction = getWorkflowAction(getId(action.instrument), {
                user,
                acl,
                actionMap
              });

              if (
                assessAction &&
                assessAction.actionStatus === 'CompletedActionStatus'
              ) {
                instruments.push(assessAction);
              }
              if (assessAction.instrument) {
                arrayify(assessAction.instrument).forEach(instrument => {
                  const action = getWorkflowAction(getId(instrument), {
                    user,
                    acl,
                    actionMap
                  });
                  if (
                    action['@type'] === 'ReviewAction' &&
                    action.actionStatus === 'CompletedActionStatus'
                  ) {
                    instruments.push(action);
                  }
                });
              }
            }

            break;

          case 'ReviewAction':
            // Need the assessment that lead to the review action and the author notes
            arrayify(action.instrument).forEach(instrument => {
              const action = getWorkflowAction(getId(instrument), {
                user,
                acl,
                actionMap
              });
              if (
                (action['@type'] === 'AssessAction' ||
                  action['@type'] === 'CreateReleaseAction') &&
                action.actionStatus === 'CompletedActionStatus'
              ) {
                instruments.push(action);
              }
            });
            break;

          case 'AssessAction':
            if (action.instrument) {
              arrayify(action.instrument).forEach(instrument => {
                const action = getWorkflowAction(getId(instrument), {
                  user,
                  acl,
                  actionMap
                });
                if (
                  (action['@type'] === 'ReviewAction' ||
                    action['@type'] === 'CreateReleaseAction') &&
                  action.actionStatus === 'CompletedActionStatus'
                ) {
                  instruments.push(action);
                }
              });
            }
            break;

          case 'TypesettingAction':
            // special case: the inbound attachment is the document to typeset
            filesProviderAction = action;
            if (
              action.object &&
              acl.checkPermission(user, 'ViewActionPermission', { action })
            ) {
              instruments.push(action.object);
            }
            break;

          default:
            break;
        }
      }

      const blindingData = acl.getBlindingData(user, {
        ignoreEndDateOnPublicationOrRejection: true
      });

      return {
        acl,
        blindingData,
        action,
        actionHasStagingDiscussion,
        instruments,
        filesProviderAction,
        graph: graphData.graph
      };
    }
  )
)(PublisherSidebarResources);

function getName(instrument, blindingData) {
  switch (instrument['@type']) {
    case 'DocumentObject':
      return 'Document to typeset';
    case 'CreateReleaseAction':
      return 'Author notes';
    case 'AssessAction':
      return 'Assessment';
    case 'ReviewAction':
      return `${getDisplayName(blindingData, instrument.agent, {
        addRoleNameSuffix: false
      })} Review`;
  }
}
