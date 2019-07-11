import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import pick from 'lodash/pick';
import { arrayify, getId } from '@scipe/jsonld';
import { BemTags, SubjectEditor } from '@scipe/ui';
import Notice from '../notice';

import { StyleSection } from './settings';

class SettingsProfileSubjects extends Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    profile: PropTypes.object.isRequired,
    updateProfile: PropTypes.func.isRequired,
    updateProfileStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }),

    // redux
    semanticTagsMap: PropTypes.object
  };

  static defaultProps = {
    semanticTagsMap: {}
  };

  handleAddSubject = subject => {
    const { profile, semanticTagsMap, updateProfile } = this.props;
    const subjectId = getId(subject);
    if (subjectId && !(subjectId in semanticTagsMap)) {
      const upd = {
        knowsAbout: arrayify(profile.knowsAbout)
          .filter(about => getId(about) !== getId(subject))
          .concat(pick(subject, ['@id', '@type', 'name']))
      };

      updateProfile(upd);
    }
  };

  handleDeleteSubject = subjects => {
    const { profile, updateProfile } = this.props;
    const deletedIds = new Set(
      arrayify(subjects)
        .map(subject => getId(subject))
        .filter(Boolean)
    );

    if (deletedIds.size) {
      const upd = {
        knowsAbout: arrayify(profile.knowsAbout).filter(
          about => !deletedIds.has(getId(about))
        )
      };
      updateProfile(upd);
    }
  };

  render() {
    const bem = BemTags();

    const {
      profile,
      semanticTagsMap,
      disabled,
      readOnly,
      updateProfileStatus
    } = this.props;

    return (
      <section className={bem`settings-profile-subjects`}>
        <StyleSection>
          <Notice>List subjects that you know about.</Notice>

          <SubjectEditor
            entity={profile}
            disabled={disabled || updateProfileStatus.active}
            readOnly={readOnly}
            semanticTagsMap={semanticTagsMap}
            onAdd={this.handleAddSubject}
            onDelete={this.handleDeleteSubject}
          />
        </StyleSection>
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.profile,
    profile => {
      const semanticTagsMap = arrayify(profile && profile.knowsAbout)
        .filter(tag => {
          const tagId = getId(tag);
          return tagId && tagId.startsWith('subjects:');
        })
        .reduce((semanticTagsMap, semanticTag) => {
          semanticTagsMap[getId(semanticTag)] = semanticTag;
          return semanticTagsMap;
        }, {});

      return {
        semanticTagsMap
      };
    }
  )
)(SettingsProfileSubjects);
