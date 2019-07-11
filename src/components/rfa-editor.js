import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { textify } from '@scipe/jsonld';
import {
  RichTextarea,
  PaperInput,
  withOnSubmit,
  PaperButton,
  ControlPanel
} from '@scipe/ui';
import {
  StyleRow,
  StyleSectionHeader,
  StyleSectionTitle
} from './settings/settings';

const ControledPaperInput = withOnSubmit(PaperInput);

export default class RfaEditor extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool,
    journal: PropTypes.object.isRequired,
    rfa: PropTypes.object.isRequired,
    onUpdate: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired
  };

  handleUpdate = e => {
    const { onUpdate } = this.props;

    onUpdate({
      [e.target.name]: e.target.value
    });
  };

  handleComplete = e => {
    const { onUpdate } = this.props;

    onUpdate({
      actionStatus: 'CompletedActionStatus'
    });
  };

  handleDelete = e => {
    const { onDelete } = this.props;
    onDelete();
  };

  handleActivate = e => {
    const { onUpdate } = this.props;

    onUpdate({
      actionStatus: 'ActiveActionStatus'
    });
  };

  render() {
    const { disabled, rfa } = this.props;

    return (
      <div className="issue-editor">
        <StyleSectionHeader>
          <StyleSectionTitle>
            <abbr title="Request For Articles">RFA</abbr> editor
          </StyleSectionTitle>
        </StyleSectionHeader>

        <StyleRow>
          <ControledPaperInput
            label="name"
            name="name"
            disabled={disabled || rfa.actionStatus === 'CompletedActionStatus'}
            readOnly={rfa.actionStatus === 'CompletedActionStatus'}
            value={textify(rfa.name) || ''}
            onSubmit={this.handleUpdate}
          />
        </StyleRow>

        <StyleRow>
          <RichTextarea
            label="Description"
            name="description"
            disabled={disabled || rfa.actionStatus === 'CompletedActionStatus'}
            readOnly={rfa.actionStatus === 'CompletedActionStatus'}
            defaultValue={rfa.description}
            onSubmit={this.handleUpdate}
          />
        </StyleRow>

        <ControlPanel>
          {!!(rfa.actionStatus === 'PotentialActionStatus') && (
            <Fragment>
              <PaperButton onClick={this.handleDelete}>Delete</PaperButton>
              <PaperButton onClick={this.handleActivate}>Publish</PaperButton>
            </Fragment>
          )}
          {rfa.actionStatus === 'ActiveActionStatus' && (
            <PaperButton onClick={this.handleComplete}>Archive</PaperButton>
          )}
        </ControlPanel>
      </div>
    );
  }
}
