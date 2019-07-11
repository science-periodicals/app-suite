import React from 'react';
import PropTypes from 'prop-types';
import { AutoAbridge } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import {
  COMMENT,
  REVIEWER_COMMENT,
  ENDORSER_COMMENT,
  REVISION_REQUEST_COMMENT,
  ERROR,
  WARNING,
  ERROR_MISSING_VALUE,
  ERROR_NEED_AUTHOR_RESPONSE
} from '../constants';

const HEADER_TITLES = {
  [COMMENT]: 'Comment',
  [ENDORSER_COMMENT]: 'Endorser Comment',
  [REVIEWER_COMMENT]: 'Reviewer Note',
  [REVISION_REQUEST_COMMENT]: 'Revision Request',
  [WARNING]: 'Potential Action',
  [ERROR]: 'Action Required'
};

const ICON_NAMES = {
  [COMMENT]: 'comment',
  [ENDORSER_COMMENT]: 'thumbUpWarning',
  [REVIEWER_COMMENT]: 'attachment',
  [REVISION_REQUEST_COMMENT]: 'feedbackWrite',
  [ERROR]: 'statusError',
  [WARNING]: 'statusWarning'
};

export default class AnnotationHeader extends React.Component {
  static propTypes = {
    annotation: PropTypes.object.isRequired,
    identifier: PropTypes.oneOfType([PropTypes.string, PropTypes.element])
      .isRequired
  };

  render() {
    const {
      annotation: { type, object },
      identifier
    } = this.props;

    return (
      <header className={`annotation-header annotation-header--${type}`}>
        <AutoAbridge ellipsis={true} className="annotation-header__title">
          {type === ERROR && object === ERROR_MISSING_VALUE
            ? 'Required value'
            : type === ERROR && object === ERROR_NEED_AUTHOR_RESPONSE
            ? 'Required response'
            : HEADER_TITLES[type]}
        </AutoAbridge>

        <span className="annotation-header__menu">
          <span className={'annotation-header__menu__counter'}>
            {identifier}
          </span>
          <Iconoclass iconName={ICON_NAMES[type]} iconSize={16} />
        </span>
      </header>
    );
  }
}
