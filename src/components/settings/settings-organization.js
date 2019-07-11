import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, textify, unprefix } from '@scipe/jsonld';
import {
  Stepper,
  StepperItem,
  OrganizationBadge,
  BemTags,
  Divider
} from '@scipe/ui';
import { fetchOrganization } from '../../actions/organization-action-creators';
import SettingsOrganizationMetadata from './settings-organization-metadata';
import SettingsOrganizationContactPoints from './settings-organization-contact-points';
import SettingsOrganizationAdmins from './settings-organization-admins';
import SettingsOrganizationService from './settings-organization-service';
import SettingsOrganizationPayments from './settings-organization-payments';
import SettingsOrganizationBilling from './settings-organization-billing';

const CATEGORIES = [
  'organization',
  'contact-points',
  'admins',
  'billing',
  'payments',
  'services'
];

class SettingsOrganization extends Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    history: PropTypes.object,
    match: PropTypes.shape({
      params: PropTypes.shape({
        organizationId: PropTypes.string.isRequired,
        category: PropTypes.oneOf(CATEGORIES).isRequired
      })
    }),
    user: PropTypes.object.isRequired,
    organization: PropTypes.object,
    fetchOrganization: PropTypes.func
  };

  componentDidMount() {
    const {
      match: {
        params: { organizationId }
      },
      fetchOrganization
    } = this.props;
    fetchOrganization(`org:${organizationId}`);
  }

  componentDidUpdate(prevProps) {
    const {
      match: {
        params: { organizationId }
      }
    } = this.props;

    if (organizationId !== prevProps.match.params.organizationId) {
      this.props.fetchOrganization(organizationId);
      this.setState({ activeStep: 0 });
    }
  }

  handleChangeActiveStep = activeStep => {
    const { history, organization } = this.props;
    history.push({
      pathname: `/settings/organization/${unprefix(
        getId(organization)
      )}/${CATEGORIES[activeStep] || 'organization'}`
    });
  };

  render() {
    const bem = BemTags();

    const {
      user,
      organization,
      match: { params },
      disabled
    } = this.props;

    if (!organization) return null;

    return (
      <section className={bem`settings-organization`}>
        <h2 className={bem`organization-title`}>
          <OrganizationBadge organization={organization} size={32} />{' '}
          {`${unprefix(getId(organization))} - ${textify(organization.name) ||
            'unnamed'}`}
        </h2>
        <Divider />
        <div className={bem`body`}>
          <Stepper
            direction="horizontal"
            activeStep={CATEGORIES.findIndex(
              category => category === params.category
            )}
            onChange={this.handleChangeActiveStep}
          >
            <StepperItem title="About" icon="organization">
              <SettingsOrganizationMetadata
                disabled={disabled}
                organization={organization}
              />
            </StepperItem>

            <StepperItem title="Contact Points" icon="email">
              <SettingsOrganizationContactPoints
                user={user}
                disabled={disabled}
                organization={organization}
              />
            </StepperItem>

            <StepperItem title="Admins" icon="admin">
              <SettingsOrganizationAdmins
                user={user}
                disabled={disabled}
                organization={organization}
              />
            </StepperItem>

            <StepperItem title="Billing" icon="money">
              <SettingsOrganizationBilling
                user={user}
                organization={organization}
                disabled={disabled}
              />
            </StepperItem>

            <StepperItem title="Payments" icon="priceTag">
              <SettingsOrganizationPayments
                user={user}
                organization={organization}
                disabled={disabled}
              />
            </StepperItem>

            <StepperItem title="Services" icon="extension">
              <SettingsOrganizationService
                disabled={disabled}
                organization={organization}
                params={params}
              />
            </StepperItem>
          </Stepper>
        </div>
      </section>
    );
  }
}

export default connect(
  createSelector(
    state => state.droplets,
    (state, props) => props.match.params.organizationId,
    (droplets, organizationId) => {
      return {
        organization: droplets[`org:${organizationId}`]
      };
    }
  ),
  {
    fetchOrganization
  }
)(SettingsOrganization);
