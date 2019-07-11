import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, arrayify } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import {
  CONTACT_POINT_ADMINISTRATION,
  CONTACT_POINT_EDITORIAL_OFFICE,
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
import { updateUserContactPoint } from '../../actions/user-action-creators';

const ControlledPaperInput = withOnSubmit(PaperInput);

class SettingsEmail extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool.isRequired,
    // redux
    profile: PropTypes.object,
    updateUserContactPoint: PropTypes.func.isRequired,
    updateUserContactPointStatusMap: PropTypes.object.isRequired
  };

  static defaultProps = {
    profile: {}
  };

  handleChangeEmail(contactPointId, e) {
    const { updateUserContactPoint } = this.props;
    updateUserContactPoint(contactPointId, {
      email: `mailto:${e.target.value.trim()}`
    });
  }

  handleResendEmail(contactPointId, e) {
    const { updateUserContactPoint, profile } = this.props;
    const contactPoint = arrayify(profile.contactPoint).find(
      cp => getId(cp) === contactPointId
    );
    if (contactPoint) {
      updateUserContactPoint(contactPointId, {
        email: contactPoint.email
      });
    }
  }

  renderControls(contactPoint) {
    const { disabled, updateUserContactPointStatusMap } = this.props;
    const status = updateUserContactPointStatusMap[getId(contactPoint)] || {};

    const error = status.error && status.error.message;
    const isActive = !!status.isActive;
    const label =
      contactPoint.contactType === CONTACT_POINT_ADMINISTRATION
        ? 'Administrative email'
        : contactPoint.contactType === CONTACT_POINT_EDITORIAL_OFFICE
        ? 'Submission inquiry email'
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
    const { user, profile } = this.props;

    if (!getId(user) || !profile) return null;

    const contactPoints = arrayify(profile.contactPoint);
    const adminCp = contactPoints.find(
      cp => cp.contactType === CONTACT_POINT_ADMINISTRATION
    );
    const editorialOfficeCp = contactPoints.find(
      cp => cp.contactType === CONTACT_POINT_EDITORIAL_OFFICE
    );
    const generalCp = contactPoints.find(
      cp => cp.contactType === CONTACT_POINT_GENERAL_INQUIRY
    );

    const bem = bemify('settings-email');
    return (
      <div className={bem``}>
        <div className={bem`__content`}>
          <header className={bem`__header`}>
            <Iconoclass
              iconName="email"
              round={true}
              className={bem`__header-icon`}
              size={'3.2rem'}
            />
            <h2 className={bem`__header-text`}>Contact points</h2>
          </header>

          <section className={bem`__card-body`}>
            {/* The primary email cannot be changed, that's the email the user used for registration */}
            {!!adminCp && (
              <Fragment>
                <Notice>
                  <span>
                    The <strong>administrative</strong> email is the primary way
                    used by <TextLogo /> to notify you about important events or
                    activity related to your account.
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
                    publicly so that user having access to your profile can
                    contact you.
                  </span>
                </Notice>
                <div className={bem`__verified-email`}>
                  {this.renderControls(generalCp)}
                </div>
              </Fragment>
            )}

            {!!editorialOfficeCp && (
              <Fragment>
                <Notice>
                  <span>
                    The <strong>editorial office</strong> email is displayed
                    publicly in cases where you are involved in an editorial
                    office role (triaging incoming submissions) so that
                    prospective authors have an option to contact you.
                  </span>
                </Notice>
                <div className={bem`__verified-email`}>
                  {this.renderControls(editorialOfficeCp)}
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
    state => state.droplets[getId(state.user)],
    state => state.updateUserContactPointStatusMap,
    (profile, updateUserContactPointStatusMap) => {
      return { profile, updateUserContactPointStatusMap };
    }
  ),
  { updateUserContactPoint }
)(SettingsEmail);
