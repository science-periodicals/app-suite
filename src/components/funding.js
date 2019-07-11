import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import {
  RdfaFundingTable,
  getFunderTree,
  getResourceInfo
} from '@scipe/ui';
import { embed } from '@scipe/jsonld';
import { createGraphDataSelector } from '../selectors/graph-selectors';

class Funding extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    graphId: PropTypes.string.isRequired, // needed for the selector
    nodeMap: PropTypes.object,

    // redux
    graph: PropTypes.object,
    funderTree: PropTypes.array
  };

  render() {
    const { id, graph, funderTree } = this.props;
    return (
      <div id={id} className="funding">
        <RdfaFundingTable object={graph} funderTree={funderTree} />
      </div>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.nodeMap,
    createGraphDataSelector(),
    (nodeMap, graphData = {}) => {
      nodeMap = nodeMap || graphData.nodeMap;
      const graph = graphData.graph;

      const resourceInfo = getResourceInfo(graph, nodeMap, { sort: true });

      // hydrate the graph
      const framedResources = resourceInfo.resourceIds.map(resourceId => {
        return embed(resourceId, nodeMap, {
          blacklist: ['potentialAction', 'resourceOf']
        });
      });

      const hydratedGraph = Object.assign({}, graph, {
        '@graph': framedResources
      });

      const funderTree = getFunderTree(hydratedGraph);

      return { graph, funderTree };
    }
  )
)(Funding);
