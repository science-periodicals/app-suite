import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getValue, createValue, getId, unprefix } from '@scipe/jsonld';
import { createId } from '@scipe/librarian';
import {
  PaperInput,
  ControlPanel,
  BemTags,
  CountriesAutocomplete,
  withOnSubmit
} from '@scipe/ui';
import { updateOrganization } from '../../actions/organization-action-creators';

const ControlledPaperInput = withOnSubmit(PaperInput);

class SettingsOrganizationMetadata extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    status: PropTypes.shape({
      status: PropTypes.string,
      error: PropTypes.instanceOf(Error)
    }),
    updateOrganization: PropTypes.func,
    organization: PropTypes.object
  };

  static defaultProps = {
    status: {}
  };

  constructor(props) {
    super(props);
    this.autocomplete = null;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.organization !== this.props.organization) {
      if (this.autocomplete) {
        this.autocomplete.reset();
      }
    }
  }

  handleSubmitMetadata = e => {
    const { organization } = this.props;

    this.props.updateOrganization(getId(organization), {
      [e.target.name]: createValue(e.target.value)
    });
  };

  handleCountryAutocomplete = (value, item) => {
    const { organization } = this.props;
    if (item) {
      this.props.updateOrganization(getId(organization), {
        location: {
          '@id': getId(organization.location) || createId('blank')['@id'],
          '@type': 'PostalAddress',
          addressCountry: item.name
        }
      });
    }
  };

  render() {
    const {
      organization,
      status: { status, error },
      disabled: _disabled
    } = this.props;

    const bem = BemTags();

    if (!organization) return null;

    const { name = '', location: { addressCountry = '' } = {} } = organization;

    const disabled = _disabled || status === 'active';

    return (
      <section className={bem`settings-organization-metadata`}>
        <div className={bem`form-group`}>
          <PaperInput
            label="slug"
            name="slug"
            autoComplete="off"
            value={unprefix(getId(organization))}
            disabled={true}
            large={true}
          />
          <ControlledPaperInput
            label="name"
            name="name"
            autoComplete="off"
            value={getValue(name || '')}
            onSubmit={this.handleSubmitMetadata}
            disabled={disabled}
            large={true}
            className={bem`name-input`}
          />
          <CountriesAutocomplete
            name="addressCountry"
            ref={n => (this.autocomplete = n)}
            initialValue={addressCountry || ''}
            onSubmit={this.handleCountryAutocomplete}
            disabled={disabled}
            className={bem`country-input`}
          />
        </div>
        <ControlPanel error={error} />
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) =>
      state.updateOrganizationStatusMap[getId(props.organization)],
    status => {
      return {
        status
      };
    }
  ),
  {
    updateOrganization
  }
)(SettingsOrganizationMetadata);
