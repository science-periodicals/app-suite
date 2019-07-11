import React from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import Iconoclass from '@scipe/iconoclass';

export default class ProgrammingLanguage extends React.Component {
  constructor(props) {
    super(props);
    this.handleDelete = this.handleDelete.bind(this);
  }

  handleDelete(e) {
    const { programmingLanguage } = this.props;
    this.props.onDelete(programmingLanguage, e);
  }

  render() {
    const { id, programmingLanguage, readOnly, disabled } = this.props;

    return (
      <div id={id} className="programming-language" key={programmingLanguage}>
        {programmingLanguage.name && programmingLanguage.url ? (
          <a href={programmingLanguage.url} target="_blank">
            {programmingLanguage.name}
          </a>
        ) : (
          programmingLanguage.name || programmingLanguage
        )}
        {!readOnly && !disabled ? (
          <Iconoclass
            iconName="delete"
            behavior="button"
            onClick={this.handleDelete.bind(this, programmingLanguage)}
          />
        ) : (
          <div style={{ width: '24px', minWidth: '24px' }} />
        )}
      </div>
    );
  }
}

ProgrammingLanguage.defaultProps = {
  programmingLanguage: '',
  onDelete: noop
};

ProgrammingLanguage.propTypes = {
  id: PropTypes.string,
  programmingLanguage: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
    .isRequired,
  readOnly: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onDelete: PropTypes.func
};
