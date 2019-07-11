import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { createId } from '@scipe/librarian';
import {
  PaperInput,
  PaperDateInput,
  PaperTimeInput,
  MenuItem,
  PaperSlug,
  ControlPanel,
  PaperButton,
  BemTags
} from '@scipe/ui';
import { StyleRow } from './settings/settings';

export default class CreateIssueForm extends React.Component {
  static propTypes = {
    periodicalId: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['PublicationIssue', 'SpecialPublicationIssue']),
    onCancel: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    isSubmitting: PropTypes.bool,
    error: PropTypes.instanceOf(Error)
  };

  constructor(props) {
    super(props);
    this.state = {
      datePublished: moment()
        .add(1, 'months')
        .startOf('day')
        .toDate(),
      name: '',
      slug: ''
    };
  }

  reset() {
    this.setState({
      datePublished: moment()
        .add(1, 'months')
        .toDate(),
      name: '',
      slug: ''
    });
  }

  handleDateTimeChange = nextDate => {
    this.setState({ datePublished: nextDate });
  };

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleCancel = e => {
    e.preventDefault();
    const { onCancel } = this.props;
    onCancel();
  };

  handleSubmit = e => {
    e.preventDefault();
    const { onSubmit, type, periodicalId } = this.props;
    const { datePublished, slug, name } = this.state;

    const issue = {
      '@type': type,
      datePublished
    };

    if (type === 'SpecialPublicationIssue') {
      issue.name = name;
      issue['@id'] = createId('issue', slug, periodicalId)['@id'];
    }

    onSubmit(issue);
  };

  preventSubmit(e) {
    e.preventDefault();
  }

  render() {
    const { type, isSubmitting, error } = this.props;
    const { datePublished, name, slug } = this.state;

    const canSubmit = type == 'PublicationIssue' ? true : !!name && !!slug;
    const bem = BemTags();

    return (
      <form onSubmit={this.preventSubmit}>
        {type === 'SpecialPublicationIssue' && (
          <Fragment>
            <StyleRow>
              <PaperSlug
                required={true}
                disabled={isSubmitting}
                name="slug"
                label="slug"
                value={slug}
                onChange={this.handleChange}
              />
            </StyleRow>
            <StyleRow>
              <PaperInput
                required={true}
                disabled={isSubmitting}
                label="name"
                name="name"
                type="text"
                autoComplete="off"
                value={name}
                onChange={this.handleChange}
              />
            </StyleRow>
          </Fragment>
        )}
        {/* datePublished */}
        <StyleRow>
          <PaperDateInput
            data-test-now="true"
            label="Publication Date"
            name="date"
            value={datePublished}
            disabled={isSubmitting}
            onChange={this.handleDateTimeChange}
          />
        </StyleRow>
        <StyleRow>
          <PaperTimeInput
            data-test-now="true"
            label="Publication Time"
            name="time"
            disabled={isSubmitting}
            onChange={this.handleDateTimeChange}
            value={datePublished}
          >
            <MenuItem value="09:00">
              <span style={{ color: 'grey' }}>09:00 AM </span> Morning
            </MenuItem>
            <MenuItem value="12:00">
              <span style={{ color: 'grey' }}>12:00 PM </span> Afternoon
            </MenuItem>
            <MenuItem value="18:00">
              <span style={{ color: 'grey' }}>06:00 PM </span> Evening
            </MenuItem>
          </PaperTimeInput>
        </StyleRow>
        <ControlPanel error={error}>
          <PaperButton disabled={isSubmitting} onClick={this.handleCancel}>
            Cancel
          </PaperButton>
          <PaperButton
            disabled={isSubmitting || !canSubmit}
            onClick={this.handleSubmit}
          >
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </PaperButton>
        </ControlPanel>
      </form>
    );
  }
}
