import React from 'react';
import PropTypes from 'prop-types';
import { createSelectorCreator, defaultMemoize } from 'reselect';
import { connect } from 'react-redux';
import { getId, embed, getSubNodeMap } from '@scipe/jsonld';
import { createGraphDataSelector } from '../selectors/graph-selectors';

class Node extends React.PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    debug: PropTypes.bool,
    nodeMap: PropTypes.object, // if not specified the nodeMap will be taked from the graphData (see CreateGraphDataSelector)
    children: PropTypes.func.isRequired,
    node: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        '@id': PropTypes.string
      })
    ]),
    embed: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string
    ]), // can take special '*' value for all
    omit: PropTypes.arrayOf(PropTypes.string),
    hydrated: PropTypes.object.isRequired
  };

  static defaultProps = {
    node: ''
  };

  constructor(props) {
    super(props);
  }

  render() {
    const { debug, children, hydrated } = this.props;

    if (debug) {
      console.log(this.props);
    }
    return children(hydrated);
  }
}

const createObjectShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  (curr, prev) => {
    if (
      !curr ||
      !prev ||
      typeof curr === 'string' ||
      typeof prev === 'string' ||
      curr['@id'] ||
      prev['@id']
    ) {
      return curr === prev;
    } else {
      // compare 2 subNodeMaps
      for (let key in curr) {
        if (curr[key] !== prev[key]) {
          return false;
        }
      }
      for (let key in prev) {
        if (prev[key] !== curr[key]) {
          return false;
        }
      }
      return true;
    }
  }
);

function makeSelector() {
  const graphDataSelector = createGraphDataSelector();

  return createObjectShallowEqualSelector(
    (state, props) => props.node,
    (state, props) => {
      if (props.nodeMap) {
        return props.nodeMap[getId(props.node)];
      }

      const graphData = graphDataSelector(state, props);
      if (graphData) {
        return graphData.nodeMap && graphData.nodeMap[getId(props.node)];
      }
    },
    (state, props) => {
      if (!props.embed || !props.embed.length) {
        return;
      }

      const nodeMap = props.nodeMap
        ? props.nodeMap
        : (graphDataSelector(state, props) || {}).nodeMap;

      if (nodeMap) {
        const node = nodeMap[getId(props.node)];
        if (!node) {
          return;
        }
        return getSubNodeMap(node, nodeMap, props.embed, {
          blacklist: props.omit
        });
      }
    },
    (node, hydrated, subNodeMap) => {
      if (typeof node === 'string') {
        node = { '@id': node };
      }

      hydrated = Object.assign({}, node, hydrated);
      if (subNodeMap) {
        hydrated = embed(hydrated, subNodeMap);
      }

      return { hydrated };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(Node);
