import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import noop from 'lodash/noop';
import { unprefix, getId, arrayify, textify, embed } from '@scipe/jsonld';
import {
  getScopeId,
  getActiveRoles,
  getObjectId,
  getRootPartId,
  getAgentId
} from '@scipe/librarian';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import Iconoclass from '@scipe/iconoclass';
import moment from 'moment';
import {
  API_LABELS,
  Value,
  ExpansionPanel,
  ExpansionPanelPreview,
  Chordal,
  Span,
  Div,
  Card,
  schemaToChordal,
  DateFromNow,
  Tags,
  Tooltip,
  JournalBadge,
  Menu,
  MenuItem,
  Hyperlink,
  GraphOverview,
  BemTags,
  Timeline,
  PeerReviewBadge,
  getResourceInfo
} from '@scipe/ui';
import { setEmailComposerData } from '../../actions/email-action-creators';
import {
  postWorkflowAction,
  deleteWorkflowAction
} from '../../actions/workflow-action-creators';
import {
  highlightWorkflowAction,
  openWorkflowAction
} from '../../actions/ui-action-creators';
import {
  createPeriodicalSelector,
  createWorkflowSelector,
  createActionMapSelector,
  createGraphDataSelector,
  createGraphAclSelector
} from '../../selectors/graph-selectors';
import GraphContributors from '../graph-contributors';
import config from '../../utils/config';
import { compareAbstracts, compareDefinedNames } from '../../utils/sort';
import ActionTabs from '../action-tabs';
import { getMostRecentCompletedCreateReleaseAction } from '../../utils/workflow';

