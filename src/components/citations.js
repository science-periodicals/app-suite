import React from 'react';
import PropTypes from 'prop-types';
import uniqBy from 'lodash/uniqBy';
import { arrayify, getId, unrole } from '@scipe/jsonld';
import { RdfaCitation } from '@scipe/ui';
import { compareCitations } from '../utils/sort';
import Annotable from './annotable';
import Counter from '../utils/counter';

export default class Citations extends React.PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    resource: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    nodeMap: PropTypes.object,

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool
  };

  static defaultProps = {
    resource: {}
  };

  render() {
    const {
      graphId,
      resource,
      counter,
      annotable,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    const citations = uniqBy(
      arrayify(resource.citation).map(citation => unrole(citation, 'citation')),
      citation => getId(citation)
    ).sort(compareCitations);

    return (
      <ol className="citations sa__clear-list-styles">
        {arrayify(citations)
          .filter(citation => getId(citation) && typeof citation !== 'string')
          .map(citation => (
            <li key={getId(citation)} className="citations__item">
              <Annotable
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
