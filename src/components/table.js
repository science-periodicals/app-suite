import React, { Component } from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import TableObject from './table-object';
import Annotable from './annotable';
import Caption from './caption';
import Counter from '../utils/counter';

class Table extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    nodeMap: PropTypes.object,
    resource: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,

    // redux
    content: PropTypes.object
  };

  static defaultProps = {
    createSelector: identity,
    content: {}
  };

  render() {
    const {
      resource,
      graphId,
      actionId,
      nodeMap,
      content,
      annotable,
      counter,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel,
      blindingData
    } = this.props;

    return (
      <figure className="table">
        <Annotable
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'encoding'
            },
            `table-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 5,
            key: `table-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          })}
          selectable={false}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <TableObject content={content} />
        </Annotable>

        <figcaption>
          <Caption
            graphId={graphId}
            actionId={actionId}
            nodeMap={nodeMap}
            resource={resource}
            counter={counter}
            createSelector={createSelector}
            matchingLevel={matchingLevel}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
            blindingData={blindingData}
          />
        </figcaption>
      </figure>
    );
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => {
      if (props.resource && props.resource.encoding) {
        for (let encoding of props.resource.encoding) {
          const encodingId = getId(encoding);
          if (
            encodingId in state.contentMap &&
            state.contentMap[encodingId].html
          ) {
            return state.contentMap[encodingId];
          }
        }
      }
    },
    content => {
      return { content };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(Table);
