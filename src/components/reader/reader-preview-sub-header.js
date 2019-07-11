import React from 'react';
import Iconoclass from '@scipe/iconoclass';
import { bemify } from '@scipe/ui';

export default class ReaderPreviewSubHeader extends React.Component {
  render() {
    const bem = bemify('reader-preview-sub-header');

    return (
      <div className={bem``}>
        <Iconoclass
          iconName="warning"
          round={true}
          size="1.6rem"
          className={bem`__icon`}
        />
        <span className={bem`__text`}>
          <span>
            You are viewing a production <strong>preview</strong>. Links
            (including permalinks) may change and should not be shared.
          </span>
        </span>
      </div>
    );
  }
}
