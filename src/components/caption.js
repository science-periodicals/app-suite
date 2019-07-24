import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { updateGraph } from '../actions/graph-action-creators';
import { getId, embed } from '@scipe/jsonld';
import Annotable from './annotable';
import { Value, RdfaCaptionMetadata } from '@scipe/ui';
import Counter from '../utils/counter';
import { createGraphDataSelector } from '../selectors/graph-selectors';

class Caption extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    resource: PropTypes.object.isRequired,
    nodeMap: PropTypes.object,
    counter: PropTypes.instanceOf(Counter).isRequired,
    blindingData: PropTypes.object.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    annotable: PropTypes.bool,

    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    // redux
    mainEntity: PropTypes.object,
    updateGraph: PropTypes.func.isRequired
  };

  render() {
    const {
      graphId,
      resource,
      counter,
      createSelector,
      matchingLevel,
      annotable,
      blindingData,
      displayAnnotations,
      displayPermalink,
      mainEntity
    } = this.props;

    return (
      <div className="caption">
        {!!resource.alternateName && (
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

        {!resource.caption ? null : (
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
            selectable={true}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <div>
              <Value className="caption__body caption__body--embedded">
                {resource.caption}
              </Value>

              <RdfaCaptionMetadata
                object={resource}
                graphId={graphId}
                mainEntity={mainEntity}
                displayParts={false}
                isBlinded={!blindingData.visibleRoleNames.has('author')}
                blindingData={blindingData}
              />
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
            keys: ['author', 'contributor', 'roleAffiliation', 'roleAction'],
            blacklist: [
              'resourceOf',
              'isNodeOf',
              'potentialAction',
              'isPartOf',
              'mainEntity'
            ]
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
