import React, { Component } from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import { getId } from '@scipe/jsonld';
import Annotable from './annotable';
import SoftwareSourceCodeObject from './software-source-code-object';
import Caption from './caption';
import Counter from '../utils/counter';

export default class SoftwareSourceCode extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    nodeMap: PropTypes.object,
    resource: PropTypes.object.isRequired,
    embedded: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

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
      nodeMap,
      resource,
      embedded,
      readOnly,
      disabled,
      annotable,
      counter,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel,
      blindingData
    } = this.props;

    return (
      <figure className="software-source-code">
        <Annotable
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'encoding'
            },
            `software-source-code-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 5,
            key: `software-source-code-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          })}
          selectable={false}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <SoftwareSourceCodeObject resource={resource} />
        </Annotable>

        <figcaption>
          <Caption
            graphId={graphId}
            actionId={actionId}
            nodeMap={nodeMap}
            resource={resource}
            counter={counter}
            blindingData={blindingData}
            createSelector={createSelector}
            matchingLevel={matchingLevel}
            embedded={embedded}
            readOnly={readOnly}
            disabled={disabled}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          />
        </figcaption>
      </figure>
    );
  }
}
