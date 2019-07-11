import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, arrayify } from '@scipe/jsonld';
import {
  CONTACT_POINT_ADMINISTRATION,
  CONTACT_POINT_GENERAL_INQUIRY
} from '@scipe/librarian';
import {
  PaperInput,
  bemify,
  ControlPanel,
  withOnSubmit,
  TextLogo,
  Menu,
  MenuItemLabel,
  MenuItem
} from '@scipe/ui';
import Notice from '../notice';
import { updateOrganizationContactPoint } from '../../actions/organization-action-creators';

const ControlledPaperInput = withOnSubmit(PaperInput);

class SettingsOrganizationContactPoints extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool.isRequired,
    organization: PropTypes.object,

    // redux
    updateOrganizationContactPoint: PropTypes.func.isRequired,
    updateOrganizationContactPointStatusMap: PropTypes.object.isRequired
  };

  static defaultProps = {
    organization: {}
  };

  handleChangeEmail(contactPointId, e) {
    const { updateOrganizationContactPoint } = this.props;
    updateOrganizationContactPoint(contactPointId, {
      email: `mailto:${e.target.value.trim()}`
    });
  }

  handleResendEmail(contactPointId, e) {
    const { updateOrganizationContactPoint, organization } = this.props;
    const contactPoint = arrayify(organization.contactPoint).find(
      cp => getId(cp) === contactPointId
    );
    if (contactPoint) {
      updateOrganizationContactPoint(contactPointId, {
        email: contactPoint.email
      });
    }
  }

  renderControls(contactPoint) {
    const { disabled, updateOrganizationContactPointStatusMap } = this.props;
    const status =
      updateOrganizationContactPointStatusMap[getId(contactPoint)] || {};

    const error = status.error && status.error.message;
    const isActive = !!status.isActive;
    const label =
      contactPoint.contactType === CONTACT_POINT_ADMINISTRATION
        ? 'Administrative email'
        : contactPoint.contactType === CONTACT_POINT_GENERAL_INQUIRY
        ? 'General inquiry email'
        : 'email';

    return (
      <Fragment>
        <ControlledPaperInput
          name={`email-${contactPoint.contactType}`}
          label={label}
          value={
            contactPoint.email && contactPoint.email.replace(/^mailto:/, '')
          }
          onSubmit={this.handleChangeEmail.bind(this, getId(contactPoint))}
          autoComplete="off"
          type="email"
          large={true}
          error={error}
          disabled={disabled || isActive}
        />
        <Menu
          align="right"
          portal={true}
          iconName={
            error
              ? 'warning'
              : contactPoint.verificationStatus === 'VerifiedVerificationStatus'
              ? 'check'
              : 'time'
          }
        >
          <MenuItemLabel>
            {error
              ? 'Error'
              : contactPoint.verificationStatus === 'VerifiedVerificationStatus'
              ? 'Verified email'
              : 'An email has been sent for validation'}
          </MenuItemLabel>
          {contactPoint.verificationStatus ===
            'UnverifiedVerificationStatus' && (
            <MenuItem
              iconName="email"
              disabled={disabled || isActive}
              divider={true}
              onClick={this.handleResendEmail.bind(this, getId(contactPoint))}
            >
              Resend verification email
            </MenuItem>
          )}
        </Menu>
      </Fragment>
    );
  }

  render() {
    const { user, organization } = this.props;

    if (!getId(user) || !organization) return null;

    const contactPoints = arrayify(organization.contactPoint);
    const adminCp = contactPoints.find(
      cp => cp.contactType === CONTACT_POINT_ADMINISTRATION
    );
    const generalCp = contactPoints.find(
      cp => cp.contactType === CONTACT_POINT_GENERAL_INQUIRY
    );

    const bem = bemify('settings-organization-contact-points');
    return (
      <div className={bem``}>
        <div className={bem`__content`}>
          <section className={bem`__card-body`}>
            {/* The primary email cannot be changed, that's the email the user used for registration */}
            {!!adminCp && (
              <Fragment>
                <Notice>
                  <span>
                    The <strong>administrative</strong> email is the primary way
                    used by <TextLogo /> to notify about important events or
                    activity related to the organization account.
                  </span>
                </Notice>
                <div className={bem`__verified-email`}>
                  {this.renderControls(adminCp)}
                </div>
              </Fragment>
            )}

            {!!generalCp && (
              <Fragment>
                <Notice>
                  <span>
                    The <strong>general inquiry</strong> email is displayed
                    publicly so that user can contact the organization.
                  </span>
                </Notice>
                <div className={bem`__verified-email`}>
                  {this.renderControls(generalCp)}
                </div>
              </Fragment>
            )}
          </section>
          <ControlPanel />
        </div>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.updateOrganizationContactPointStatusMap,
    updateOrganizationContactPointStatusMap => {
      return { updateOrganizationContactPointStatusMap };
    }
  ),
  { updateOrganizationContactPoint }
)(SettingsOrganizationContactPoints);
