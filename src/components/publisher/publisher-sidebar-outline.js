import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getScopeId } from '@scipe/librarian';
import {
  Chordal,
  schemaToChordal,
  getCssType,
  Value,
  Span,
  API_LABELS,
  getResourceInfo
} from '@scipe/ui';
import { arrayify, getId, unprefix } from '@scipe/jsonld';
import {
  createGraphDataSelector,
  createGraphAclSelector,
  createActionMapSelector,
  createCommentMapSelector
} from '../../selectors/graph-selectors';
import { StyleSection } from './publisher-sidebar';
import Notice, { CanceledNotice } from '../notice';
import {
  getAnnotableActionData,
  getOverwriteNodeMap,
  getHydratedTopLevelResources
} from '../../utils/workflow';
import ScrollLink from '../scroll-link';
import ShellLink from '../shell/shell-link';
import { getTocData } from '../../utils/document-object';

class PublisherSidebarOutline extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,

    graphId: PropTypes.string.isRequired,
    journalId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    actionId: PropTypes.string,
    canViewFilesAttachment: PropTypes.bool,

    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,

    history: PropTypes.object.isRequired,
    search: PropTypes.string.isRequired,

    // redux
    action: PropTypes.object,
    typesettingAction: PropTypes.object,
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
    chordalData: PropTypes.array,
    resourceCounts: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        type: PropTypes.string,
        value: PropTypes.number
      })
    ).isRequired
  };

  static defaultProps = {
    action: {}
  };

  handleNav(id, e) {
    e.preventDefault();
    const { history, search, graphId, journalId } = this.props;

    // We swap the hash by an ?id query string parameter
    // we need to crawl up to the .annotable, then grab the permalink__counter id and swap to that
    const $node = document.getElementById(id);

    if ($node) {
      let $annotable = $node;
      while (
        $annotable &&
        (!$annotable.classList || !$annotable.classList.contains('annotable'))
      ) {
        $annotable = $annotable.parentElement;
      }

      if ($annotable) {
        const $counter = $annotable.querySelector('.permalink__counter[id]');
        if ($counter) {
          history.push({
            pathname: `/${unprefix(journalId)}/${unprefix(
              getScopeId(graphId)
            )}/submission`,
            search,
            hash: `#${$counter.id}`
          });
        }
      }
    }
  }

  render() {
    const {
      search,
      graphId,
      journalId,
      tocData,
      chordalData,
      resourceCounts,
      action,
      typesettingAction,
      canViewFilesAttachment
    } = this.props;

    if (action.actionStatus === 'CanceledActionStatus') {
      return (
        <StyleSection className="publisher-sidebar-outline">
          <CanceledNotice />
        </StyleSection>
      );
    }

    if (!canViewFilesAttachment) {
      return (
        <StyleSection className="publisher-sidebar-outline">
          <Notice>You currently do not have access to the content</Notice>
        </StyleSection>
      );
    }

    if (!resourceCounts.length) {
      return (
        <StyleSection className="publisher-sidebar-outline">
          <Notice>Waiting for content</Notice>
        </StyleSection>
      );
    }

    if (
      action['@type'] !== 'TypesettingAction' &&
      typesettingAction &&
      typesettingAction.actionStatus !== 'CompletedActionStatus' &&
      typesettingAction.actionStatus !== 'CanceledActionStatus' &&
      typesettingAction.actionStatus !== 'FailedActionStatus'
    ) {
      return (
        <StyleSection className="publisher-sidebar-outline">
          <Notice>Waiting for typeset content</Notice>
        </StyleSection>
      );
    }

    return (
      <StyleSection className="publisher-sidebar-outline">
        {!!(chordalData && chordalData.length > 2) && (
          <div className="publisher-sidebar-outline__chordal">
            <Chordal noAnimation={true} data={chordalData} size={96} />
            <div className="publisher-sidebar-outline__chordal-key" />
          </div>
        )}

        {tocData ? (
          <ul className="sa__clear-list-styles">
            {tocData.map(({ id, title, entries }) => (
              <li key={id} className="publisher-sidebar-outline__section">
                <header className="publisher-sidebar-outline__major-section-title">
                  {title}
                </header>

                {entries.length ? (
                  <ul className="sa__clear-list-styles">
                    {entries.map(data => (
                      <li
                        key={
                          (data.section && data.section.id) ||
                          (data.h2 && data.h2.id)
                        }
                      >
                        <ScrollLink
                          prettifyHash={true}
                          to={{
                            pathname: `/${unprefix(journalId)}/${unprefix(
                              getScopeId(graphId)
                            )}/submission`,
                            search,
                            hash: `#${
                              data.h2.id
                            }` /* we use the id of the h2 so that we can target an annotable in handleNav*/
                          }}
                          className="publisher-sidebar-outline__section-title"
                        >
                          <Value escHtml={false}>
                            {data.h2.$node.innerHTML ||
                              data.h2.$node.textContent}
                          </Value>
                        </ScrollLink>

                        {!!data.resourcesByType && (
                          <ul className="sa__clear-list-styles publisher-sidebar-outline__resource-lists">
                            {Object.keys(data.resourcesByType)
                              .sort()
                              .map(type => (
                                <li
                                  key={type}
                                  className="sa__clear-list-styles publisher-sidebar-outline__resource-lists__type-list"
                                >
                                  {data.resourcesByType[type].length > 0 && (
                                    <ul className="publisher-sidebar-outline__resource-list">
                                      {data.resourcesByType[type].map(
                                        resource => (
                                          <li
                                            key={getId(resource)}
                                            className="publisher-sidebar-outline__resource-list__item"
                                          >
                                            <div
                                              className={`publisher-sidebar-outline__dot color-${getCssType(
                                                type
                                              )}`}
                                            />
                                            <ShellLink
                                              type="resource"
                                              nodeId={getId(resource)}
                                            >
                                              <Span>
                                                {resource.alternateName}
                                              </Span>
                                            </ShellLink>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  )}
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>No sections</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="sa__clear-list-styles publisher-sidebar-outline__resource-list">
            {resourceCounts.map(({ type, name, value }) => (
              <li
                key={type}
                className="publisher-sidebar-outline__resource-list__item"
              >
                <div
                  className={`publisher-sidebar-outline__dot color-${getCssType(
                    type
                  )}`}
                />
                <span>
                  {`${value} `}
                  {name}
                  {value !== 1 ? (name.endsWith('x') ? 'es' : 's') : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </StyleSection>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    (state, props) => props.stageId,
    (state, props) => props.actionId,
    createActionMapSelector(),
    createCommentMapSelector(),
    createGraphAclSelector(),
    createGraphDataSelector(),
    state => state.contentMap,
    (
      user,
      stageId,
      actionId,
      actionMap = {},
      commentMap = {},
      acl,
      graphData = {},
      contentMap
    ) => {
      const graph = graphData.graph;
      const overwriteNodeMap = getOverwriteNodeMap(actionId, {
        user,
        actionMap,
        acl
      });
      const nodeMap = overwriteNodeMap || graphData.nodeMap;

      const resourceInfo = getResourceInfo(graph, nodeMap, { sort: true });

      const hydratedTopLevelResources = getHydratedTopLevelResources(
        graph,
        nodeMap
      );

      const chordalData = schemaToChordal(
        arrayify(resourceInfo.resourceIds).map(
          id => nodeMap[id] || { '@id': id }
        ),
        { imagePart: false, hasPart: false }
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
            type,
            name: API_LABELS[type] || type,
            value: resourceCountsMap[type]
          };
        })
        .sort((a, b) => {
          return a.name.localeCompare(b.name);
        });

      const tocData = getTocData(graph, nodeMap, contentMap);

      const { action, typesettingAction } =
        getAnnotableActionData(
          graph,
          stageId,
          actionId,
          user,
          acl,
          actionMap,
          commentMap,
          hydratedTopLevelResources
        ) || {};

      return {
        action,
        typesettingAction,
        chordalData,
        resourceCounts,
        tocData
      };
    }
  )
)(PublisherSidebarOutline);
