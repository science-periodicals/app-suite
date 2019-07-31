import React from 'react';
import PropTypes from 'prop-types';
import { TextLogo } from '@scipe/ui';

export default class DemoModalContent extends React.Component {
  static propTypes = {
    pathname: PropTypes.string.isRequired,
    userId: PropTypes.string.isRequired,
    isJournalSubdomain: PropTypes.bool
  };

  render() {
    const { userId, pathname, isJournalSubdomain } = this.props;

    let body = (
      <p>
        This demo illustrates <TextLogo /> user interface.
      </p>
    );

    switch (userId) {
      // editor demos
      case 'user:engelbart-demo':
        switch (pathname) {
          case '/settings/journal/demo/journal':
            break;
          case '/':
            break;
          case '/rfas':
            break;
          case '/issues':
            break;
          case '/ceballos2017a-demo':
            break;
          case '/demo/editor-assesses-reviewed-submission/submission':
            body = (
              <p>
                This demo illustrates the user interface available to editors to
                assess a submission that has been reviewed. The editor has
                access to the author manuscript and release notes as well as all
                the reviewer reviews in context. The editor needs to assess the
                submission and has the ability to justify their assessment. In
                cases where the editor requests a revision (like in this demo),
                the editor can write general revision requests and contextual
                ones (as annotations). Each revision request can precisely
                reference specific locations of the manuscript as well as
                indicate on which reviewer reviews they were based on (if any).
                The <abbr title="User Interface">UI</abbr> offers editors the
                option to open the various resources in a shell to minimize
                context switch.
              </p>
            );
            break;
          case '/demo/editor-endorses-apc-discount-action/submission':
            body = (
              <p>
                This demo illustrates the user interface available to editors
                when they need to endorse (approve) a request for a discount
                made by the authors. The editor has the ability to engage with
                authors with contextual comments (annotations) or general ones.
              </p>
            );
            break;
          case '/demo/editor-assesses-revised-submission/submission':
            body = (
              <p>
                This demo illustrates the user interface available to editors
                when they need to assess a _revised_ submission that has been
                reviewed. The editor has access to both versions of the
                manuscript as well as the author responses made to the previous
                revision requests. The editor needs to assess the submission and
                has the ability to justify their assessment. Here the editor
                decides to accept the submission and send it to production.
              </p>
            );
            break;
          case '/demo/editor-publishes-submission/submission':
            body = (
              <p>
                This demo illustrates the user interface available to editors
                when they need to publish a submission that has been accepted.
                The editors have the ability to work collaboratively to set the
                publication date and other properties required to publish the
                submission. Editors have access to general and in context
                (annotations) comments to coordinate their work.
              </p>
            );
            break;
          default:
            break;
        }
        break;

      // producer demos
      case 'user:taylor-demo':
        switch (pathname) {
          case '/settings/organization/demo-org/services':
            break;
          case '/':
            break;
          case '/demo/typesetter-assesses-document-to-typeset/submission':
            body = (
              <p>
                This demo illustrates the user interface available to producers
                when they need to typeset a document. The producers have access
                to the document to typeset and have the ability to request
                changes from the author before proceeding with their work.
              </p>
            );
            break;
          case '/demo/typesetter-typesets-document/submission':
            body = (
              <p>
                This demo illustrates the user interface available to producers
                when they need to typeset a document. Here a typesetter has
                uploaded the typeset document and has the ability to engage with
                other typesetters through general or contextual comments
                (annotations) before sending the typeset document to the
                authors.
              </p>
            );
            break;
          default:
            break;
        }
        break;

      // reviewer demos
      case 'user:licklider-demo':
        switch (pathname) {
          case '/settings/profile/bio':
            break;
          case '/':
            break;
          case '/about/licklider-demo':
            break;
          case '/demo/reviewer-accepts-invitation/submission':
            body = (
              <p>
                This demo illustrates the user interface available to reviewers
                to accept an invitation to review a submission. Reviewers can
                preview the submission and all the associated resources before
                deciding to accept or decline the invitation.
              </p>
            );
            break;
          case '/demo/reviewer-reviews-submission/submission':
            body = (
              <p>
                This demo illustrates the user interface available to reviewers
                to review a submission. The reviewer has access to the
                submission and all its associated resources (previous editors
                assessment, release notes etc.) in context. The reviewer needs
                to review the submission and can write general and contextual
                (annotations) reviewer notes. Each reviewer note can precisely
                reference specific locations of the manuscript. The{' '}
                <abbr title="User Interface">UI</abbr> offers the option to open
                the various resources in a shell to minimize context switching.
              </p>
            );
            break;
          case '/demo/reviewer-reviews-revised-submission/submission':
            body = (
              <p>
                This demo illustrates the user interface available to reviewers
                to review a _revised_ submission. The reviewer has access to
                revised version of the submission as well as the previous one
                annotated with the editors revision requests. The reviewer needs
                to review the revised submission and can write general and
                contextual (annotations) reviewer notes. Each reviewer note can
                precisely reference specific locations of the manuscript. The{' '}
                <abbr title="User Interface">UI</abbr> offers the option to open
                the various resources in a shell to minimize context switching.
              </p>
            );
            break;
          default:
            break;
        }
        break;

      // author demos
      case 'user:hamilton-demo':
        switch (pathname) {
          case '/':
            break;
          case '/payne2016a-demo':
            break;
          case '/demo/author-prepares-submission/submission':
            body = (
              <p>
                This demo illustrates the user interface available to authors
                when they submit a manuscript. Authors need to upload their
                files and provide release notes (akin to a cover letter). No
                other form needs to be filled. A direct link to the style guide
                required by the journal for this type of submission is provided
                in context.
              </p>
            );
            break;
          case '/demo/author-makes-declarations/submission':
            body = (
              <p>
                This demo illustrates the user interface available to authors to
                answer any questions or declarations required by the journal.
                Authors can work collaboratively and have access to general and
                in context (annotations) comments to coordinate their work.
              </p>
            );
            break;
          case '/demo/author-prepares-revision/submission':
            body = (
              <p>
                This demo illustrates the user interface available to authors to
                submit a _revised_ version of a manuscript as requested by the
                editor. Authors have access to the previous version of the
                submission, the editor assessment, the revision requests and the
                reviewer reviews all in context. When appropriate, the editor
                revision requests are displayed in context (as annotations) on
                the previous version of the manuscript. Authors need to answer
                the editor revision requests and upload a new version of the
                manuscript. When doing so, authors can efficiently link to
                specific parts of the revised manuscript. The{' '}
                <abbr title="User Interface">UI</abbr> offers the option to open
                the various resources in a shell to minimize context switching.
              </p>
            );
            break;
          case '/demo/author-requests-apc-discount/submission':
            body = (
              <p>
                This demo illustrates the user interface available to authors to
                request a discount on the article processing charges set by the
                journal. Authors have the ability to requests a discounted price
                and engage with the editor to reach an agreed price. The
                conversation can happen as general or contextual comments
                (annotations).
              </p>
            );
            break;
          case '/demo/author-confirms-contribution-and-identity/submission':
            body = (
              <p>
                This demo illustrates the user interface available to authors to
                confirm their contribution and identity to a manuscript. The
                author can confirm or deny their participation by digitally
                signing the manuscript.
              </p>
            );
            break;
        }
        break;
    }

    return <div className="demo-modal-content">{body}</div>;
  }
}
