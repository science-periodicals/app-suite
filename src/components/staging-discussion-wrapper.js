import React from 'react';
import PropTypes from 'prop-types';
import { Divider, bemify } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

export default class StagingDiscussionWrapper extends React.Component {
  static propTypes = {
    children: PropTypes.element
  };

  render() {
    const { children } = this.props;

    const bem = bemify('staging-discussion-wrapper');

    return (
      <div className={bem``}>
        <Divider type="major" marginTop={40} marginBottom={10} />
        <div className="selectable-indent">
          <h3 className={bem`__title`}>
            <Iconoclass
              iconName="feedback"
              className={bem`__title-icon`}
              size="20px"
            />
            Staging Discussion
          </h3>

          {children}
        </div>
      </div>
    );
  }
}
