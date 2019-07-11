import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { withRouter } from 'react-router';
import {
  createGraphAclSelector,
  createGraphDataSelector,
  createActionMapSelector
} from '../../selectors/graph-selectors';
import { getWorkflowAction } from '../../utils/workflow';
import ReviewAttachment from '../review-attachment';
import AssessmentAttachment from '../assessment-attachment';
import AuthorNotesAttachment from '../author-notes-attachment';

// TODO display fixed title

class ShellAttachment extends React.Component {
  static propTypes = {
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired,
    blindingData: PropTypes.object.isRequired,

    reviewAttachmentLinkType: PropTypes.oneOf(['shell', 'transition']),

    // redux
    user: PropTypes.object,
    acl: PropTypes.object,
    graph: PropTypes.object,
    action: PropTypes.object,

    // react-router
    location: PropTypes.object.isRequired
  };

  render() {
    const {
      journalId,
      graphId,
      actionId,
      user,
      acl,
      blindingData,
      graph,
      action,
      location,
      reviewAttachmentLinkType
    } = this.props;

    const search = location.search;

    return (
      <div className="shell-attachment">
        {action['@type'] === 'ReviewAction' ? (
          <ReviewAttachment
            user={user}
            journalId={journalId}
            graph={graph}
            search={search}
            graphId={graphId}
            reviewActionId={actionId}
            acl={acl}
            readOnly={true}
            disabled={true}
            annotable={false}
            displayPermalink={false}
            displayAnnotations={false}
            blindingData={blindingData}
          />
        ) : action['@type'] === 'AssessAction' ? (
          <AssessmentAttachment
            user={user}
            graph={graph}
            journalId={journalId}
            graphId={graphId}
            search={search}
            action={action}
            acl={acl}
            readOnly={true}
            disabled={true}
            annotable={false}
            displayPermalink={false}
            displayAnnotations={false}
            blindingData={blindingData}
            reviewAttachmentLinkType={reviewAttachmentLinkType}
          />
        ) : action['@type'] === 'CreateReleaseAction' ? (
          <AuthorNotesAttachment
            user={user}
            journalId={journalId}
            graph={graph}
            search={search}
            graphId={graphId}
            createReleaseActionId={actionId}
            acl={acl}
            readOnly={true}
            disabled={true}
            annotable={false}
            displayPermalink={false}
            displayAnnotations={false}
            blindingData={blindingData}
            reviewAttachmentLinkType={reviewAttachmentLinkType}
          />
        ) : null}
      </div>
    );
  }
}

export default withRouter(
  connect(
    createSelector(
      (state, props) => props.actionId,
      state => state.user,
      createGraphAclSelector(),
      createGraphDataSelector(),
      createActionMapSelector(),
      (actionId, user, acl, graphData, actionMap) => {
        const action = getWorkflowAction(actionId, { user, acl, actionMap });
        return { user, acl, graph: graphData && graphData.graph, action };
      }
    )
  )(ShellAttachment)
);
