import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import { BemTags, Stepper, StepperItem } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import {
  updateProfile,
  fetchProfile
} from '../../actions/user-action-creators';
import SettingsProfileBio from './settings-profile-bio';
import SettingsProfileSubjects from './settings-profile-subjects';
import SettingsProfileAffiliations from './settings-profile-affiliations';

const CATEGORIES = ['bio', 'subjects', 'affiliations'];

class SettingsProfile extends Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool.isRequired,

    history: PropTypes.object.isRequired,
    match: PropTypes.shape({
      params: PropTypes.shape({
        category: PropTypes.oneOf(CATEGORIES).isRequired // settings category
      })
    }),

    // redux
    profile: PropTypes.object,
    updateProfileStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }),
    fetchProfile: PropTypes.func.isRequired,
    updateProfile: PropTypes.func.isRequired
  };

  componentDidMount() {
    const { fetchProfile, user } = this.props;
    if (getId(user)) {
      fetchProfile(getId(user));
    }
  }

  componentDidUpdate(prevProps) {
    const { fetchProfile, user } = this.props;
    if (getId(user) !== getId(prevProps.user)) {
      fetchProfile(getId(user));
    }
  }

  handleChangeActiveStep = activeStep => {
    const { history } = this.props;
    history.push({
      pathname: `/settings/profile/${CATEGORIES[activeStep] || 'bio'}`
    });
  };

  render() {
    const bem = BemTags();

    const {
      user,
      profile,
      disabled,
      updateProfile,
      updateProfileStatus,
      match: {
        params: { category }
      }
    } = this.props;

    if (!profile) {
      return null;
    }

    return (
      <div className={bem`settings-profile`}>
        <div className={bem`content`}>
          <header className={bem`card-header`}>
            <Iconoclass
              iconName="personOutline"
              round={true}
              className={bem`header-icon`}
              size={'3.2rem'}
            />
            <h2 className={bem`card-header-text`}>Public profile</h2>
          </header>

          <div className={bem`card-body`}>
            <Stepper
              direction="horizontal"
              activeStep={CATEGORIES.findIndex(
                _category => _category === category
              )}
              onChange={this.handleChangeActiveStep}
            >
              <StepperItem title="Bio" icon="person">
                <SettingsProfileBio
                  user={user}
                  disabled={disabled}
                  profile={profile}
                  updateProfileStatus={updateProfileStatus}
                  updateProfile={updateProfile}
                />
              </StepperItem>

              <StepperItem title="Subjects" icon="label">
                <SettingsProfileSubjects
                  user={user}
                  disabled={disabled}
                  profile={profile}
                  updateProfileStatus={updateProfileStatus}
                  updateProfile={updateProfile}
                />
              </StepperItem>

              <StepperItem title="Affiliations" icon="locationCity">
                <SettingsProfileAffiliations
                  user={user}
                  disabled={disabled}
                  profile={profile}
                  updateProfileStatus={updateProfileStatus}
                  updateProfile={updateProfile}
                />
              </StepperItem>
            </Stepper>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.droplets[getId(state.user)],
    state => state.updateProfileStatus,
    (profile, updateProfileStatus) => {
      return { profile, updateProfileStatus };
    }
  ),
  {
    updateProfile,
    fetchProfile
  }
)(SettingsProfile);
