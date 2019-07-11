import React from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import classNames from 'classnames';
import Iconoclass from '@scipe/iconoclass';
import Node from './node';
import ResourceContent from './resource-content';
import Counter from '../utils/counter';

export default class EditableResource extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    renderContent: PropTypes.bool,
    nodeMap: PropTypes.object, // Uused to shortcut the graphData to preview typesetting actions
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired, // the `CreateReleaseAction` or `TypesettingAction` or `PublishAction` @id providing the resource
    resourceId: PropTypes.string.isRequired,

    counter: PropTypes.instanceOf(Counter).isRequired,
    embedded: PropTypes.bool,
    shellified: PropTypes.bool,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    canPerform: PropTypes.bool, // can the user perform `actionId`. Must be set if `actionId` is a CreateReleaseAction
    forceEnableUpdateMainEntityEncoding: PropTypes.bool, // for `TypesettingAction` we only allow to update the main entity encoding (not the parts) => we set `disabled` to `true` this props allows to overwrite that

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,

    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number
  };

  static defaultProps = {
    embedded: false,
    displayAnnotations: true,
    createSelector: identity
  };

  renderHydratedResource = resource => {
    const {
      embedded,
      shellified,
      resourceId,
      className,
      id,
      counter,
      nodeMap,
      graphId,
      readOnly,
      disabled,
      canPerform,
      forceEnableUpdateMainEntityEncoding,
      actionId,

      annotable,
      displayAnnotations,
      displayPermalink,

      createSelector,
      matchingLevel,

      blindingData
    } = this.props;

    return (
      <div
        id={id || resourceId}
        className={classNames('editable-resource reverse-z-index', className, {
          'editable-resource--embedded': embedded && !shellified
        })}
      >
        <Iconoclass
          iconName="attachment"
          className="editable-resource__paperclip-icon"
          size="18px"
        />

        <div
          className={classNames('editable-resource__content', {
            'selectable-indent': !embedded || shellified
          })}
        >
          <ResourceContent
            graphId={graphId}
            actionId={actionId}
            canPerform={canPerform}
            forceEnableUpdateMainEntityEncoding={
              forceEnableUpdateMainEntityEncoding
            }
            resource={resource}
            counter={counter}
            nodeMap={nodeMap}
            shellified={shellified}
            embedded={embedded && !shellified}
            readOnly={readOnly}
            disabled={disabled}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
            blindingData={blindingData}
            createSelector={createSelector}
            matchingLevel={matchingLevel}
          />
        </div>
      </div>
    );
  };

  render() {
    const { graphId, resourceId, nodeMap } = this.props;

    return (
      <Node
        graphId={graphId}
        node={resourceId}
        nodeMap={nodeMap}
        embed={['encoding', 'distribution', 'license']}
        omit={[
          'potentialAction',
          'isPartOf',
          'encodesCreativeWork',
          'isBasedOn',
          'exampleOfWork'
        ]}
      >
        {this.renderHydratedResource}
      </Node>
    );
  }
}
