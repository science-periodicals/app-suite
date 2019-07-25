import React from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import { unprefix, getId } from '@scipe/jsonld';
import { getScopeId, getVersion } from '@scipe/librarian';
import { H2, Strong, Value, bemify, AuthorGuidelines } from '@scipe/ui';
import Notice from '../notice';

class ShellSubmission extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    // redux
    graph: PropTypes.object,
    publicationType: PropTypes.shape({
      '@id': PropTypes.string,
      '@type': PropTypes.oneOf(['PublicationType']),
      name: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      alternateName: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      description: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
    })
  };

  static defaultProps = {
    graph: {}
  };

  render() {
    const { graph, publicationType } = this.props;

    const bem = bemify('shell-submission');

    // TODO tabs with workflow data
    return (
      <div className={bem``}>
        {!!(publicationType.name || publicationType.alternateName) && (
          <H2 className={bem`__title`}>
            {publicationType.name || publicationType.alternateName}
          </H2>
        )}

        {!!publicationType.description && (
          <div className="sa__ui-user-type">
            <Value>{publicationType.description}</Value>
          </div>
        )}

        <Notice>
          <span>
            Detailed formatting instruction for{' '}
            {
              <Strong>
                {publicationType.name ||
                  publicationType.alternateName ||
                  unprefix(getId(publicationType))}
              </Strong>
            }{' '}
            can be found in the{' '}
            <a
              href={
                `/get-started/publication-types-and-style-guides?type=${unprefix(
                  getId(publicationType).split('?')[0]
                )}&version=${getVersion(
                  getId(publicationType)
                )}` /* !! publicationType @id have a ?version= part */
              }
            >
              publication types and style guides documentation
            </a>
            .
          </span>
        </Notice>

        <div className="sa__ui-user-type">
          {/* The graph description is used in testing mode to provide
              contextual info about what is being tested */}
          {!!(process.env.NODE_ENV !== 'production' && graph.description) && (
            <Value>{graph.description}</Value>
          )}

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
