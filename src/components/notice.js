import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { ResourceDownloadMenu } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

export default class Notice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string,
    iconName: PropTypes.string,
    children: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.string,
      PropTypes.element
    ])
  };

  static defaultProps = {
    iconName: 'info'
  };

  render() {
    const { id, className, iconName, children } = this.props;

    return (
      <div
        id={id}
        className={classNames('notice', 'sa__type-notice', className)}
        data-testid={this.props['data-testid']}
      >
        <Iconoclass
          iconName={iconName}
          round={
            iconName == 'info' ||
            iconName == 'time' ||
            iconName === 'warningTriangle'
              ? false
              : true
          }
          size="18px"
          className="notice__icon"
        />
        {children}
      </div>
    );
  }
}

export class AnonymousSectionNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string
  };

  render() {
    const { id, className } = this.props;
    return (
      <Notice
        id={id}
        className={classNames(
          'anonymous-section-notice',
          'sa__type-notice',
          className
        )}
        data-testid={this.props['data-testid']}
        iconName="anonymous"
      >
        This section is not displayed to preserve author anonymity.
      </Notice>
    );
  }
}

export class StatusNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string,
    children: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.string,
      PropTypes.element
    ])
  };

  render() {
    const { id, className, children } = this.props;
    return (
      <Notice
        id={id}
        className={classNames('status-notice', className)}
        data-testid={this.props['data-testid']}
      >
        {children}
      </Notice>
    );
  }
}

export class WarningNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string,
    children: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.string,
      PropTypes.element
    ])
  };

  render() {
    const { id, className, children } = this.props;
    return (
      <Notice
        id={id}
        iconName="warningTriangle"
        className={classNames(
          'status-notice',
          'status-notice--warning',
          className
        )}
        data-testid={this.props['data-testid']}
      >
        {children}
      </Notice>
    );
  }
}

export class NoAccessNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string
  };

  render() {
    const { id, className } = this.props;

    return (
      <Notice
        id={id}
        iconName="lock"
        className={classNames('no-access-notice', className)}
        data-testid={this.props['data-testid']}
      >
        You do not have access to the content of this section
      </Notice>
    );
  }
}

export class CanceledNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string
  };

  render() {
    const { id, className } = this.props;

    return (
      <Notice
        id={id}
        className={classNames('no-access-notice', className)}
        data-testid={this.props['data-testid']}
      >
        This action was canceled
      </Notice>
    );
  }
}

export class NoRenderingNotice extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    'data-testid': PropTypes.string,
    // Note: specifying `resource` will add a Download menu
    // if `resource` is provided it must be hydrated (at least for `hasPart` in case of multi part figure and `encoding` | `distribution`
    resource: PropTypes.shape({
      '@type': PropTypes.string,
      // `hasPart` is needed for multi part figures
      hasPart: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.object),
        PropTypes.object
      ]),
      encoding: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.object),
        PropTypes.object
      ]),
      distribution: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.object),
        PropTypes.object
      ])
    })
  };

  render() {
    const { id, className, resource } = this.props;

    return (
      <Notice
        id={id}
        className={classNames('no-rendering-notice', className)}
        data-testid={this.props['data-testid']}
      >
        No rendering available.
        {!!resource && (
          <ResourceDownloadMenu
            className="no-rendering-notice__menu"
            resource={resource}
            title="Download"
          />
        )}
      </Notice>
    );
  }
}
