import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ControlPanel, PaperButton } from '@scipe/ui';
import { activateCommentAction } from '../../actions/comment-action-creators';

class ActivateOfflineCommentInfo extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    annotation: PropTypes.shape({
      selector: PropTypes.shape({
        selectedItem: PropTypes.string.isRequired // the commentAction id
      })
    }).isRequired,

    // redux;
    isOffline: PropTypes.bool,
    activateCommentAction: PropTypes.func.isRequired
  };

  handleActivate = e => {
    const {
      graphId,
      annotation: {
        selector: { selectedItem: commentActionId }
      },
      activateCommentAction
    } = this.props;

    activateCommentAction(graphId, commentActionId);
  };

  render() {
    const { isOffline } = this.props;

    return (
      <div className="activate-offline-comment-info">
        <p>Offline draft</p>

        {!isOffline && (
          <ControlPanel>
            <PaperButton onClick={this.handleActivate}>Submit</PaperButton>
          </ControlPanel>
        )}
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.isOffline,
    isOffline => {
      return { isOffline };
    }
  ),
  { activateCommentAction }
)(ActivateOfflineCommentInfo);
