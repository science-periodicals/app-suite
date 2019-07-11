import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getObjectId } from '@scipe/librarian';
import { getId } from '@scipe/jsonld';
import { WorkflowActionUserBadgeMenu } from '@scipe/ui';

// WorkflowActionUserBadgeMenu with live status and Error (if any)

class LiveWorkflowActionUserBadgeMenu extends React.Component {
  static propTypes = {
    action: PropTypes.object,

    // redux
    isProgressing: PropTypes.bool,
    error: PropTypes.instanceOf(Error)
  };

  render() {
    return <WorkflowActionUserBadgeMenu {...this.props} />;
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => {
      const { action = {} } = props;
      const id =
        action['@type'] === 'AcceptAction' || action['@type'] === 'RejectAction'
          ? getObjectId(action)
          : getId(action);

      return state.workflowActionStatus[id];
    },
    status => {
      return {
        isProgressing: status && status.status === 'active',
        error: status && status.error
      };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(LiveWorkflowActionUserBadgeMenu);
