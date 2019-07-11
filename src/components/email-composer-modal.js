import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Modal, Card } from '@scipe/ui';
import EmailComposer from './email-composer';
import { deleteEmailComposerData } from '../actions/email-action-creators';

class EmailComposerModal extends React.Component {
  static propTypes = {
    onAction: PropTypes.func.isRequired,

    // redux
    action: PropTypes.object,
    deleteEmailComposerData: PropTypes.func.isRequired
  };

  handleCancel = () => {
    this.props.deleteEmailComposerData();
  };

  handleAction = action => {
    this.props.onAction(action);
    this.props.deleteEmailComposerData();
  };

  render() {
    const { action } = this.props;
    if (!action) return null;

    return (
      <Modal>
        <Card className="email-composer-modal">
          <EmailComposer
            action={action}
            onCancel={this.handleCancel}
            onAction={this.handleAction}
          />
        </Card>
      </Modal>
    );
  }
}

export default connect(
  createSelector(
    state => state.emailComposerData,
    action => ({ action })
  ),
  {
    deleteEmailComposerData
  }
)(EmailComposerModal);
