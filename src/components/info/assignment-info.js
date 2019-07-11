import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import { getStageId, getStageActions, getObjectId } from '@scipe/librarian';
import { getSortedStages } from '../../utils/workflow';
import { createActionMapSelector } from '../../selectors/graph-selectors';

import {
  // assignment
  ERROR_NEED_ASSIGNMENT,
  ERROR_NEED_ASSIGNEE,
  ERROR_NEED_ENDORSER_ASSIGNMENT,
  ERROR_NEED_ENDORSER
} from '../../constants';

class AssignmentInfo extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    annotation: PropTypes.object.isRequired,

    // redux
    action: PropTypes.object.isRequired,
    endorseAction: PropTypes.object
  };

  static defaultProps = {
    endorseAction: {}
  };

  render() {
    const { action, endorseAction, annotation } = this.props;

    switch (annotation.object) {
      case ERROR_NEED_ASSIGNMENT: {
        const { agent: { name, roleName } = {} } = action;
        return (
          <p>
            {roleName === 'editor' || roleName === 'author' ? 'An' : 'A'}{' '}
            {roleName} {name ? `(${name}) ` : ''}
            must be <strong>assigned</strong> to the action before it can be
            completed.
          </p>
        );
      }

      case ERROR_NEED_ASSIGNEE: {
        // TODO add an ADD button that opens the invite modal
        const { agent: { name, roleName } = {} } = action;
        return (
          <p>
            {roleName === 'editor' || roleName === 'author' ? 'An' : 'A'}{' '}
            {roleName} {name ? `(${name}) ` : ''}
            must be added to the submission before the action can be{' '}
            <strong>assigned</strong> and completed.
          </p>
        );
      }

      case ERROR_NEED_ENDORSER_ASSIGNMENT: {
        const { agent: { name, roleName = 'user' } = {} } = endorseAction;

        return (
          <p>
            {roleName === 'editor' || roleName === 'author' ? 'An' : 'A'}{' '}
            {roleName} {name ? `(${name}) ` : ''}
            must be specified as endorser before the{' '}
            <strong>endorsement</strong> can be completed.
          </p>
        );
      }

      case ERROR_NEED_ENDORSER: {
        // TODO add an ADD button that opens the invite modal
        const { agent: { name, roleName = 'user' } = {} } = endorseAction;
        return (
          <p>
            {roleName === 'editor' || roleName === 'author' ? 'An' : 'A'}{' '}
            {roleName} {name ? `(${name}) ` : ''}
            must be added to the submission before the{' '}
            <strong>endorsement</strong> can be assigned and completed.
          </p>
        );
      }

      default:
        return null;
    }
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => getId(props.annotation.selector.node),
    createActionMapSelector(),
    (actionId, actionMap) => {
      let action = actionMap[actionId];
      // we may not have access to the action => we try to get it from the stage data
      if (!action) {
        const stages = getSortedStages(actionMap);
        for (const stage of stages) {
          const _action = getStageActions(stage).find(
            action => getId(action) === actionId
          );
          if (_action) {
            action = _action;
            break;
          }
        }
      }

      const stage = actionMap[getStageId(action)];

      const workflowActions = getStageActions(stage);
      const endorseAction = workflowActions.find(
        stageAction =>
          stageAction['@type'] == 'EndorseAction' &&
          getObjectId(stageAction) === getId(action)
      );

      return { action, endorseAction };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(AssignmentInfo);
