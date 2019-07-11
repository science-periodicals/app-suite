import React, { Component } from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { getId, unprefix } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import { BemTags } from '@scipe/ui';
import spdxLicenseList from 'spdx-license-list';

// TODO move to @scipe/ui

export default class License extends Component {
  static propTypes = {
    id: PropTypes.string,
    license: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    onDelete: PropTypes.func
  };

  static defaultProps = {
    onDelete: noop
  };

  constructor(props) {
    super(props);
    this.handleDelete = this.handleDelete.bind(this);
  }

  handleDelete(e) {
    const { license } = this.props;
    this.props.onDelete(license);
  }

  renderLicense(bem) {
    const { license } = this.props;
    const licenseId = getId(license);
    if (!licenseId) {
      // should never happen
      return <span>unknown license</span>;
    }
    const spdxId = unprefix(licenseId);
    if (spdxId in spdxLicenseList) {
      const spdxLicense = spdxLicenseList[spdxId];
      const isCC = /^CC/.test(spdxId);
      return (
        <span className={bem`info`}>
          <a
            className={bem`info-id`}
            href={spdxLicense.url.split('\n')[0]}
            target="_blank"
          >
            {spdxId}
          </a>
          <span className={bem`info-name`}>{spdxLicense.name}</span>
          {spdxLicense.osiApproved ? (
            <span className={bem`info-badge`}>OSI Approved</span>
          ) : (
            <span className={bem`info-badge-spacer`} />
          )}
          {isCC ? (
            <span className={bem`info-badge`}>Creative Commons</span>
          ) : (
            <span className={bem`info-badge-spacer`} />
          )}
        </span>
      );
    } else {
      // custom URL
      return <a href={licenseId}>{licenseId}</a>;
    }
  }

  render() {
    const { readOnly, disabled, id } = this.props;
    const bem = BemTags();

    return (
      <div id={id} className={bem`license`}>
        {this.renderLicense(bem)}
        {!readOnly ? (
          <Iconoclass
            iconName="delete"
            behavior="button"
            disabled={disabled}
            onClick={this.handleDelete}
          />
        ) : (
          <div style={{ width: '32px', minWidth: '32px' }} />
        )}
      </div>
    );
  }
}
