import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import Iconoclass from '@scipe/iconoclass';
import Notice from './notice';
import ScrollLink from './scroll-link';
import { prettifyLocation } from '../utils/annotations';

class ShellEditor extends React.Component {
  static propTypes = {
    connectedComponent: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.element,
      PropTypes.func
    ]),
    hash: PropTypes.string, // the hash (id) of the content being edited (to provide scroll back link)
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,
    params: PropTypes.object,

    // react router
    location: PropTypes.object
  };

  static defaultProps = {
    params: {}
  };

  render() {
    const {
      connectedComponent: ConnectedComponent,
      params,
      disabled,
      readOnly,
      hash,
      location
    } = this.props;

    return (
      <div className="shell-editor">
        {!!hash && (
          <Notice>
            <span className="shell-editor__notice-text">
              You are editing&nbsp;
              <ScrollLink
                className="shell-editor__notice-link"
                to={{
                  pathname: location.pathname,
                  search: location.search,
                  hash: hash
                }}
              >
                {prettifyLocation(hash)}{' '}
                <Iconoclass
                  iconName="openInBrowser"
                  className="shell-editor__notice-link-icon"
                  size="15px"
                />
              </ScrollLink>
            </span>
          </Notice>
        )}

        <ConnectedComponent
          {...params}
          disabled={disabled}
          readOnly={readOnly}
        />
      </div>
    );
  }
}

export default withRouter(ShellEditor);
