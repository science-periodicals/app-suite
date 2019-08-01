import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { TextLogo } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

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
        This demo showcases <TextLogo /> user interface.
      </p>
    );

    switch (userId) {
      // editor demos
      case 'user:engelbart-demo':
        switch (pathname) {
          case '/settings/journal/demo/journal':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to editors to
                  configure journals.
                </p>
                <p>
                  Explore the various settings and be sure to check out how{' '}
                  <TextLogo /> allows you to create flexible editorial workflows
                  (with arbitrary anonymity control){' '}
                  <Iconoclass
                    tagName="span"
                    iconName="dispatch"
                    iconSize={10}
                  />{' '}
                  and easily manage multiple article types{' '}
                  <Iconoclass tagName="span" iconName="label" iconSize={10} />{' '}
                  each with a dedicated style guide.
                </p>
              </Fragment>
            );
            break;

          case '/payne2016a-demo':
            body = (
              <Fragment>
                <p>
                  This demo showcases a published article on <TextLogo />.
                </p>
                <p>
                  Each paragraph and resource comes with a <em>mnemonic</em>{' '}
                  identifier and a share menu for easy sharing.
                </p>
                <p>
                  Links decorated with the{' '}
                  <Iconoclass tagName="span" iconName="shell" iconSize={10} />{' '}
                  icon allow you to open resources in context to minize context
                  switch.
                </p>
                <p>
                  The Download menu on the left side bar let you print a web
                  first PDF generated on the fly from the content of the web
                  version of the article or download the article rich metada in{' '}
                  <a href="https://www.w3.org/TR/json-ld/">JSON-LD</a>.
                </p>
                <p>
                  The{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="brightnessLight"
                    iconSize={10}
                  />{' '}
                  icon in the header let you switch in between various themes
                  (dark, light and alt) for additional reading comfort.
                </p>
                <p>
                  Articles are fully responsive and work well on mobile, tablet
                  and desktop environment.
                </p>
                <p>
                  Under the hood, the markup (HTML +{' '}
                  <a href="https://www.w3.org/TR/rdfa-primer/">RDFa</a>) in
                  sprinkled with <a href="https://schema.org">schema.org</a>{' '}
                  terms to guarantee a good discoverability by all the major
                  search engines.
                </p>
              </Fragment>
            );
            break;

          case '/':
            if (isJournalSubdomain) {
              // journal homepage demo
              body = (
                <Fragment>
                  <p>This demo showcases a journal homepage.</p>
                  <p>
                    Journal homepages are fully responsive and work well on
                    mobile, tablet and desktop environment.
                  </p>
                  <p>
                    Articles can be found using faceted search (left panel) or
                    full text search (header). An additional toggle in the
                    header search bar also allows to switch to a view listing
                    the issues and request for articles published by the
                    journal.
                  </p>
                  <p>
                    Articles (and the journal homepage) can easily be shared
                    using the share menu represented with a{' '}
                    <Iconoclass tagName="span" iconName="share" iconSize={10} />{' '}
                    icon. The share menu also provides a quick access to a PDF
                    version of each article (generated on the fly from the
                    content of the web version of the article).
                  </p>
                  <p>
                    A series of links take you to the journal staff page and
                    journal information (About).
                  </p>
                  <p>
                    Last, the{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="logoSciAlt"
                      iconSize={10}
                    />{' '}
                    menu in the header allows to access platform level features
                    and navigate back to the documentation.
                  </p>
                </Fragment>
              );
            } else {
              // dashboard demo
              body = (
                <Fragment>
                  <p>This demo showcases an editor dasbhoard.</p>
                  <p>
                    The dashboard acts like a <em>publishing inbox</em> and
                    allows editor to track submissions (new, in progress or
                    published / rejected) as well as quickly see the latest
                    activity (notification panel{' '}
                    <Iconoclass tagName="span" iconName="alert" iconSize={10} />
                    ) and active comments (active comments panel{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="comment"
                      iconSize={10}
                    />
                    ).
                  </p>
                  <p>
                    Submission can be tagged and filtered using faceted search
                    (left side panel) or full text search (header).
                  </p>
                </Fragment>
              );
            }
            break;

          case '/demo/editor-assesses-reviewed-submission/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to editors to
                  collaboratively assess a submission that has been reviewed.
                </p>

                <p>
                  The editor needs to assess the submission and has the ability
                  to justify the assessment with general and contextual comments
                  (annotations) made directly in the margin of the article.
                </p>

                <p>
                  Each revision request can precisely reference specific
                  locations of the manuscript as well as indicate on which
                  reviewer reviews they were based on (if any).
                </p>

                <p>
                  The editorial team can work collaboratively by adding staging
                  discussion commens (both general or in context, as
                  annotations).
                </p>

                <p>
                  The editor has access to the author release notes as well as
                  all the reviewer reviews in context (inbound resources{' '}
                  <Iconoclass tagName="span" iconName="inbound" iconSize={10} />
                  ).
                </p>

                <p>
                  The <abbr title="User Interface">UI</abbr> is designed to
                  allow editors to view several resources at the same time while
                  minimizing context switch. In particular:
                </p>

                <ul>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass tagName="span" iconName="shell" iconSize={10} />{' '}
                    icon allow to open resources in context to minize context
                    switch.
                  </li>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="anchor"
                      iconSize={10}
                    />{' '}
                    icon allow to scroll to the relevant content.
                  </li>
                </ul>
              </Fragment>
            );
            break;

          case '/demo/editor-endorses-apc-discount/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to editors
                  when they need to endorse (approve) a request for an{' '}
                  <abbr title="Article Processing Charges">APC</abbr> discount
                  made by the authors.
                </p>
                <p>
                  The editor has the ability to engage with authors with
                  contextual comments (annotations) or general ones.
                </p>
              </Fragment>
            );
            break;

          case '/demo/editor-assesses-revised-submission/submission':
            body = (
              <p>
                This demo showcases the user interface available to editors when
                they need to assess a _revised_ submission that has been
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
                This demo showcases the user interface available to editors when
                they need to publish a submission that has been accepted. The
                editors have the ability to work collaboratively to set the
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
            body = (
              <Fragment>
                <p>
                  This demo showcases <TextLogo /> services settings where
                  administrators can setup services that will be offered to
                  authors during the execution of editorial workflows.
                </p>
              </Fragment>
            );
            break;

          case '/':
            body = (
              <Fragment>
                <p>This demo showcases a producer dasbhoard.</p>
                <p>
                  The dashboard allows producers to keep track of submissions
                  requiring their attention as well as the latest activity
                  (notification panel{' '}
                  <Iconoclass tagName="span" iconName="alert" iconSize={10} />
                  ).
                </p>
                <p>
                  Submission can be tagged and filtered using faceted search
                  (left side panel) or full text search (header).
                </p>
              </Fragment>
            );
            break;

          case '/demo/typesetter-assesses-document-to-typeset/submission':
            body = (
              <p>
                This demo showcases the user interface available to producers
                when they need to typeset a document. The producers have access
                to the document to typeset and have the ability to request
                changes from the author before proceeding with their work.
              </p>
            );
            break;

          case '/demo/typesetter-typesets-document/submission':
            body = (
              <p>
                This demo showcases the user interface available to producers
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
            body = (
              <p>
                This demo showcases the user interface available to reviewers to
                setup their profile.
              </p>
            );
            break;

          case '/':
            body = (
              <Fragment>
                <p>This demo showcases a reviewer dasbhoard.</p>
                <p>
                  The dashboard acts like a <em>publishing inbox</em> and allows
                  reviewers to track submission as well as quickly see the
                  latest activity (notification panel{' '}
                  <Iconoclass tagName="span" iconName="alert" iconSize={10} />)
                  and pending invites ( invites panel{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="personAdd"
                    iconSize={10}
                  />
                  ) .
                </p>
                <p>
                  Submissions can be tagged and filtered using faceted search
                  (left side panel) or full text search (header).
                </p>
              </Fragment>
            );
            break;

          case '/about/licklider-demo':
            body = (
              <p>
                This demo shows a reviewer public profile and includes a summary
                of the reviewer participation and activity.
              </p>
            );
            break;

          case '/demo/reviewer-accepts-invitation/submission':
            body = (
              <p>
                This demo showcases the user interface available to reviewers to
                accept an invitation to review a submission. Reviewers can
                preview the submission and all the associated resources before
                deciding to accept or decline the invitation.
              </p>
            );
            break;

          case '/demo/reviewer-reviews-submission/submission':
            body = (
              <p>
                This demo showcases the user interface available to reviewers to
                review a submission. The reviewer has access to the submission
                and all its associated resources (previous editors assessment,
                release notes etc.) in context. The reviewer needs to review the
                submission and can write general and contextual (annotations)
                reviewer notes. Each reviewer note can precisely reference
                specific locations of the manuscript. The{' '}
                <abbr title="User Interface">UI</abbr> offers the option to open
                the various resources in a shell to minimize context switching.
              </p>
            );
            break;

          case '/demo/reviewer-reviews-revised-submission/submission':
            body = (
              <p>
                This demo showcases the user interface available to reviewers to
                review a _revised_ submission. The reviewer has access to
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
            body = (
              <Fragment>
                <p>This demo showcases an author dasbhoard.</p>
                <p>
                  The dashboard acts like a <em>publishing inbox</em> and allows
                  authors to track submissions (new, in progress or published /
                  rejected) as well as quickly see the latest activity
                  (notification panel{' '}
                  <Iconoclass tagName="span" iconName="alert" iconSize={10} />
                  ), pending digital signatures (digital signatures panel{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="signature"
                    iconSize={10}
                  />
                  ) or active comments (comments panel{' '}
                  <Iconoclass tagName="span" iconName="comment" iconSize={10} />
                  ).
                </p>
                <p>
                  Submission can be tagged and filtered using faceted search
                  (left side panel) or full text search (header).
                </p>
              </Fragment>
            );
            break;

          case '/payne2016a-demo':
            body = (
              <Fragment>
                <p>
                  This demo showcases a published article on <TextLogo />.
                </p>
                <p>
                  Each paragraph and resource comes with a <em>mnemonic</em>{' '}
                  identifier and a share menu for easy sharing.
                </p>
                <p>
                  Links decorated with the{' '}
                  <Iconoclass tagName="span" iconName="shell" iconSize={10} />{' '}
                  icon allows you to open resources in context to minize context
                  switch.
                </p>
                <p>
                  The Download menu on the left side bar let you print a web
                  first PDF generated on the fly from the content of the web
                  version of the article or download the article rich metada in{' '}
                  <a href="https://www.w3.org/TR/json-ld/">JSON-LD</a>.
                </p>
                <p>
                  The{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="brightnessLight"
                    iconSize={10}
                  />{' '}
                  icon in the header let you switch in between various themes
                  (dark, light and alt) for additional reading comfort.
                </p>
                <p>
                  Articles are fully responsive and work well on mobile, tablet
                  and desktop environment.
                </p>
                <p>
                  Under the hood, the markup (HTML +{' '}
                  <a href="https://www.w3.org/TR/rdfa-primer/">RDFa</a>) in
                  sprinkled with <a href="https://schema.org">schema.org</a>{' '}
                  terms to guarantee a good discoverability by all the major
                  search engines.
                </p>
              </Fragment>
            );
            break;

          case '/demo/author-prepares-submission/submission':
            body = (
              <p>
                This demo showcases the user interface available to authors when
                they submit a manuscript. Authors need to upload their files and
                provide release notes (akin to a cover letter). No other form
                needs to be filled. A direct link to the style guide required by
                the journal for this type of submission is provided in context.
              </p>
            );
            break;

          case '/demo/author-makes-declarations/submission':
            body = (
              <p>
                This demo showcases the user interface available to authors to
                answer any questions or declarations required by the journal.
                Authors can work collaboratively and have access to general and
                in context (annotations) comments to coordinate their work.
              </p>
            );
            break;

          case '/demo/author-prepares-revision/submission':
            body = (
              <p>
                This demo showcases the user interface available to authors to
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
                This demo showcases the user interface available to authors to
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
                This demo showcases the user interface available to authors to
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
