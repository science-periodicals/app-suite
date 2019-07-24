import React, { Component } from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import { getId } from '@scipe/jsonld';
import Caption from './caption';
import Annotable from './annotable';
import TextBoxObject from './text-box-object';
import Counter from '../utils/counter';

export default class TextBox extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    resource: PropTypes.object.isRequired,
    nodeMap: PropTypes.object,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool
  };

  static defaultProps = {
    createSelector: identity
  };

  render() {
    const {
      graphId,
      actionId,
      resource,
      nodeMap,
      counter,
      createSelector,
      matchingLevel,
      annotable,
      displayAnnotations,
      displayPermalink,
      blindingData
    } = this.props;

    return (
      <aside id={getId(resource)}>
        <header>
          <Caption
            graphId={graphId}
            actionId={actionId}
            nodeMap={nodeMap}
            resource={resource}
            createSelector={createSelector}
            matchingLevel={matchingLevel}
            counter={counter}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
            blindingData={blindingData}
          />
        </header>

        <Annotable
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'encoding'
            },
            `text-box-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 5,
            value: 3,
            key: `text-box-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          })}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <TextBoxObject resource={resource} />
        </Annotable>
      </aside>
    );
  }
}
