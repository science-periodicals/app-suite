import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { BemTags } from '@scipe/ui';

export default class MetaMarginContent extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    children: PropTypes.any,
    divider: PropTypes.bool
  };

  static defaultProps = {
    divider: false
  };

  render() {
    const { id, className, children, divider } = this.props;
    const bem = BemTags();

    // if children is a function MetaMargin bound it so that it has interesting properties
    return (
      <div
        id={id}
        className={
          bem`meta-margin-content ${divider ? '--divider' : ''}` +
          classNames(className)
        }
      >
        {/*typeof children === 'function' ? children() : children*/}
        {typeof children === 'function' ? children() : children}
      </div>
    );
  }
}
