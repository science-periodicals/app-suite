import React, { Component, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import { ControlPanel, PaperButton } from '@scipe/ui';
import BuyServiceOfferModal from './buy-service-offer-modal';
import Counter from '../utils/counter';
import AnnotationHeader from './annotation-header';
import SlugInfo from './info/slug-info';
import AssignmentInfo from './info/assignment-info';
import TypesetterRevisionRequestInfo from './info/typesetter-revision-request-info';
import ActivateOfflineCommentInfo from './info/activate-offline-comment-info';
import { clearErrorAndStatusByKey } from '../actions/ui-action-creators';
import { prettifyLocation } from '../utils/annotations';
import ShellLink from './shell/shell-link';
import ScrollLink from './scroll-link';

import {
  // actions
  ERROR_EMAIL_MESSAGE_DESCRIPTION,
  ERROR_EMAIL_MESSAGE_TEXT,
  ERROR_SLUG,
  ERROR_ASSESS_ACTION_RESULT,
  ERROR_REVIEW_BODY,
  ERROR_REVIEW_RATING,
  ERROR_ANSWER,
  ERROR_MISSING_VALUE,
  ERROR_NEED_AUTHOR_RESPONSE,
  ERROR_NEED_PRODUCTION_CONTENT,
  ERROR_NEED_PRODUCTION_CONTENT_OR_SERVICE,
  ERROR_NEED_SUBMISSION_CONTENT,
  ERROR_TYPESETTER_NEED_AUTHOR_REVISION,
  ERROR_NEED_COMPLETED_CHECK_ACTION,
  WARNING_ACTIVATE_OFFLINE_COMMENT_ACTION,

  // resources
  ERROR_ALTERNATE_NAME,
  ERROR_LICENSE,
  ERROR_PROGRAMMING_LANGUAGE,
  ERROR_NEED_CONTRIBUTOR_IDENTITY,
  WARNING_NAME,
  WARNING_DESCRIPTION,
  WARNING_CAPTION,
  WARNING_TRANSCRIPT,
  WARNING_LICENSE,
  WARNING_KEYWORDS,
  WARNING_IS_BASED_ON,
  WARNING_ABOUT,
  WARNING_SLUG,

  // assignment
  ERROR_NEED_ASSIGNMENT,
  ERROR_NEED_ASSIGNEE,
  ERROR_NEED_ENDORSER_ASSIGNMENT,
  ERROR_NEED_ENDORSER,

  // encodings
  WARNING_CAN_REVISE_FILE,
  WARNING_REVISION_UPLOAD_NEEDED,
  ERROR_FILE_UPLOAD_NEEDED,
  ERROR_TYPESETTER_MUST_REVISE_FILE_BASED_ON_NEW_AUTHOR_CONTENT,

  // services
  WARNING_SERVICE_AVAILABLE
} from '../constants';

export default class Info extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    annotation: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter)
  };

  constructor(props) {
    super(props);

    this.state = { isModalOpen: false };
  }

  handleOpenModal = e => {
    this.setState({ isModalOpen: true });
  };

  handleCloseModal = e => {
    const { annotation } = this.props;
    this.setState({ isModalOpen: false });
    clearErrorAndStatusByKey(getId(annotation.selector.node));
  };

  render() {
    const {
      graphId,
      annotation,
      annotation: { object },
      counter
    } = this.props;
    const { isModalOpen } = this.state;

    const isServiceWarning = object === WARNING_SERVICE_AVAILABLE;
    const identifier = prettifyLocation(counter.getUrl().hash.substring(1));

    return (
      <div className="info">
        <AnnotationHeader annotation={annotation} identifier={identifier} />
        <div className="info__body">
          <Description {...this.props} />
          {isServiceWarning && (
            <ControlPanel>
              <PaperButton onClick={this.handleOpenModal}>View</PaperButton>
            </ControlPanel>
          )}
        </div>

        {isModalOpen && (
          <BuyServiceOfferModal
            graphId={graphId}
            annotation={annotation}
            onClose={this.handleCloseModal}
          />
        )}
      </div>
    );
  }
}

