import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { updateGraph } from '../actions/graph-action-creators';
import { getId, embed } from '@scipe/jsonld';
import Annotable from './annotable';
import { RichTextarea, Value, RdfaCaptionMetadata } from '@scipe/ui';
import Counter from '../utils/counter';
import Node from './node';
import { createGraphDataSelector } from '../selectors/graph-selectors';

class Caption extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    resource: PropTypes.object.isRequired,
    embedded: PropTypes.bool,
    label: PropTypes.string,
    nodeMap: PropTypes.object,
    counter: PropTypes.instanceOf(Counter).isRequired,
    blindingData: PropTypes.object.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    annotable: PropTypes.bool,

    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    // redux
    mainEntity: PropTypes.object,
    updateGraph: PropTypes.func.isRequired
  };

  static defaultProps = {
    label: 'caption'
  };

  handleSubmit = e => {
    const { graphId, actionId } = this.props;

    if (e.preventDefault) {
      e.preventDefault();
    }

    this.props.updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': this.props.resource['@id'],
            [e.target.name]: e.target.value
          }
        ]
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );
  };

  render() {
    const {
      graphId,
      resource,
      counter,
      embedded,
      label,
      readOnly,
      disabled,
      createSelector,
      matchingLevel,
      annotable,
      nodeMap,
      blindingData,
      displayAnnotations,
      displayPermalink,
      mainEntity
    } = this.props;

    // TODO show label in caption when using Value. This is mostly usefull for multipart figure. We could add a multiPart prop to flag that too but would be good to avoid at this is error prone!
    return (
      <div className="caption">
        {embedded && resource.alternateName && (
          <Annotable
            graphId={graphId}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: graphId,
                node: getId(resource),
                selectedProperty: 'alternateName'
              },
              `caption-alternateName-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            )}
            matchingLevel={matchingLevel}
            counter={counter.increment({
              level: 5,
              key: `caption-alternateName-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            })}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <Value className="caption__title">{resource.alternateName}</Value>
          </Annotable>
        )}

        {embedded && !resource.caption ? null : (
          <Annotable
            graphId={graphId}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: graphId,
                node: getId(resource),
                selectedProperty: 'caption'
              },
              `caption-caption-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            )}
            matchingLevel={matchingLevel}
            counter={counter.increment({
              level: 5,
              key: `caption-caption-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            })}
            selectable={embedded}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <div>
              {embedded ? (
                <Value className="caption__body caption__body--embedded">
                  {resource.caption}
                </Value>
              ) : (
                <RichTextarea
                  className="caption__body"
                  name="caption"
                  label={label}
                  defaultValue={resource.caption}
                  onSubmit={this.handleSubmit}
                  readOnly={readOnly}
                  disabled={disabled}
                />
              )}

              <Node
                graphId={graphId}
                node={resource}
                nodeMap={nodeMap}
                embed={[
                  'about',
                  'creator',
                  'author',
                  'reviewer',
                  'contributor',
                  'producer',
                  'editor',
                  'license',
                  'encodesCreativeWork',
                  'exampleOfWork',
                  'isBasedOn',
                  'funder',
                  'hasPart',
                  'sponsor',
                  'citation',
                  'copyrightHolder'
                ]}
                omit={[
                  'potentialAction',
                  'isPartOf',
                  'resourceOf',
                  'isNodeOf',
                  'mainEntity'
                ]}
              >
                {resource => {
                  return typeof resource === 'string' ? null : (
                    <RdfaCaptionMetadata
                      object={resource}
                      graphId={graphId}
                      mainEntity={mainEntity}
                      displayParts={false}
                      isBlinded={!blindingData.visibleRoleNames.has('author')}
                      blindingData={blindingData}
                    />
                  );
                }}
              </Node>
            </div>
          </Annotable>
        )}
      </div>
    );
  }
}

export default connect(
  function makeMapStateToProps() {
    const s = createSelector(
      (state, props) => props.nodeMap,
      createGraphDataSelector(),
      (overwriteNodeMap, graphData = { graph: {} }) => {
        const nodeMap = overwriteNodeMap || graphData.nodeMap;
        let mainEntity = nodeMap[getId(graphData.graph.mainEntity)];
        if (mainEntity) {
          mainEntity = embed(mainEntity, nodeMap, {
            keys: ['author', 'contributor', 'roleAffiliation', 'roleAction']
          });
        }

        return {
          mainEntity
        };
      }
    );
    return (state, props) => {
      return s(state, props);
    };
  },
  {
    updateGraph
  }
)(Caption);
