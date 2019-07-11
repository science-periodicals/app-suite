import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, arrayify, dearrayify } from '@scipe/jsonld';
import {
  PaperSwitch,
  RichTextarea,
  LayoutWrapRows,
  LayoutWrapItem
} from '@scipe/ui';
import {
  hasPublicAudience,
  PRE_SUBMISSION_COMMENT
} from '@scipe/librarian';
import {
  updateJournalAccess,
  updateJournal
} from '../../actions/journal-action-creators';
import { getPreSubmissionComment } from '../../utils/periodical';

// TODO if journal accepts public submission but has no editorial office contact
// point defined or no active workflows, issue warnings with Link to the right
// settings => have stepper URL driven

class SettingsJournalAccess extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    journal: PropTypes.object,
    updateJournal: PropTypes.func.isRequired,
    updateJournalAccess: PropTypes.func.isRequired,
    status: PropTypes.shape({
      status: PropTypes.oneOf(['active', 'error', 'success']),
      error: PropTypes.instanceOf(Error)
    })
  };

  static defaultProps = {
    status: {}
  };

  handleToggleAccess(isPublic) {
    const { journal } = this.props;
    const action = {
      '@type': isPublic ? 'AuthorizeAction' : 'DeauthorizeAction',
      object: getId(journal),
      instrument: {
        '@type': 'DigitalDocumentPermission',
        grantee: {
          '@type': 'Audience',
          audienceType: 'public'
        },
        permissionType: 'ReadPermission'
      }
    };
    this.props.updateJournalAccess(getId(journal), action);
  }

  handleToggleAcceptsSubmission(acceptsSubmission) {
    const { journal } = this.props;
    const action = {
      '@type': acceptsSubmission ? 'AuthorizeAction' : 'DeauthorizeAction',
      object: getId(journal),
      instrument: {
        '@type': 'DigitalDocumentPermission',
        grantee: {
          '@type': 'Audience',
          audienceType: 'user'
        },
        permissionType: 'CreateGraphPermission'
      }
    };
    this.props.updateJournalAccess(getId(journal), action);
  }

  handleChangeSubmissionCommentText = e => {
    const { journal } = this.props;
    e.preventDefault && e.preventDefault();
    const preSubmissionComment = getPreSubmissionComment(journal);

    const nextComment = Object.assign(
      {
        '@type': 'Comment',
        identifier: PRE_SUBMISSION_COMMENT
      },
      preSubmissionComment,
      {
        [e.target.name]: e.target.value
      }
    );

    const upd = {
      comment: dearrayify(
        journal.comment,
        arrayify(journal.comment)
          .filter(comment => comment.identifier !== PRE_SUBMISSION_COMMENT)
          .concat(nextComment)
      )
    };

    this.props.updateJournal(getId(journal), upd);
  };

  render() {
    const {
      journal,
      status: { status },
      acl,
      user,
      disabled: _disabled,
      readOnly
    } = this.props;

    const disabled = _disabled || !acl.checkPermission(user, 'AdminPermission');

    const acceptsSubmission = acl.checkPermission(
      { '@type': 'Audience', audienceType: 'public' },
      'CreateGraphPermission'
    );

    const isPublic = hasPublicAudience(journal);
    const preSubmissionComment = getPreSubmissionComment(journal);
    const preSubmissionCommentText =
      preSubmissionComment && preSubmissionComment.text;

    return (
      <section className="settings-journal-access">
        <LayoutWrapRows>
          <LayoutWrapItem>
            <div className="settings-journal-access__public-access">
              <h3 className="settings-journal-access__title">Public Access</h3>

              <div className="settings-journal-access__toggle-group">
                <span className="settings-journal-access__switch-label">
                  Enable public to access journal
                </span>
                <PaperSwitch
                  id="check-journal-access"
                  disabled={disabled || status === 'active'}
                  readOnly={readOnly}
                  checked={isPublic}
                  onClick={this.handleToggleAccess.bind(this, !isPublic)}
                />
              </div>
            </div>
          </LayoutWrapItem>
          <LayoutWrapItem>
            <div className="settings-journal-access__submission">
              <h3 className="settings-journal-access__title">
                Incoming submissions
              </h3>

              <div className="settings-journal-access__toggle-group">
                <span className="settings-journal-access__switch-label">
                  Accept incoming submissions
                </span>
                <PaperSwitch
                  id="check-journal-access"
                  disabled={disabled || status === 'active'}
                  readOnly={readOnly}
                  checked={acceptsSubmission}
                  onClick={this.handleToggleAcceptsSubmission.bind(
                    this,
                    !acceptsSubmission
                  )}
                />
              </div>

              {!acceptsSubmission && (
                <div className="settings-journal-access__no-submit-msg">
                  <p className="settings-journal-access__no-submit-msg-text">
                    Prior to opening new submissions to the journal, provide a
                    custom message that will be displayed to any user attempting
                    to submit to the journal.
                  </p>

                  <RichTextarea
                    label="text"
                    name="text"
                    disabled={disabled}
                    readOnly={readOnly}
                    defaultValue={preSubmissionCommentText}
                    onSubmit={this.handleChangeSubmissionCommentText}
                  />
                </div>
              )}
            </div>
          </LayoutWrapItem>
        </LayoutWrapRows>
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => state.updateJournalAccessStatusMap[getId(props.journal)],
    status => {
      return {
        status
      };
    }
  ),
  { updateJournalAccess, updateJournal }
)(SettingsJournalAccess);
