import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { arrayify, getId } from '@scipe/jsonld';
import { getLocationIdentifier } from '@scipe/librarian';
import AnnotableRevisionRequestCommentListItem from './annotable-revision-request-comment-list-item';
import Counter from '../utils/counter';
import { saveWorkflowAction } from '../actions/workflow-action-creators';
import { repositionAnnotations } from '../actions/annotation-action-creators';
import { openShell } from '../actions/ui-action-creators';

/**
 * General (not in context) revision request for `AssessAction` (`action`)
 * - requests are stored in `action.comment`
 */
class AnnotableRevisionRequestCommentList extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,

    stageId: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    action: PropTypes.shape({
      '@type': PropTypes.oneOf(['AssessAction']).isRequired,
      comment: PropTypes.arrayOf(PropTypes.object)
    }).isRequired,

    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,
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

    // redux
    repositionAnnotations: PropTypes.func.isRequired,
    saveWorkflowAction: PropTypes.func.isRequired,
    openShell: PropTypes.func.isRequired
  };

  static defaultProps = {
    resource: {}
  };

  constructor(props) {
    super(props);

    const { action } = props;
    this.state = {
      items: arrayify(action.comment).slice(),
      lastAction: action
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.action !== state.lastAction) {
      return {
        items: arrayify(props.action.comment).slice(),
        lastAction: props.action
      };
    }

    return null;
  }

  handleOrder = (itemId, hoveredId, dropped) => {
    const { graphId, action, saveWorkflowAction } = this.props;

    const { items } = this.state;
    const nextItems = items.slice();

    const index = items.findIndex(item => getId(item) === itemId);
    const hoveredIndex = items.findIndex(item => getId(item) === hoveredId);

    const item = nextItems[index];
    const hovered = nextItems[hoveredIndex];
    nextItems[index] = hovered;
    nextItems[hoveredIndex] = item;

    this.setState({ items: nextItems });

    if (dropped) {
      this.props.repositionAnnotations();
      saveWorkflowAction(graphId, {
        '@id': getId(action),
        comment: nextItems
      });
    }
  };

  render() {
    const {
      id,
      className,
      action,
      counter,
      disabled,
      readOnly,
      ...others
    } = this.props;

    const { items } = this.state;

    const listCounter = counter.increment({
      level: 3,
      value: getLocationIdentifier(action['@type'], 'comment'),
      key: `annotable-revision-request-comment-list-${getId(action)}`
    });

    return (
      <ol className="annotable-revision-request-comment-list sa__clear-list-styles">
        {items.map(item => (
          <AnnotableRevisionRequestCommentListItem
            key={getId(item)}
            {...others}
            action={action}
            counter={listCounter.increment({
              level: 4,
              key: `annotable-revision-request-comment-list-${getId(
                action
              )}-${getId(item)}`
            })}
            disabled={disabled}
            readOnly={readOnly}
            onOrder={this.handleOrder}
            item={item}
          />
        ))}
      </ol>
    );
  }
}

export default connect(
  null,
  {
    repositionAnnotations,
    saveWorkflowAction,
    openShell
  }
)(AnnotableRevisionRequestCommentList);
