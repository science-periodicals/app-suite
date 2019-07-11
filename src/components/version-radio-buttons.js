import React from 'react';
import PropTypes from 'prop-types';
import { Version, bemify } from '@scipe/ui';
import { getDisplayVersion } from '../utils/graph-utils';
import classNames from 'classnames';

export default class VersionRadioButtons extends React.Component {
  static propTypes = {
    prevVersion: PropTypes.string.isRequired,
    currVersion: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
  };

  handleClick(nextValue, e) {
    this.props.onChange(nextValue);
  }

  render() {
    const { prevVersion, currVersion, value } = this.props;

    const bem = bemify('version-radio-buttons');

    return (
      <div className={bem``}>
        <label
          className={classNames(bem`__option`, {
            [bem`__option--active`]: value === prevVersion
          })}
        >
          <input
            className={bem`__radio-input`}
            type="radio"
            name="version"
            id={prevVersion}
            autoComplete="off"
            onChange={this.handleClick.bind(this, prevVersion)}
            checked={value === prevVersion}
          />
          <Version type="prev">
            {getDisplayVersion(prevVersion, { semverLight: true })}
          </Version>
        </label>
        <label
          className={classNames(bem`__option`, {
            [bem`__option--active`]: value === currVersion
          })}
        >
          <input
            className={bem`__radio-input`}
            type="radio"
            name="version"
            id={currVersion}
            autoComplete="off"
            onChange={this.handleClick.bind(this, currVersion)}
            checked={value === currVersion}
          />
          <Version type="current">
            {getDisplayVersion(currVersion, { semverLight: true })}
          </Version>
        </label>
      </div>
    );
  }
}
