import React from 'react';
import PropTypes from 'prop-types';
import Iconoclass from '@scipe/iconoclass';
import { BemTags, Card, Modal } from '@scipe/ui';
import PreSubmissionComment from './pre-submission-comment';

export default class PreSubmissionCommentModal extends React.Component {
  static propTypes = {
    comment: PropTypes.object,
    onClose: PropTypes.func.isRequired
  };

  render() {
    const bem = BemTags();
    const { comment, onClose } = this.props;

    return (
      <Modal>
        <Card className={bem`pre-submission-comment-modal`}>
          <div className={bem`__header`}>
            <div className={bem`__header-group`}>
              <Iconoclass
                iconName="info"
                round={false}
                size="2.4rem"
                className={bem`__info-icon`}
              />
              <h4 className={bem`__title`}>Start a submission</h4>
            </div>
            <Iconoclass iconName="delete" onClick={onClose} behavior="button" />
          </div>
          <PreSubmissionComment comment={comment} />
        </Card>
      </Modal>
    );
  }
}
