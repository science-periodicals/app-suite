import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom'; /* eslint-disable react/no-find-dom-node */
import { connect } from 'react-redux';
import noop from 'lodash/noop';
import classNames from 'classnames';
import pluralize from 'pluralize';
import { DragSource, DropTarget } from 'react-dnd';
import { createSelector } from 'reselect';
import { getAgentId } from '@scipe/librarian';
import { getId, arrayify, prefix } from '@scipe/jsonld';
import {
  RdfaPersonOrOrganization,
  RdfaOrganization,
  getDisplayName,
  BemTags
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import { createActionMapSelector } from '../selectors/graph-selectors';
import { createIsBeingEditedSelector } from '../selectors/annotation-selectors';
import Annotable from './annotable';
import ContributorInfoMenu from './contributor-info-menu';
import Counter from '../utils/counter';
import {
  ERROR_NEED_CONTRIBUTOR_IDENTITY,
  ERROR_NEED_COMPLETED_CHECK_ACTION
} from '../constants';

class AnnotableContributorListItem extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,

    action: PropTypes.shape({
      '@type': PropTypes.oneOf([
        'CreateReleaseAction',
        'TypesettingAction',
        'PublishAction'
      ]).isRequired
    }),

    contributor: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
      .isRequired,
    resource: PropTypes.object.isRequired,
    property: PropTypes.oneOf(['author', 'contributor']).isRequired,

    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,

    counter: PropTypes.instanceOf(Counter).isRequired, // cloned version => do NOT increment here
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,
    releaseRequirement: PropTypes.oneOf([
      'SubmissionReleaseRequirement',
      'ProductionReleaseRequirement'
    ]),

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    blindingData: PropTypes.object.isRequired,

    openShell: PropTypes.func.isRequired,
    onDelete: PropTypes.func,

    // DnD
    onOrder: PropTypes.func.isRequired,
    connectDragSource: PropTypes.func.isRequired,
    connectDropTarget: PropTypes.func.isRequired,
    isDragging: PropTypes.bool,
    canDrop: PropTypes.bool,
    isOver: PropTypes.bool,

    // redux
    checkAction: PropTypes.shape({
      '@type': PropTypes.oneOf(['CheckAction']).isRequired,
      actionStatus: PropTypes.string.isRequired
    }),
    isBeingEdited: PropTypes.bool.isRequired
  };

  static defaultProps = {
    onDelete: noop
  };

  handleClickEdit = e => {
    const {
      contributor: role,
      property,
      resource,
      disabled,
      openShell
    } = this.props;

    const selector = {
      '@type': 'NodeSelector',
      node: getId(resource),
      selectedProperty: property,
      selectedItem: getId(role)
    };

    openShell('edit', getId(role), { selector, disabled });
  };

  render() {
    const {
      disabled,
      readOnly,
      contributor,
      counter,
      createSelector,
      matchingLevel,
      resource,
      property,
      graphId,
      action,
      checkAction,
      blindingData,
      annotable,
      displayAnnotations,
      displayPermalink,
      onDelete,
      releaseRequirement,
      // DnD
      connectDragSource,
      connectDropTarget,
      isOver,
      canDrop,
      isDragging,
      isBeingEdited
    } = this.props;

    const bem = BemTags();

    const canViewAuthorIdentity = blindingData.visibleRoleNames.has('author');

    return (
      <li
        className={bem`annotable-contributor-list-item ${
          disabled ? '--disabled' : ''
        }`}
      >
        <Annotable
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: property,
              selectedItem: getId(contributor)
            },
            `annotable-contributor-list-item-${graphId}-${property}-${getId(
              contributor
            )}`
          )}
          matchingLevel={matchingLevel}
          info={getInfo(
            canViewAuthorIdentity,
            contributor,
            releaseRequirement,
            checkAction,
            action
          )}
          counter={counter}
          selectable={false}
          annotable={annotable}
          isBeingEdited={isBeingEdited}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          {connectDragSource(
            connectDropTarget(
              <div
                className={classNames(bem`__body__`, {
                  sa__draggable: true,
                  'sa__draggable--dnd-is-over': isOver,
                  'sa__draggable--dnd-can-drop': canDrop,
                  'sa__draggable--dnd-is-dragging': isDragging
                })}
              >
                <div className={bem`__contributor`}>
                  <div className={bem`__contributor-name`}>
                    {canViewAuthorIdentity && (
                      <ContributorInfoMenu
                        role={contributor}
                        isPrinting={false}
                        align="left"
                        className={bem`__contributor-name-menu`}
                      />
                    )}
                    <RdfaPersonOrOrganization
                      object={contributor}
                      blindedName={
                        canViewAuthorIdentity
                          ? undefined
                          : getDisplayName(blindingData, contributor, {
                              alwaysPrefix: true
                            })
                      }
                      predicate={prefix(property)}
                    />
                  </div>

                  <dl className={bem`__data`}>
                    {!!arrayify(contributor.roleAffiliation).length && (
                      <div>
                        {/* The authors affiliations */}
                        <dt className={bem`__data-label`}>
                          {pluralize(
                            'Affiliation',
                            arrayify(contributor.roleAffiliation).length
                          )}
                          {': '}
                        </dt>
                        {arrayify(contributor.roleAffiliation).map(
                          affiliation => (
                            <dd
                              className={bem`__data-value`}
                              key={getId(affiliation)}
                            >
                              <RdfaOrganization
                                object={affiliation}
                                blindedName={
                                  canViewAuthorIdentity
                                    ? undefined
                                    : getDisplayName(
                                        blindingData,
                                        affiliation,
                                        {
                                          subject: 'organization',
                                          alwaysPrefix: true
                                        }
                                      )
                                }
                                location={false}
                              />
                            </dd>
                          )
                        )}
                      </div>
                    )}
                  </dl>
                </div>

                {((checkAction &&
                  checkAction.actionStatus === 'CompletedActionStatus') ||
                  (!readOnly && canViewAuthorIdentity)) && (
                  <div className={bem`__controls`}>
                    {/* TODO add star if contributor has an identity part of the graphIdentities */}
                    {!!checkAction && (
                      <Iconoclass iconName="signature" behavior="passive" />
                    )}
                    {!readOnly && canViewAuthorIdentity && (
                      <Fragment>
                        <Iconoclass
                          iconName="pencil"
                          disabled={disabled}
                          behavior={isBeingEdited ? 'passive' : 'button'}
                          onClick={this.handleClickEdit}
                          size="18px"
                          round={isBeingEdited}
                          className={classNames(bem`__shell-icon`, {
                            [bem`--active`]: isBeingEdited
                          })}
                        />
                        <Iconoclass
                          iconName="delete"
                          disabled={disabled}
                          behavior="button"
                          onClick={onDelete}
                        />
                        <Iconoclass
                          iconName="reorder"
                          behavior="button"
                          disabled={disabled}
                        />
                      </Fragment>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </Annotable>
      </li>
    );
  }
}

function mapPropsToSelector(props) {
  const { resource, property, contributor } = props;
  return {
    node: getId(resource),
    selectedProperty: property,
    selectedItem: getId(contributor)
  };
}

function makeSelector() {
  return createSelector(
    (state, props) => props.contributor,
    createIsBeingEditedSelector(mapPropsToSelector),
    createActionMapSelector(),
    (contributor, isBeingEdited, actionMap) => {
      const checkAction = Object.values(actionMap).find(
        action =>
          action['@type'] === 'CheckAction' &&
          ((getId(contributor) && getId(contributor) === getId(action.agent)) ||
            (getAgentId(contributor) &&
              getAgentId(contributor) === getAgentId(action.agent)))
      );

      return { isBeingEdited, checkAction };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default DragSource(
  'AnnotableContributorListItem',
  {
    beginDrag(props) {
      return {
        id: getId(props.contributor)
      };
    },
    canDrag(props, monitor) {
      return !props.readOnly && !props.disabled;
    }
  },
  (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  })
)(
  DropTarget(
    'AnnotableContributorListItem',
    {
      drop(props, monitor, component) {
        props.onOrder(monitor.getItem().id, getId(props.contributor), true);
      },
      hover(props, monitor, component) {
        if (monitor.canDrop()) {
          const item = monitor.getItem().id;
          const hoverItem = getId(props.contributor);

          const contributors = props.resource[props.property];
          const dragIndex = contributors.findIndex(
            contributor => getId(contributor) == item
          );
          const hoverIndex = contributors.findIndex(
            contributor => getId(contributor) == hoverItem
          );

          // Don't replace items with themselves
          if (dragIndex === hoverIndex) {
            return;
          }

          // Determine rectangle on screen
          const hoverBoundingRect = findDOMNode(
            component
          ).getBoundingClientRect();

          // Get vertical middle
          const hoverMiddleY =
            (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

          // Determine mouse position
          const clientOffset = monitor.getClientOffset();

          // Get pixels to the top
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          // Only perform the move when the mouse has crossed half of the items height
          // When dragging downwards, only move when the cursor is below 50%
          // When dragging upwards, only move when the cursor is above 50%

          // Dragging downwards
          if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
            return;
          }

          // Dragging upwards
          if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
            return;
          }

          props.onOrder(item, hoverItem);
        }
      },
      canDrop(props, monitor) {
        return !props.readOnly && !props.disabled;
      }
    },
    (connect, monitor) => ({
      connectDropTarget: connect.dropTarget(),
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver()
    })
  )(connect(makeMapStateToProps)(AnnotableContributorListItem))
);

function getInfo(
  canViewAuthorIdentity,
  contributor,
  releaseRequirement,
  checkAction,
  action
) {
  const infos = [];

  const agentId = getAgentId(contributor);
  if (
    canViewAuthorIdentity &&
    (releaseRequirement === 'ProductionReleaseRequirement' ||
      (action && action['@type'] === 'TypesettingAction')) &&
    (!agentId ||
      (!agentId.startsWith('user:') &&
        !agentId.startsWith('org:') &&
        !agentId.startsWith('team:')))
  ) {
    infos.push(ERROR_NEED_CONTRIBUTOR_IDENTITY);
  }

  if (
    action &&
    action['@type'] === 'PublishAction' &&
    checkAction &&
    checkAction.actionStatus !== 'CompletedActionStatus'
  ) {
    infos.push(ERROR_NEED_COMPLETED_CHECK_ACTION);
  }

  return infos.length > 1 ? infos : infos.length === 1 ? infos[0] : undefined;
}
