import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import { Value, ControlPanel } from '@scipe/ui';
import { getStageId, getStageActions } from '@scipe/librarian';
import {
  getWorkflowAction,
  getTypesetterRevisionRequestComment
} from '../../utils/workflow';
import {
  createActionMapSelector,
  createGraphAclSelector
} from '../../selectors/graph-selectors';
import ShellLink from '../shell/shell-link';

class TypesetterRevisionRequestInfo extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    annotation: PropTypes.object.isRequired,

    // redux;
    comment: PropTypes.object
  };

  render() {
    const { graphId, comment } = this.props;
    if (!comment) {
      return null;
    }

    return (
      <div className="typesetter-revision-request-info">
        <p>
          <strong>Upload a revision</strong>
        </p>
        <Value className="typesetter-revision-request-info__request">
          {comment.text}
        </Value>

        <ControlPanel>
          <ShellLink theme="button" type="submission" nodeId={graphId}>
            View styleguide
          </ShellLink>
        </ControlPanel>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    createGraphAclSelector(),
    (state, props) => props.annotation.selector.node,
    createActionMapSelector(),
    (user, acl, actionId, actionMap) => {
      const createReleaseAction = getWorkflowAction(actionId, {
        actionMap,
        user,
        acl
      });

      let typesettingAction = Object.values(actionMap).find(
        action =>
          action['@type'] === 'TypesettingAction' &&
          getId(action.instrumentOf) === getId(createReleaseAction)
      );
      if (!typesettingAction) {
        const stage = actionMap[getStageId(createReleaseAction)];
        typesettingAction = getStageActions(stage).find(
          action => getId(action.instrumentOf) === getId(createReleaseAction)
        );
      }

      const comment = getTypesetterRevisionRequestComment(typesettingAction);

      return { comment };
    }
  )
)(TypesetterRevisionRequestInfo);
