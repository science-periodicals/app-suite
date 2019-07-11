import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Acl } from '@scipe/librarian';
import { getId, unprefix } from '@scipe/jsonld';
import { resetSubdomain, PaperButtonLink } from '@scipe/ui';
import PreSubmissionCommentModal from './sifter/pre-submission-comment-modal';
import { getPreSubmissionComment } from '../utils/periodical';

export default class StartSubmissionButton extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    journal: PropTypes.object,
    reset: PropTypes.bool, // set to true when called from a subdomain
    raised: PropTypes.bool,
    children: PropTypes.string,

    // to further customize the submission form
    workflowId: PropTypes.string,
    typeId: PropTypes.string,
    roleId: PropTypes.string,
    rfaId: PropTypes.string
  };

  static defaultProps = {
    journal: {},
    children: 'Start a submission'
  };

  constructor(props) {
    super(props);

    this.state = {
      isModalOpen: false
    };
  }

  handleStartSubmissionClick = e => {
    const { journal } = this.props;
    if (getId(journal)) {
      const acl = new Acl(journal);
      const acceptsSubmission = acl.checkPermission(
        { '@type': 'Audience', audienceType: 'public' },
        'CreateGraphPermission'
      );

      if (!acceptsSubmission) {
        e.preventDefault();
        this.setState({ isModalOpen: true });
      }
    }
  };

  handleCloseModal = () => {
    this.setState({ isModalOpen: false });
  };

  render() {
    const {
      user,
      journal,
      children,
      raised,
      reset,
      workflowId,
      typeId,
      roleId,
      rfaId
    } = this.props;
    const { isModalOpen } = this.state;

    const isLoggedIn = !!getId(user);

    const linkProps = {};

    if (getId(journal)) {
      const presets = [];
      if (typeId) {
        presets.push(`type=${unprefix(typeId)}`);
      }
      if (workflowId) {
        presets.push(`workflow=${unprefix(workflowId)}`);
      }
      if (roleId) {
        presets.push(`role=${unprefix(roleId)}`);
      }
      if (rfaId) {
        presets.push(`rfa=${unprefix(rfaId)}`);
      }
      const presetQs = presets.join('&');

      if (reset) {
        if (isLoggedIn) {
          linkProps.href = `${resetSubdomain(
            '/new/submission'
          )}?journal=${unprefix(getId(journal))}${
            presetQs ? `&${presetQs}` : ''
          }`;
        } else {
          linkProps.href = `${resetSubdomain(
            '/login'
          )}?next=${encodeURIComponent(
            `/new/submission?journal=${unprefix(getId(journal))}${
              presetQs ? `&${presetQs}` : ''
            }`
          )}`;
        }
      } else {
        if (isLoggedIn) {
          linkProps.to = `/new/submission?journal=${unprefix(getId(journal))}${
            presetQs ? `&${presetQs}` : ''
          }`;
        } else {
          linkProps.to = `/login?next=${encodeURIComponent(
            `/new/submission?journal=${unprefix(getId(journal))}${
              presetQs ? `&${presetQs}` : ''
            }`
          )}`;
        }
      }
    } else {
      if (reset) {
        if (isLoggedIn) {
          linkProps.href = `${resetSubdomain('/new/submission')}`;
        } else {
          linkProps.href = `${resetSubdomain(
            '/login'
          )}?next=${encodeURIComponent(`/new/submission`)}`;
        }
      } else {
        if (isLoggedIn) {
          linkProps.to = `/new/submission`;
        } else {
          linkProps.to = `/login?next=${encodeURIComponent(`/new/submission`)}`;
        }
      }
    }

    const preSubmissionComment = getPreSubmissionComment(journal);

    return (
      <Fragment>
        <PaperButtonLink
          className="start-submission-button"
          onClick={this.handleStartSubmissionClick}
          raised={raised}
          {...linkProps}
        >
          {children}
        </PaperButtonLink>

        {isModalOpen && (
          <PreSubmissionCommentModal
            comment={preSubmissionComment}
            onClose={this.handleCloseModal}
          />
        )}
      </Fragment>
    );
  }
}
