import React from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import { unprefix, getId } from '@scipe/jsonld';
import { getScopeId } from '@scipe/librarian';
import { Value, bemify, AuthorGuidelines } from '@scipe/ui';

class ShellSubmission extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    // redux
    graph: PropTypes.object,
    publicationType: PropTypes.shape({
      '@type': PropTypes.oneOf(['PublicationType'])
    })
  };

  static defaultProps = {
    graph: {}
  };

  render() {
    const { graphId, graph, publicationType } = this.props;

    const bem = bemify('shell-submission');
    const submissionId = unprefix(getScopeId(graphId));

    // TODO tabs with workflow data
    return (
      <div className={bem``}>
        <h2 className={bem`__title`}>{submissionId}</h2>
        <div className="sa__ui-user-type">
          <Value>{graph.description}</Value>

          <AuthorGuidelines publicationType={publicationType} />
        </div>
      </div>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => {
      const scopeId = getScopeId(props.graphId);
      const data = state.scopeMap[scopeId];
      return (
        data &&
        data.graphMap &&
        data.graphMap[scopeId] &&
        data.graphMap[scopeId].graph
      );
    },
    (state, props) => {
      const scopeId = getScopeId(props.graphId);
      const data = state.scopeMap[scopeId];
      const graph =
        data &&
        data.graphMap &&
        data.graphMap[scopeId] &&
        data.graphMap[scopeId].graph;
      if (graph) {
        const typeId = getId(graph.additionalType);
        if (typeId) {
          return state.droplets[typeId];
        }
      }
    },
    (graph, publicationType) => {
      return { graph, publicationType };
    }
  )
)(ShellSubmission);
