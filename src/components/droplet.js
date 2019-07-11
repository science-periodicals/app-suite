import React from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import { getScopeId } from '@scipe/librarian';
import { getId } from '@scipe/jsonld';

class Droplet extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    node: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        '@id': PropTypes.string.isRequired
      })
    ]),

    latest: PropTypes.bool, // if set to true will match latest release based on scope an not @id

    // redux
    hydrated: PropTypes.object.isRequired // injected
  };

  render() {
    const { children, hydrated } = this.props;
    return children(hydrated);
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => props.node,
    (state, props) => {
      const nodeId = getId(props.node);
      if (nodeId) {
        if (props.latest && nodeId.startsWith('graph:')) {
          const scopeId = getScopeId(props.node);
          if (scopeId) {
            return Object.values(state.droplets).find(
              droplet =>
                droplet['@type'] === 'Graph' &&
                droplet.version != null &&
                getScopeId(droplet) === scopeId
            );
          }
        } else {
          return state.droplets[nodeId];
        }
      }
    },
    (node, hydrated) => {
      if (typeof node === 'string') {
        node = { '@id': node };
      }
      return { hydrated: Object.assign({}, node, hydrated) };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(Droplet);