class ProjectCard extends PureComponent {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    isNew: PropTypes.bool,
    isDeleted: PropTypes.bool,
    user: PropTypes.object,
    userGraphRoles: PropTypes.array,
    journal: PropTypes.object,
    graphId: PropTypes.string.isRequired,
    roleNames: PropTypes.object,
    graphData: PropTypes.shape({
      graph: PropTypes.object,
      nodeMap: PropTypes.object
    }),
    actionMap: PropTypes.object,
    acl: PropTypes.object,
    workflowSpecification: PropTypes.object,
    mainEntity: PropTypes.object,
    chordalData: PropTypes.array,
    canTag: PropTypes.bool,
    isGraphDeletable: PropTypes.bool,
    resourceInfo: PropTypes.shape({
      resourceIds: PropTypes.arrayOf(PropTypes.string),
      topLevel: PropTypes.arrayOf(PropTypes.Array)
    }),
    tagActions: PropTypes.arrayOf(
      PropTypes.shape({
        '@id': PropTypes.string,
        participant: PropTypes.arrayOf(PropTypes.object),
        result: PropTypes.shape({
          name: PropTypes.string
        })
      })
    ),
    highlightedResource: PropTypes.string,
    onHighlightResource: PropTypes.func,
    resourceCounts: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        value: PropTypes.number
      })
    ),
    funderTree: PropTypes.array,
    onAddTag: PropTypes.func.isRequired,
    onDeleteTag: PropTypes.func.isRequired,
    onDeleteGraph: PropTypes.func.isRequired,

    postWorkflowAction: PropTypes.func.isRequired,
    deleteWorkflowAction: PropTypes.func.isRequired,
    highlightWorkflowAction: PropTypes.func.isRequired,
    openWorkflowAction: PropTypes.func.isRequired,
    setEmailComposerData: PropTypes.func.isRequired,
    highlightedWorkflowActions: PropTypes.array,
    openedWorkflowActions: PropTypes.array
  };

  static defaultProps = {
    graphData: {
      graph: {},
      nodeMap: {}
    },
    resourceInfo: {
      resourceIds: [],
      resourceTree: []
    },
    onHighlightResource: noop,
    resourceCounts: [],
    roleNames: {}
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

  handleToggleActions() {
    this.setState({ actionsExpanded: !this.state.actionsExpanded });
  }

  handleHighlightResource = resourceId => {
    this.setState({ highlightedResource: resourceId });
  };

  handleClickDeleteGraph = e => {
    e.preventDefault;
    const { graphId, onDeleteGraph } = this.props;
    onDeleteGraph(graphId);
  };

  handleAddTag = (tagName, audienceTypes, role) => {
    const { graphId, onAddTag } = this.props;
    onAddTag(graphId, tagName, audienceTypes, role);
  };

  handleDeleteTag = (tagActionId, tag) => {
    const { graphId, onDeleteTag } = this.props;
    onDeleteTag(graphId, tagActionId, tag);
  };

  renderResourceLink = (graph = {}, node = {}) => {
    const { journal } = this.props;
    const name = node.name || node.alternateName || node['@id'];

    return (
      <Link
        to={{
          pathname: `/${unprefix(getId(journal))}/${
            unprefix(getId(graph)).split('?')[0]
          }/submission`,
          hash: `#${getId(node)}`
        }}
      >
        <Span>{name}</Span>
      </Link>
    );
  };

  renderTitle() {
    const { graphId, journal } = this.props;

    return (
      <Link
        to={{
          pathname: `/${unprefix(getId(journal))}/${
            unprefix(graphId).split('?')[0]
          }/submission`
        }}
      >
        <Value tagName="span">{unprefix(getScopeId(graphId))}</Value>
      </Link>
    );
  }

  renderSubtitle(bem) {
    const { mainEntity } = this.props;

    if (mainEntity && mainEntity.name) {
      // For the dashboard we use the subtitle to display the manuscript title
      // (as the title is used to display the project name)
      return (
        <Div className={bem`__project-subtitle`}>
          {mainEntity && mainEntity.name}
        </Div>
      );
    }

    return null;
  }

  renderFooter(bem) {
    const {
      graphData: {
        graph: {
          dateCreated,
          datePublished,
          dateModified,
          dateRejected,
          dateSubmitted
        } = {}
      } = {},
      journal
    } = this.props;

    const isModified =
      dateModified &&
      new Date(dateModified).getTime() >
        new Date(
          datePublished || dateSubmitted || dateCreated || dateRejected
        ).getTime() +
          2 * 1000;

    return (
      <div className={bem`__publication-info__`}>
        <div className={bem`__group --journal-info`}>
          {journal ? (
            <Fragment>
              <JournalBadge journal={journal} />
              <Hyperlink
                page="journal"
                periodical={journal}
                href={journal.url}
                className={bem`__datum --journal-name`}
                title={textify(journal.name)}
              >
                <Span>
                  {journal.alternateName ||
                    journal.name ||
                    unprefix(journal['@id'])}
                </Span>
              </Hyperlink>
            </Fragment>
          ) : null}
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

          {dateCreated || dateSubmitted ? (
            <span className={bem`__datum`}>
              {dateSubmitted ? (
                <Fragment>
                  Submitted <DateFromNow>{dateSubmitted}</DateFromNow>
                </Fragment>
              ) : (
                <Fragment>
                  Started <DateFromNow>{dateCreated}</DateFromNow>
                </Fragment>
              )}
            </span>
          ) : null}
          {!datePublished && !dateRejected && isModified ? (
            <span className={bem`__datum`}>
              Last modified <DateFromNow>{dateModified}</DateFromNow>
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  renderAbstract(bem, key, name, text, defaultExpanded) {
    // TODO use <RdfaAbstractText /> instead of Value ?
    return (
      <section className={bem`abstract`} key={key}>
        <ExpansionPanel defaultExpanded={!!defaultExpanded}>
          <ExpansionPanelPreview className={bem`abstract-preview`}>
            <span className={bem`section-label`}>
              {textify(name) || 'Abstract'}
            </span>
            <Value tagName="div" className={bem`abstract-preview-text`}>
              {textify(text)}
            </Value>
          </ExpansionPanelPreview>
          <Value tagName="div" className={bem`abstract-text`}>
            {text}
          </Value>
        </ExpansionPanel>
      </section>
    );
  }

  render() {
    const {
      disabled,
      user,
      userGraphRoles,
      graphId,
      actionMap = {},
      graphData: { graph = {}, nodeMap = {} } = {},
      resourceInfo,
      acl,
      workflowSpecification,
      roleNames,
      mainEntity,
      chordalData,
      journal,
      highlightWorkflowAction,
      highlightedWorkflowActions,
      openedWorkflowActions,
      tagActions,
      canTag,
      isGraphDeletable,
      resourceCounts,
      isNew,
      isDeleted,
      postWorkflowAction,
      deleteWorkflowAction,
      openWorkflowAction,
      setEmailComposerData
    } = this.props;
    const { highlightedResource } = this.state;

    const isAuthor = 'author' in roleNames;
    const isReviewer = 'reviewer' in roleNames;
    const isEditor = 'editor' in roleNames;
    const isProducer = 'producer' in roleNames;

    const publicationType = arrayify(graph.additionalType)[0] || {};

    const bem = BemTags();

    const createReleaseAction = getMostRecentCompletedCreateReleaseAction(
      actionMap
    );

    return (
      <Card
        tagName="article"
        className={bem`project-card ${graph.dateRejected ? '--rejected' : ''}`}
        bevel={true}
        active={!isDeleted}
        noticeColor={isDeleted ? '#ffab91' : isNew ? '#d3e3f0' : 'transparent'}
      >
        <header className={bem`header`}>
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

          <div className={bem`metadata__`}>
            <h3 className={bem`__project-title`}>{this.renderTitle()}</h3>

            {this.renderSubtitle(bem)}

            <GraphContributors
              graph={graph}
              fromJournalSubdomain={false}
              roleNames={roleNames}
              blindingData={acl.getBlindingData(user, {
                ignoreEndDateOnPublicationOrRejection: true
              })}
              fromMainEntity={false}
            />
          </div>

          <div className={bem`header-icons`}>
            {isAuthor && (
              <Tooltip tagName="div" displayText="Author">
                <Iconoclass
                  iconName="roleAuthor"
                  style={{ margin: '0 4px' }}
                  round={false}
                  iconSize={24}
                />
              </Tooltip>
            )}
            {isReviewer && (
              <Tooltip tagName="div" displayText="Reviewer">
                <Iconoclass
                  iconName="roleReviewer"
                  style={{ margin: '0 4px' }}
                  round={false}
                  iconSize={24}
                />
              </Tooltip>
            )}
            {isEditor && (
              <Tooltip tagName="div" displayText="Editor">
                <Iconoclass
                  iconName="roleEditor"
                  style={{ margin: '0 4px' }}
                  round={false}
                  iconSize={24}
                />
              </Tooltip>
            )}
            {isProducer && (
              <Tooltip tagName="div" displayText="Producer">
                <Iconoclass
                  iconName="roleProducer"
                  style={{ margin: '0 4px' }}
                  round={false}
                  iconSize={24}
                />
              </Tooltip>
            )}
          </div>

          <div className={bem`menu`}>
            <Menu align="right">
              <MenuItem
                to={{
                  pathname: `/${unprefix(getId(journal))}/${
                    unprefix(graphId).split('?')[0]
                  }/submission`
                }}
                icon={{ iconName: 'view', color: '#9E9E9E' }}
              >
                <span>View</span>
              </MenuItem>
              {isGraphDeletable && (
                <MenuItem
                  divider={true}
                  disabled={disabled}
                  onClick={this.handleClickDeleteGraph}
                  icon={{ iconName: 'trash', color: '#9E9E9E' }}
                >
                  <span>Delete</span>
                </MenuItem>
              )}
            </Menu>
          </div>
        </header>

        {/* the various Expansion panels */}

        {/* The actions */}
        <section>
          <div className={bem`__timeline-container`}>
            <Timeline
              graph={graph}
              displayEndorseActions={true}
              actions={Object.values(actionMap)}
              alwaysShowText={true}
              onHover={highlightWorkflowAction}
              onHoverOut={highlightWorkflowAction}
              hoveredActionIds={highlightedWorkflowActions}
              clickedActionIds={openedWorkflowActions}
            />
          </div>
          <div>
            <ExpansionPanel defaultExpanded={false} hasNestedCollapse={true}>
              <ExpansionPanelPreview>
                <span className={bem`__section-label`}>Workflow</span>
                <span className={bem`__section-summary`}>
                  <span>
                    <Span>{publicationType.name}</Span>
                    {!!(
                      workflowSpecification && workflowSpecification.name
                    ) && (
                      <span>
                        {' '}
                        (<Span>{workflowSpecification.name}</Span>)
                      </span>
                    )}
                  </span>
                </span>
                {!!workflowSpecification && (
                  <PeerReviewBadge
                    workflowSpecification={workflowSpecification}
                  />
                )}
              </ExpansionPanelPreview>

              <ActionTabs
                user={user}
                periodical={journal}
                acl={acl}
                graph={graph}
                workflowSpecification={workflowSpecification}
                actionMap={actionMap}
                disabled={disabled}
                postWorkflowAction={postWorkflowAction}
                deleteWorkflowAction={deleteWorkflowAction}
                highlightWorkflowAction={highlightWorkflowAction}
                openWorkflowAction={openWorkflowAction}
                setEmailComposerData={setEmailComposerData}
              />
            </ExpansionPanel>
          </div>
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

        {/* ReleaseNotes  */}
        {createReleaseAction
          ? this.renderAbstract(
              bem,
              'ReleaseNotes',
              'Release Notes',
              createReleaseAction.releaseNotes
            )
          : null}

        {/* Description  */}
        {graph.description
          ? this.renderAbstract(
              bem,
              'description',
              'Description',
              graph.description
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
                  abstract.text
                )
              )
          : null}

        {/* The tags and journal badge */}

        <section className={bem`tags`}>
          <Tags
            tagActions={tagActions}
            user={user}
            roles={userGraphRoles}
            acl={acl}
            disabled={disabled || !canTag}
            readOnly={!canTag}
            onAddTag={this.handleAddTag}
            onDeleteTag={this.handleDeleteTag}
          />
        </section>

        <section className={bem`__footer`}>{this.renderFooter(bem)}</section>
      </Card>
    );
  }
}

function makeSelector() {
  return createSelector(
    state => state.user,
    createPeriodicalSelector(),
    createWorkflowSelector(),
    createActionMapSelector(),
    createGraphDataSelector(),
    createGraphAclSelector(),
    (state, props) => {
      return state.highlightedWorkflowAction[props.graphId];
    },
    (state, props) => {
      return state.openedWorkflowAction[props.graphId];
    },
    (
      user,
      journal,
      workflowSpecification,
      actionMap = {},
      graphData = {},
      graphAcl,
      highlightedWorkflowActions,
      openedWorkflowActions
    ) => {
      const { graph = {}, nodeMap = {} } = graphData;
      const { isJournalSubdomain } = config;

      const resourceInfo = getResourceInfo(graph, nodeMap, { sort: true });

      // we hydrate main entity so we can sort the abstract
      let mainEntity;
      const mainEntityId = getId(graph.mainEntity);
      if (mainEntityId && nodeMap[mainEntityId]) {
        mainEntity = embed(nodeMap[mainEntityId], nodeMap, {
          keys: ['detailedDescription']
        });
      }

      if (!journal) {
        journal = { '@id': getRootPartId(graph) };
      }
      const roleNames = graphAcl.getRoleNameData(user, {
        ignoreEndDateOnPublicationOrRejection: true
      });
      const roles = getActiveRoles(graph);
      const userGraphRoles = roles.filter(
        role => getAgentId(role) === getId(user)
      );

      const tagActions = Object.values(actionMap)
        .filter(action => {
          return (
            action['@type'] === 'TagAction' &&
            getScopeId(getObjectId(action)) === getScopeId(graph) && // !! reviewer only have the latest release so we need to compare on the scopeId
            getId(action.result) &&
            action.result.name &&
            graphAcl.checkPermission(user, 'ViewActionPermission', {
              action
            })
          );
        })
        .sort((a, b) => compareDefinedNames(a.result, b.result));

      const canTag =
        graphAcl.checkPermission(user, 'WritePermission') ||
        graphAcl.checkPermission(user, 'AdminPermission');

      let isGraphDeletable;

      // get date submitted
      let isGraphSubmitted = !!graph.dateSubmitted;

      isGraphDeletable =
        graphAcl.checkPermission(user, 'AdminPermission') ||
        (!isGraphSubmitted &&
          graphAcl.checkPermission(user, 'WritePermission'));

      const chordalData = schemaToChordal(
        arrayify(resourceInfo.resourceIds).map(
          id => nodeMap[id] || { '@id': id }
        ),
        { imagePart: false, hasPart: isJournalSubdomain }
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

      return {
        user,
        userGraphRoles,
        journal,
        workflowSpecification,
        actionMap,
        graphData,
        resourceInfo,
        acl: graphAcl,
        mainEntity,
        roleNames,
        chordalData,
        tagActions,
        canTag,
        isGraphDeletable,
        resourceCounts,
        highlightedWorkflowActions,
        openedWorkflowActions
      };
    }
  );
}

function makeMapStateToProps() {
  let selector = makeSelector();
  return function mapStateToProps(state, props) {
    return selector(state, props);
  };
}

export default connect(
  makeMapStateToProps,
  {
    postWorkflowAction,
    deleteWorkflowAction,
    setEmailComposerData,
    highlightWorkflowAction,
    openWorkflowAction
  }
)(ProjectCard);
