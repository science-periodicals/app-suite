import React from 'react';
import PropTypes from 'prop-types';
import { Divider } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

export default class ReceivedAttachmentContainer extends React.Component {
  static propTypes = {
    children: PropTypes.any
  };

  render() {
    const { children } = this.props;
    return (
      <section className="received-attachment-container">
        {/* <Divider type="major" size={2} marginTop={20} marginBottom={20} /> */}
        <div className="received-attachment-container__title">
          <span>Inbound Resources</span>
          <Iconoclass
            iconName="inbound"
            className="received-attachment-container__icon"
            size="18px"
          />
        </div>
        {children}
      </section>
    );
  }
}
