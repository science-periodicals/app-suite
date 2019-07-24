import React, { Component } from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import { getId } from '@scipe/jsonld';
import Annotable from './annotable';
import AudioObject from './audio-object';
import Caption from './caption';
import Counter from '../utils/counter';

export default class Audio extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    resource: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,
    nodeMap: PropTypes.object,

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool
  };

  static defaultProps = {
    createSelector: identity
  };

  render() {
    const {
      resource,
      graphId,
      actionId,
      annotable,
      displayAnnotations,
      displayPermalink,
      counter,
      createSelector,
      matchingLevel,
      blindingData,
      nodeMap
    } = this.props;

    return (
      <figure className="audio">
        <Annotable
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'encoding'
            },
            `audio-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 5,
            key: `audio-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          })}
          selectable={false}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <AudioObject resource={resource} />
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
