import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import Iconoclass from '@scipe/iconoclass';
import { openShell } from '../../actions/ui-action-creators';

class ShellLink extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    type: PropTypes.oneOf(['comments', 'attachment', 'resource', 'submission'])
      .isRequired, // TODO more type (see <Shell />)
    nodeId: PropTypes.string.isRequired, // see `openShell` in ui-action-creators
    hash: PropTypes.string,
    children: PropTypes.any.isRequired,
    params: PropTypes.object, // see `openShell` in ui-action-creators
    iconName: PropTypes.string,
    theme: PropTypes.oneOf(['link', 'button']),
    // redux
    openShell: PropTypes.func.isRequired
  };

  static defaultProps = {
    theme: 'button',
    iconName: 'shell',
    hash: '#'
  };

  handleClick = e => {
    const { openShell, type, nodeId, params } = this.props;
    e.preventDefault();

    openShell(type, nodeId, { params });
  };

  render() {
    const { id, className, iconName, hash, children, theme } = this.props;

    return (
      <a
        id={id}
        className={classNames('shell-link', className, {
          'shell-link--button': theme === 'button'
        })}
        href={hash}
        onClick={this.handleClick}
      >
        {children}
        <Iconoclass tagName="span" iconName={iconName} iconSize={12} />
      </a>
    );
  }
}

export default connect(
  null,
  { openShell }
)(ShellLink);
