import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import { arrayify, getId, textify } from '@scipe/jsonld';
import { FlexPacker, Value } from '@scipe/ui';
import Annotable from './annotable';
import ImageObject from './image-object';
import Caption from './caption';
import Counter from '../utils/counter';

export default class Image extends PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    resource: PropTypes.object.isRequired,
    embedded: PropTypes.bool,
    counter: PropTypes.instanceOf(Counter).isRequired,
    blindingData: PropTypes.object.isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,
    nodeMap: PropTypes.object,

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
      resource,
      graphId,
      actionId,
      annotable,
      displayAnnotations,
      displayPermalink,
      embedded,
      readOnly,
      disabled,
      counter,
      createSelector,
      matchingLevel,
      blindingData,
      nodeMap
    } = this.props;

    return (
      <figure className="image">
        {resource.hasPart ? (
          <Annotable
            graphId={graphId}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: graphId,
                node: getId(resource),
                selectedProperty: 'hasPart'
              },
              `image-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            )}
            matchingLevel={matchingLevel}
            counter={counter.increment({
              level: 5,
              key: `image-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            })}
            selectable={false}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <FlexPacker>
              {arrayify(resource.hasPart).map(part => (
                <figure key={part['@id']} className="image-part">
                  <figcaption className="ui__text--caption">
                    <Value>{part.alternateName || part['@id']}</Value>
                  </figcaption>
                  <ImageObject graphId={graphId} resource={part} />
                </figure>
              ))}
            </FlexPacker>
          </Annotable>
        ) : (
          <Annotable
            graphId={graphId}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: graphId,
                node: getId(resource),
                selectedProperty: 'encoding'
              },
              `image-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            )}
            matchingLevel={matchingLevel}
            counter={counter.increment({
              level: 5,
              key: `image-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            })}
            selectable={false}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <ImageObject graphId={graphId} resource={resource} />
          </Annotable>
        )}

        <figcaption>
          <Caption
            graphId={graphId}
            actionId={actionId}
            resource={resource}
            counter={counter}
            nodeMap={nodeMap}
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

          {/* subcaptions */}
          <ul className="image__caption-list">
            {resource.hasPart &&
              resource.hasPart
                .filter(part => !embedded || (embedded && part.caption))
                .map(part => {
                  return (
                    <li key={getId(part)}>
                      <Caption
                        resource={part}
                        graphId={graphId}
                        actionId={actionId}
                        counter={counter}
                        nodeMap={nodeMap}
                        createSelector={createSelector}
                        matchingLevel={matchingLevel}
                        embedded={embedded}
                        readOnly={readOnly}
                        disabled={disabled}
                        annotable={annotable}
                        displayAnnotations={displayAnnotations}
                        displayPermalink={displayPermalink}
                        blindingData={blindingData}
                        label={
                          'subcaption' +
                          (part.alternateName
                            ? ` (${textify(part.alternateName)})`
                            : '')
                        }
                      />
                    </li>
                  );
                })}
          </ul>
        </figcaption>
      </figure>
    );
  }
}
