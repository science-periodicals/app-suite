import React from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom'; /* eslint-disable react/no-find-dom-node */
import noop from 'lodash/noop';
import classNames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import { getId, arrayify, textify } from '@scipe/jsonld';
import { PaperInput, RichTextarea, withOnSubmit, Value } from '@scipe/ui';
import { getVersion } from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import Annotable from './annotable';
import Counter from '../utils/counter';
import ShellEditorActionComment from './shell/shell-editor-action-comment';
import { ERROR_MISSING_VALUE } from '../constants';
import {
  getSelectorGraphParam,
  getRelativeLocationLink,
  prettifyLocation
} from '../utils/annotations';

const ControlledPaperInput = withOnSubmit(PaperInput);

class AnnotableReviewerCommentListItem extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,

    action: PropTypes.object.isRequired,
    item: PropTypes.object.isRequired, // one of the comment of `action`

    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,

    counter: PropTypes.instanceOf(Counter).isRequired, // cloned version => do NOT increment here
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    saveWorkflowAction: PropTypes.func.isRequired,
    openShell: PropTypes.func.isRequired,

    // DnD
    onOrder: PropTypes.func.isRequired,
    connectDragSource: PropTypes.func.isRequired,
    connectDropTarget: PropTypes.func.isRequired,
    isDragging: PropTypes.bool,
    canDrop: PropTypes.bool,
    isOver: PropTypes.bool
  };

  static defaultProps = {
    onUpdate: noop,
    onDelete: noop
  };

  handleUpdate = e => {
    const { graphId, item, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).map(comment => {
        if (getId(comment) === getId(item)) {
          return Object.assign({}, comment, {
            [e.target.name]: e.target.value
          });
        }

        return comment;
      })
    });
  };

  handleDelete = e => {
    const { graphId, item, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).filter(comment => {
        return getId(comment) !== getId(item);
      })
    });
  };

  handleEdit = e => {
    const {
      graphId,
      action,
      openShell,
      item,
      counter,
      readOnly,
      disabled
    } = this.props;
    openShell('edit', getId(item), {
      hash: counter.getHash(),
      selector: this.getSelector(),
      connectedComponent: ShellEditorActionComment,
      params: {
        graphId,
        actionId: getId(action),
        commentId: getId(item)
      },
      readOnly,
      disabled
    });
  };

  getSelector() {
    const { item, action, createSelector } = this.props;

    return createSelector(
      {
        '@type': 'NodeSelector',
        graph: getSelectorGraphParam(action),
        node: getId(action),
        selectedProperty: 'comment',
        selectedItem: getId(item)
      },
      `annotable-reviewer-comment-list-item-${getId(action)}-${getId(item)}`
    );
  }

  getInfo() {
    const { item, disabled } = this.props;
    if (disabled) {
      return;
    }

    if (item.text == null || item.text == '') {
      return ERROR_MISSING_VALUE;
    }
  }

  render() {
    const {
      disabled,
      readOnly,
      item,
      counter,
      matchingLevel,
      graphId,
      annotable,
      displayAnnotations,
      displayPermalink,
      locationOptions,
      action,

      // DnD
      connectDragSource,
      connectDropTarget,
      isOver,
      canDrop,
      isDragging
    } = this.props;

    return (
      <li
        className={classNames('annotable-reviewer-comment-list-item', {
          'annotable-reviewer-comment-list-item--disabled': disabled
        })}
      >
        <Annotable
          graphId={graphId}
          selector={this.getSelector()}
          matchingLevel={matchingLevel}
          counter={counter}
          selectable={false}
          annotable={annotable}
          info={this.getInfo()}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
          iconName="feedback"
        >
          {(id, onResize) =>
            connectDragSource(
              connectDropTarget(
                <div
                  id={id}
                  className={classNames(
                    'annotable-reviewer-comment-list-item__body',
                    {
                      sa__draggable: true,
                      'sa__draggable--dnd-is-over': isOver,
                      'sa__draggable--dnd-can-drop': canDrop,
                      'sa__draggable--dnd-is-dragging': isDragging
                    }
                  )}
                >
                  <header className="annotable-reviewer-comment-list-item__header">
                    <h5>
                      {prettifyLocation(counter.getHash(), {
                        preserveHash: true
                      })}
                    </h5>

                    {!readOnly && (
                      <div className="annotable-reviewer-comment-list-item__controls">
                        <Iconoclass
                          iconName="shell"
                          disabled={disabled}
                          behavior="button"
                          onClick={this.handleEdit}
                          size="18px"
                        />
                        <Iconoclass
                          iconName="delete"
                          disabled={disabled}
                          behavior="button"
                          onClick={this.handleDelete}
                          size="18px"
                        />
                        <Iconoclass
                          iconName="reorder"
                          behavior="button"
                          disabled={disabled}
                          size="18px"
                        />
                      </div>
                    )}
                  </header>

                  <div className="annotable-reviewer-comment-list-item__value">
                    <div className="annotable-revision-request-comment-list-item__value-text">
                      {readOnly ? (
                        <Value>{item.name}</Value>
                      ) : (
                        <ControlledPaperInput
                          label="subject"
                          name="name"
                          large={true}
                          autoComplete="off"
                          readOnly={readOnly}
                          disabled={disabled}
                          value={textify(item.name) || ''}
                          onResize={onResize}
                          onSubmit={this.handleUpdate}
                        />
                      )}
                    </div>

                    <div className="annotable-reviewer-comment-list-item__value-text">
                      {readOnly ? (
                        <Value className="annotable-revision-request-comment-list-item__value-text--readonly">
                          {item.text}
                        </Value>
                      ) : (
                        <RichTextarea
                          label="body"
                          name="text"
                          readOnly={readOnly}
                          disabled={disabled}
                          defaultValue={item.text}
                          onSubmit={this.handleUpdate}
                          onResize={onResize}
                          options={locationOptions}
                          suggestionMapper={location =>
                            getRelativeLocationLink(
                              getVersion(getSelectorGraphParam(action)),
                              location
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            )
          }
        </Annotable>
      </li>
    );
  }
}

export default DragSource(
  'AnnotableReviewerCommentListItem',
  {
    beginDrag(props) {
      return {
        id: getId(props.item)
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
    'AnnotableReviewerCommentListItem',
    {
      drop(props, monitor, component) {
        props.onOrder(monitor.getItem().id, getId(props.item), true);
      },
      hover(props, monitor, component) {
        if (monitor.canDrop()) {
          const itemId = monitor.getItem().id;
          const hoverItemId = getId(props.item);

          const items = arrayify(props.action.comment);
          const dragIndex = items.findIndex(item => getId(item) == itemId);
          const hoverIndex = items.findIndex(
            item => getId(item) == hoverItemId
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

          props.onOrder(itemId, hoverItemId);
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
  )(AnnotableReviewerCommentListItem)
);
