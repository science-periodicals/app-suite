import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isUrl from 'is-url';
import pick from 'lodash/pick';
import { arrayify } from '@scipe/jsonld';
import {
  PaperInput,
  RichTextarea,
  BemTags,
  ControlPanel,
  withOnSubmit,
  RE_TWITTER,
  RE_FACEBOOK,
  RE_ORCID
} from '@scipe/ui';
import { StyleSection, StyleGroup, StyleSectionTitle } from './settings';

const ControledPaperInput = withOnSubmit(PaperInput);

export default class SettingsProfileBio extends Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,

    profile: PropTypes.object.isRequired,
    updateProfileStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }),
    updateProfile: PropTypes.func.isRequired
  };

  handleSubmit = e => {
    e.preventDefault();
    this.props.updateProfile(
      pick(this.state, [
        'givenName',
        'familyName',
        'name',
        'description',
        'url'
      ])
    );
  };

  handleChange = e => {
    const { updateProfile } = this.props;
    updateProfile({
      [e.target.name]: e.target.value
    });
  };

  handleSocialMediaChange = e => {
    const { profile, updateProfile } = this.props;

    if (e.target.validity.valid) {
      let nextSameAs;
      let value = e.target.value;
      switch (e.target.name) {
        case 'twitter':
          nextSameAs = arrayify(profile.sameAs)
            .filter(uri => !RE_TWITTER.test(uri))
            .concat(
              `https://twitter.com/${(value || '')
                .replace(RE_TWITTER, '')
                .replace(/^(\/)?@/, '')}`
            );
          break;
        case 'facebook':
          nextSameAs = arrayify(profile.sameAs)
            .filter(uri => !RE_FACEBOOK.test(uri))
            .concat(value);
          break;
        case 'orcid':
          nextSameAs = arrayify(profile.sameAs)
            .filter(uri => !RE_ORCID.test(uri))
            .concat(value);
          break;

        default:
          break;
      }

      if (nextSameAs) {
        updateProfile({ sameAs: nextSameAs });
      }
    }
  };

  render() {
    const bem = BemTags();

    const {
      user,
      profile,
      disabled,
      readOnly,
      updateProfileStatus: { active, error }
    } = this.props;

    const orcidUrl =
      arrayify(profile.sameAs).find(uri => RE_ORCID.test(uri)) || '';
    const facebookUrl =
      arrayify(profile.sameAs).find(uri => RE_FACEBOOK.test(uri)) || '';
    const twitterUrl =
      arrayify(profile.sameAs).find(uri => RE_TWITTER.test(uri)) || '';
    const twitterHandle = twitterUrl.split('/')[3] || '';

    return (
      <section className={bem`settings-profile-bio`}>
        <StyleGroup>
          <ControledPaperInput
            name="username"
            label="username"
            autoComplete="off"
            value={user.username}
            disabled={true}
            readOnly={true}
          />
          <ControledPaperInput
            name="givenName"
            label="given name"
            autoComplete="off"
            value={profile.givenName}
            disabled={disabled}
            onSubmit={this.handleChange}
          />
          <ControledPaperInput
            name="familyName"
            label="family name"
            autoComplete="off"
            value={profile.familyName}
            disabled={disabled}
            onSubmit={this.handleChange}
          />
          <ControledPaperInput
            name="name"
            label="display name"
            autoComplete="off"
            value={profile.name}
            disabled={disabled}
            onSubmit={this.handleChange}
          />
          <RichTextarea
            name="description"
            label="bio"
            disabled={disabled}
            defaultValue={profile.description}
            onSubmit={this.handleChange}
          />
          <ControledPaperInput
            name="url"
            label="homepage"
            autoComplete="off"
            type="url"
            disabled={disabled}
            value={profile.url}
            error={
              profile.url && !isUrl(profile.url) ? 'invalid URL' : undefined
            }
            onSubmit={this.handleChange}
          />

          <ControledPaperInput
            name="orcid"
            label="ORCID URL"
            autoComplete="off"
            type="url"
            disabled={disabled}
            value={orcidUrl}
            pattern="^http(s)?:\/\/(www\.)?orcid.org\/.*"
            onSubmit={this.handleSocialMediaChange}
          />
        </StyleGroup>

        <StyleSection>
          <StyleSectionTitle>Social Media</StyleSectionTitle>
          <ControledPaperInput
            name="twitter"
            label="Twitter handle"
            value={twitterHandle}
            disabled={disabled}
            readOnly={readOnly}
            pattern="^@?(\w){1,15}$"
            type="text"
            onSubmit={this.handleSocialMediaChange}
          />
          <ControledPaperInput
            name="facebook"
            label="Facebook URL"
            value={facebookUrl}
            disabled={disabled}
            readOnly={readOnly}
            type="url"
            pattern="^http(s)?:\/\/(www\.)?facebook.com\/.*"
            onSubmit={this.handleSocialMediaChange}
          />
        </StyleSection>

        <ControlPanel error={error} />
      </section>
    );
  }
}
