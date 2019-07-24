import React from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import classNames from 'classnames';
import Iconoclass from '@scipe/iconoclass';
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

  render() {
    const {
      embedded,
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
          'editable-resource--embedded': !!embedded
        })}
      >
        <Iconoclass
          iconName="attachment"
          className="editable-resource__paperclip-icon"
          size="18px"
        />

        <div
          className={classNames('editable-resource__content', {
            'selectable-indent': !embedded
          })}
        >
          <ResourceContent
            graphId={graphId}
            actionId={actionId}
            canPerform={canPerform}
            forceEnableUpdateMainEntityEncoding={
              forceEnableUpdateMainEntityEncoding
            }
            resourceId={resourceId}
            counter={counter}
            nodeMap={nodeMap}
            embedded={embedded}
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
  }
}
