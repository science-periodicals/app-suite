import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import { getId } from '@scipe/jsonld';
import FormulaObject from './formula-object';
import Annotable from './annotable';
import Caption from './caption';
import Counter from '../utils/counter';

export default class Formula extends PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    nodeMap: PropTypes.object,
    resource: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,
    blindingData: PropTypes.object.isRequired,
    embedded: PropTypes.bool,
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
      createSelector,
      matchingLevel,
      displayAnnotations,
      displayPermalink,
      blindingData
    } = this.props;

    return (
      <figure className="formula">
        <Annotable
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'encoding'
            },
            `formula-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 5,
            key: `formula-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          })}
          selectable={false}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <FormulaObject resource={resource} />
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
