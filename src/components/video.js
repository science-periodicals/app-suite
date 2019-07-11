import React, { Component } from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import { getId } from '@scipe/jsonld';
import Annotable from './annotable';
import VideoObject from './video-object';
import Caption from './caption';
import Counter from '../utils/counter';

export default class Video extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    resource: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,
    nodeMap: PropTypes.object,

    embedded: PropTypes.bool,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    isPrinting: PropTypes.bool
  };

  static defaultProps = {
    createSelector: identity
  };

  render() {
    const {
      resource,
      graphId,
      actionId,
      nodeMap,
      counter,
      embedded,
      readOnly,
      disabled,
      annotable,
      displayAnnotations,
      displayPermalink,
      isPrinting,
      createSelector,
      matchingLevel,
      blindingData
    } = this.props;

    return (
      <figure className="video">
        <Annotable
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'encoding'
            },
            `video-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 5,
            key: `video-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          })}
          selectable={false}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <VideoObject resource={resource} isPrinting={isPrinting} />
        </Annotable>

        <figcaption>
          <Caption
            graphId={graphId}
            actionId={actionId}
            resource={resource}
            nodeMap={nodeMap}
            counter={counter}
            createSelector={createSelector}
            matchingLevel={matchingLevel}
            embedded={embedded}
            readOnly={readOnly}
            disabled={disabled}
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
