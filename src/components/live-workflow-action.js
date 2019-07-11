import { connect } from 'react-redux';
import { getObjectId } from '@scipe/librarian';
import { getId } from '@scipe/jsonld';
import { WorkflowAction } from '@scipe/ui';

// TODO delete

// WorkflowAction with live status

export default connect((state, props) => {
  const id =
    props.action['@type'] === 'AcceptAction' ||
    props.action['@type'] === 'RejectAction'
      ? getObjectId(props.action)
      : getId(props.action);

  const highlightedWorkflowActions =
    state.highlightedWorkflowAction[getId(props.graph)];

  const status = state.workflowActionStatus[id];

  return {
    isProgressing: status && status.status === 'active',
    error: status && status.error,
    isHovered:
      highlightedWorkflowActions &&
      highlightedWorkflowActions.includes(getId(props.action))
  };
})(WorkflowAction);
