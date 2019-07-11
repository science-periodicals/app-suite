import React from 'react';
import PropTypes from 'prop-types';
import uniqBy from 'lodash/uniqBy';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { arrayify, getId, embed, unrole } from '@scipe/jsonld';
import { RdfaCitation } from '@scipe/ui';
import { createGraphDataSelector } from '../selectors/graph-selectors';
import { compareCitations } from '../utils/sort';
import Annotable from './annotable';
import Counter from '../utils/counter';

class Citations extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    resource: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    nodeMap: PropTypes.object,

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    // redux
    citations: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.object, PropTypes.string])
    )
  };

  static defaultProps = {
    resource: {}
  };

  render() {
    const {
      stageId,
      graphId,
      resource,
      citations,
      counter,
      annotable,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    return (
      <ol className="citations sa__clear-list-styles">
        {arrayify(citations)
          .filter(citation => getId(citation) && typeof citation !== 'string')
          .map(citation => (
            <li key={getId(citation)} className="citations__item">
              <Annotable
                stageId={stageId}
                graphId={graphId}
                selector={createSelector({
                  '@type': 'NodeSelector',
                  graph: graphId,
                  node: getId(resource),
                  selectedProperty: 'citation',
                  selectedItem: getId(citation)
                })}
                matchingLevel={matchingLevel}
                counter={counter.increment({
                  level: 5,
                  key: `citations-${getId(citation)}`
                })}
                selectable={false}
                annotable={annotable}
                displayAnnotations={displayAnnotations}
                displayPermalink={displayPermalink}
                className="citations__annotable"
              >
                <RdfaCitation object={citation} predicate="schema:citation" />
              </Annotable>
            </li>
          ))}
      </ol>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.resource,
    (state, props) => props.nodeMap,
    createGraphDataSelector(),
    (resource, nodeMap, graphData = {}) => {
      nodeMap = nodeMap || graphData.nodeMap || {};

      resource = embed(resource, nodeMap, {
        keys: ['citation']
      });

      const citations = uniqBy(
        arrayify(resource.citation).map(citation =>
          unrole(citation, 'citation')
        ),
        citation => getId(citation)
      ).sort(compareCitations);

      return {
        citations
      };
    }
  )
)(Citations);
