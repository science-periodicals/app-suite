import React from 'react';
import PropTypes from 'prop-types';
import Notice from '../notice';
import { bemify } from '@scipe/ui';
import { StyleNoticeContent, StyleNoticeTaskList } from './settings';

export default class SettingsJournalBlockingErrorNotice extends React.Component {
  static propTypes = {
    errors: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        message: PropTypes.oneOfType([PropTypes.string, PropTypes.element])
          .isRequired
      })
    )
  };

  render() {
    const { errors } = this.props;
    if (!errors || !errors.length) {
      return null;
    }
    const bem = new bemify('settings-journal');
    return (
      <Notice iconName="warning">
        <StyleNoticeContent>
          <p>
            The journal is not setup to be publicly visible and accept incoming
            submission:
          </p>
          <StyleNoticeTaskList>
            {errors.map(error => (
              <li key={error.key}>{error.message}</li>
            ))}
          </StyleNoticeTaskList>
        </StyleNoticeContent>
      </Notice>
    );
  }
}