class Description extends PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    annotation: PropTypes.object.isRequired
  };

  render() {
    let body;
    const {
      annotation: { object },
      graphId
    } = this.props;

    switch (object) {
      case WARNING_SERVICE_AVAILABLE:
        body = <p>Editing support is available</p>;
        break;

      case ERROR_EMAIL_MESSAGE_DESCRIPTION:
        body = (
          <p>
            Missing <strong>subject</strong>
          </p>
        );
        break;

      case ERROR_EMAIL_MESSAGE_TEXT:
        body = (
          <p>
            Missing <strong>body</strong>
          </p>
        );
        break;

      case ERROR_MISSING_VALUE:
        // Special case where we overwrite the header
        body = null; // <p>Required value</p>;
        break;

      case ERROR_NEED_AUTHOR_RESPONSE:
        // Special case where we overwrite the header
        body = null; // <p>Response required</p>;
        break;

      case WARNING_SLUG:
      case ERROR_SLUG:
        body = <SlugInfo {...this.props} />;
        break;

      case ERROR_ASSESS_ACTION_RESULT:
        body = (
          <p>
            Missing <strong>decision</strong>.
          </p>
        );
        break;

      case ERROR_REVIEW_RATING:
        body = (
          <p>
            Missing <strong>review rating</strong>.
          </p>
        );
        break;

      case ERROR_REVIEW_BODY:
        body = (
          <p>
            Missing <strong>review body</strong>.
          </p>
        );
        break;

      case ERROR_ANSWER:
        body = (
          <p>
            Missing <strong>answer</strong>.
          </p>
        );
        break;

      case ERROR_ALTERNATE_NAME:
        body = (
          <p>
            This resource does not have a local <strong>label</strong> (e.g.,
            figure 1). Good labels tend to be short, memorable but also
            reasonably descriptive.
          </p>
        );
        break;

      case ERROR_NEED_COMPLETED_CHECK_ACTION:
        body = <p>Missing digital signature</p>;
        break;

      case ERROR_NEED_CONTRIBUTOR_IDENTITY:
        body = (
          <p>
            Identity cannot be verified. Upload a new version of the submission
            including an hyperlink to the contributor profile URL.
          </p>
        );
        break;

      case WARNING_LICENSE:
      case ERROR_LICENSE:
        body = (
          <p>
            This resource does not have a <strong>license</strong>.
          </p>
        );
        break;

      case ERROR_PROGRAMMING_LANGUAGE:
        body = (
          <p>
            Please use the dropdown menu to select the{' '}
            <strong>programming language</strong>.
          </p>
        );
        break;

      case WARNING_NAME:
        body = (
          <p>
            This resource does not have a <strong>title</strong>.
          </p>
        );
        break;

      case WARNING_DESCRIPTION:
        body = (
          <p>
            The <strong>description</strong> of this resource is missing.
          </p>
        );
        break;

      case WARNING_CAPTION:
        body = (
          <p>
            The <strong>caption</strong> of this resource is missing.
          </p>
        );
        break;

      case WARNING_TRANSCRIPT:
        body = (
          <p>
            The <strong>transcript</strong> of this resource is missing.
          </p>
        );
        break;

      case WARNING_KEYWORDS:
        body = (
          <p>
            There are no <strong>keywords</strong> associated with this
            resource. Separate keywords with commas.
          </p>
        );
        break;

      case WARNING_IS_BASED_ON:
        body = (
          <p>
            This resource does not list any <strong>requirements</strong> (e.g.
            dataset, code, ...). Add any required resources either by their name
            (if they are part of your project) or by providing a URL.
          </p>
        );
        break;

      case WARNING_ABOUT:
        body = (
          <p>
            The <strong>subject matter</strong> of the content is not specified.
            Add tags to specify what the content is <em>about</em>.
          </p>
        );
        break;

      case ERROR_FILE_UPLOAD_NEEDED:
        body = (
          <p>
            The <strong>file</strong> referenced in the manuscript needs to be
            uploaded.
          </p>
        );
        break;

      case ERROR_TYPESETTER_MUST_REVISE_FILE_BASED_ON_NEW_AUTHOR_CONTENT:
        body = (
          <div>
            <p>
              The <strong>file</strong> to typeset has been updated and a new
              revision is needed.
            </p>
            <ControlPanel>
              <ScrollLink to={{ hash: '#document-to-typeset' }} theme="button">
                View
              </ScrollLink>
            </ControlPanel>
          </div>
        );
        break;

      case WARNING_CAN_REVISE_FILE:
        body = (
          <div>
            <p>
              A revision of the <strong>file</strong> can be uploaded.
            </p>
            <ControlPanel>
              <ShellLink theme="button" type="submission" nodeId={graphId}>
                View styleguide
              </ShellLink>
            </ControlPanel>
          </div>
        );
        break;

      case WARNING_REVISION_UPLOAD_NEEDED:
        body = (
          <div>
            <p>A revision should be uploaded.</p>
            <ControlPanel>
              <ShellLink theme="button" type="submission" nodeId={graphId}>
                View styleguide
              </ShellLink>
            </ControlPanel>
          </div>
        );
        break;

      case ERROR_NEED_ASSIGNMENT:
      case ERROR_NEED_ASSIGNEE:
      case ERROR_NEED_ENDORSER_ASSIGNMENT:
      case ERROR_NEED_ENDORSER:
        body = <AssignmentInfo {...this.props} />;
        break;

      case ERROR_NEED_PRODUCTION_CONTENT:
        body = (
          <div>
            <p>
              Upload a{' '}
              <a href="/documentation/ds3">
                <abbr title="DOCX Standard Scientific Style">DS3</abbr>
              </a>{' '}
              manuscript
            </p>
            <ControlPanel>
              <ShellLink theme="button" type="submission" nodeId={graphId}>
                View styleguide
              </ShellLink>
            </ControlPanel>
          </div>
        );
        break;

      case ERROR_NEED_PRODUCTION_CONTENT_OR_SERVICE:
        body = (
          <div>
            <p>
              Upload a{' '}
              <a href="/documentation/ds3">
                <abbr title="DOCX Standard Scientific Style">DS3</abbr>
              </a>{' '}
              manuscript or use an editing support service
            </p>
            <ControlPanel>
              <ShellLink theme="button" type="submission" nodeId={graphId}>
                View styleguide
              </ShellLink>
            </ControlPanel>
          </div>
        );
        break;

      case ERROR_NEED_SUBMISSION_CONTENT:
        body = (
          <div>
            <p>
              Upload a{' '}
              <a href="/documentation/ds3">
                <abbr title="DOCX Standard Scientific Style">DS3</abbr>
              </a>{' '}
              or{' '}
              <a href="https://en.wikipedia.org/wiki/PDF">
                <abbr title="Portable Document Format ">PDF</abbr>
              </a>{' '}
              manuscript
            </p>
            <ControlPanel>
              <ShellLink theme="button" type="submission" nodeId={graphId}>
                View styleguide
              </ShellLink>
            </ControlPanel>
          </div>
        );
        break;

      case ERROR_TYPESETTER_NEED_AUTHOR_REVISION:
        body = <TypesetterRevisionRequestInfo {...this.props} />;
        break;

      case WARNING_ACTIVATE_OFFLINE_COMMENT_ACTION:
        body = <ActivateOfflineCommentInfo {...this.props} />;
        break;

      default:
        console.error('unhandled task object', object);
        body = <p>{object}</p>;
        break;
    }

    return <div className="info__description">{body}</div>;
  }
}
