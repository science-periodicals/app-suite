import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { unprefix, arrayify, getId, getValue } from '@scipe/jsonld';
import { createId } from '@scipe/librarian';
import {
  RichTextarea,
  PaperInput,
  BemTags,
  Divider,
  SubjectEditor,
  PostalAddressFormFragment,
  withOnSubmit
} from '@scipe/ui';
import JournalSocialMediaEditor from '../journal-social-media-editor';
import {
  updateJournal,
  addJournalSubject,
  deleteJournalSubject
} from '../../actions/journal-action-creators';
import { StyleSection, StyleGroup, StyleSectionTitle } from './settings';

const ControlledPaperInput = withOnSubmit(PaperInput);

class SettingsJournalMetadata extends Component {
  static propTypes = {
    user: PropTypes.object,
    acl: PropTypes.object,
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    journal: PropTypes.object,

    // redux
    semanticTagsMap: PropTypes.object,
    updateJournal: PropTypes.func,
    addJournalSubject: PropTypes.func.isRequired,
    deleteJournalSubject: PropTypes.func.isRequired
  };

  static defaultProps = {
    semanticTagsMap: {},
    journal: {}
  };

  handleUpdateMetadata = e => {
    const { journal } = this.props;
    e.preventDefault && e.preventDefault();

    this.props.updateJournal(getId(journal), {
      [e.target.name]: e.target.value
    });
  };

  handleAddSubject = subject => {
    const { journal, semanticTagsMap } = this.props;
    const subjectId = getId(subject);
    if (subjectId && !(subjectId in semanticTagsMap)) {
      this.props.addJournalSubject(journal, subject);
    }
  };

  handleDeleteSubject = subjects => {
    const { journal } = this.props;
    const subjectIds = arrayify(subjects)
      .map(subject => getId(subject))
      .filter(subjectId => subjectId);

    if (subjectIds.length) {
      this.props.deleteJournalSubject(journal, subjectIds);
    }
  };

  handleCreateNode = (parentNode, parentKey, value) => {
    const { journal, updateJournal } = this.props;
    updateJournal(getId(journal), {
      [parentKey]: Object.assign(createId('blank'), value)
    });
  };

  handleUpdateNode = (node, key, value, { name }) => {
    const { journal, updateJournal } = this.props;
    updateJournal(getId(journal), {
      [name]: Object.assign({}, journal[name], { [key]: value })
    });
  };

  handleDeleteNode = (parentNode, parentKey, value) => {
    const { journal, updateJournal } = this.props;
    updateJournal(getId(journal), {
      [parentKey]: null
    });
  };

  render() {
    const bem = BemTags();

    let {
      journal,
      semanticTagsMap,
      disabled,
      readOnly,
      user,
      acl
    } = this.props;
    disabled = disabled || !acl.checkPermission(user, 'AdminPermission');

    if (!journal) {
      return null;
    }

    return (
      <section className={bem`settings-journal-metadata`}>
        <StyleGroup>
          <ControlledPaperInput
            label="slug"
            name="slug"
            value={unprefix(getId(journal))}
            onSubmit={this.handleUpdateMetadata}
            disabled={true}
            readOnly={readOnly}
            large={true}
            className={bem`__name-input`}
          />

          <ControlledPaperInput
            label="Name"
            name="name"
            value={getValue(journal.name || '')}
            onSubmit={this.handleUpdateMetadata}
            disabled={disabled}
            readOnly={readOnly}
            large={true}
            className={bem`__name-input`}
          />
          <ControlledPaperInput
            label="Short Name"
            name="alternateName"
            value={getValue(journal.alternateName || '')}
            onSubmit={this.handleUpdateMetadata}
            disabled={disabled}
            readOnly={readOnly}
            large={true}
            className={bem`__name-input`}
          />

          <RichTextarea
            label="Description"
            name="description"
            defaultValue={journal.description}
            onSubmit={this.handleUpdateMetadata}
            disabled={disabled}
            readOnly={readOnly}
            large={true}
            className={bem`__description-input`}
          />

          <RichTextarea
            label="Detailed Description"
            name="text"
            defaultValue={journal.text}
            onSubmit={this.handleUpdateMetadata}
            disabled={disabled}
            readOnly={readOnly}
            large={true}
            className={bem`__description-input`}
          />

          <RichTextarea
            label="Publishing Principles"
            name="publishingPrinciples"
            defaultValue={journal.publishingPrinciples}
            onSubmit={this.handleUpdateMetadata}
            disabled={disabled}
            readOnly={readOnly}
            large={true}
            className={bem`__description-input`}
          />
        </StyleGroup>

        <Divider />

        <StyleSection>
          <StyleSectionTitle>Location Created</StyleSectionTitle>
          <PostalAddressFormFragment
            name="locationCreated"
            parentNode={journal}
            disabled={disabled}
            readOnly={readOnly}
            node={journal.locationCreated}
            onCreate={this.handleCreateNode}
            onUpdate={this.handleUpdateNode}
            onDelete={this.handleDeleteNode}
          />
        </StyleSection>

        <StyleSection>
          <StyleSectionTitle>Journal Subjects</StyleSectionTitle>
          <div className={bem`__about`}>
            <SubjectEditor
              entity={journal}
              disabled={disabled}
              readOnly={readOnly}
              semanticTagsMap={semanticTagsMap}
              onAdd={this.handleAddSubject}
              onDelete={this.handleDeleteSubject}
            />
          </div>
        </StyleSection>

        <Divider />

        <StyleSection>
          <StyleSectionTitle>Social Media</StyleSectionTitle>
          <div className={bem`__contact`}>
            <JournalSocialMediaEditor
              disabled={disabled}
              readOnly={readOnly}
              periodical={journal}
            />
          </div>
        </StyleSection>
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.journal,
    journal => {
      const semanticTagsMap = arrayify(journal && journal.about)
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
  ),
  {
    updateJournal,
    addJournalSubject,
    deleteJournalSubject
  }
)(SettingsJournalMetadata);
