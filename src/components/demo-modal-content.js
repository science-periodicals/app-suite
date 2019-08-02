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
                  Explore the various settings, and be sure to check out how{' '}
                  <TextLogo /> allows you to:
                </p>

                <ul>
                  <li>
                    Create flexible editorial workflows{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="dispatch"
                      iconSize={10}
                    />{' '}
                    (including any anonymity options, such as single, double or
                    triple blind peer review)
                  </li>
                  <li>
                    Easily manage multiple article types{' '}
                    <Iconoclass tagName="span" iconName="label" iconSize={10} />
                    , each with a dedicated style guide
                  </li>
                  <li>
                    Create publication issues and special issues{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="layers"
                      iconSize={10}
                    />
                  </li>
                  <li>
                    Publish Request for Articles (
                    <abbr title="Request for Articles">RFA</abbr>){' '}
                    <Iconoclass tagName="span" iconName="rfa" iconSize={10} />
                  </li>
                </ul>
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
                  icon allow you to open resources in context to minimize
                  context switch.
                </p>

                <p>
                  The Download menu{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="download"
                    iconSize={10}
                  />{' '}
                  on the left side bar lets you:
                </p>

                <ul>
                  <li>
                    Print a web-first PDF generated on the fly from the web
                    version of the article
                  </li>
                  <li>
                    Download the article rich metadata in{' '}
                    <a href="https://www.w3.org/TR/json-ld/">JSON-LD</a>
                  </li>
                </ul>

                <p>
                  The{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="brightnessLight"
                    iconSize={10}
                  />{' '}
                  icon in the header lets you switch between various themes
                  (dark, light and alt) for additional reading comfort.
                </p>
                <p>
                  Articles are fully responsive and work well on mobile, tablet
                  and desktop environments.
                </p>
                <p>
                  Under the hood, the markup (HTML +{' '}
                  <a href="https://www.w3.org/TR/rdfa-primer/">RDFa</a>) is
                  sprinkled with <a href="https://schema.org">schema.org</a>{' '}
                  terms to guarantee good discoverability by all the major
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
                    mobile, tablet and desktop environments.
                  </p>
                  <p>
                    Articles can be found using faceted search (left panel) or
                    full text search (header). An additional toggle in the
                    header search bar also allows the user to switch to a view
                    listing the issues and Request for Articles (
                    <abbr title="Request For Articles">RFA</abbr>s) published by
                    the journal.
                  </p>
                  <p>
                    Articles (and the journal homepage) can easily be shared
                    using the share menu represented with a{' '}
                    <Iconoclass tagName="span" iconName="share" iconSize={10} />{' '}
                    icon. The share menu also provides quick access to a PDF
                    version of each article (generated on the fly from the
                    content of the web version of the article).
                  </p>
                  <p>
                    Links connect to the journal staff page{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="roleEditorGroup"
                      iconSize={10}
                    />{' '}
                    and journal information (About{' '}
                    <Iconoclass tagName="span" iconName="info" iconSize={10} />
                    ).
                  </p>
                  <p>
                    Last, the{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="logoSciAlt"
                      iconSize={10}
                    />{' '}
                    menu in the header provides access to platform level
                    features and the documentation.
                  </p>
                </Fragment>
              );
            } else {
              // dashboard demo
              body = (
                <Fragment>
                  <p>This demo showcases an editor dashboard.</p>
                  <p>
                    The dashboard acts like a <em>publishing inbox</em> and
                    allows the editor to track submissions (new, in progress or
                    published / rejected) as well as to quickly see the latest
                    activities (notification panel{' '}
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
                    Submissions can be tagged and filtered using faceted search
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
                  reviews they were based.
                </p>

                <p>
                  The editorial team can work collaboratively by adding staging
                  discussion comments (both general or in context).
                </p>

                <p>
                  The editor has access to the author release notes as well as
                  to all the reviews in context (inbound resources{' '}
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
                    icon open resources in context.
                  </li>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="anchor"
                      iconSize={10}
                    />{' '}
                    icon scroll to the relevant content.
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
                  when they need to endorse (approve) a request from authors for
                  an <abbr title="Article Processing Charges">APC</abbr>{' '}
                  discount.
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
              <Fragment>
                <p>
                  This demo showcases the user interface available to editors
                  when they need to assess a <em>revised</em> submission.
                </p>

                <p>
                  The editor has access to both versions of the manuscript
                  (revised{' '}
                  <Iconoclass tagName="span" iconName="version" iconSize={10} />{' '}
                  and previous{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="versionPast"
                    iconSize={10}
                  />
                  ) as well as to the author responses to editor revision
                  requests.
                </p>

                <p>
                  The editorial team can work collaboratively by adding staging
                  discussion comments (both general or in context).
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
                    icon open resources in context.
                  </li>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="anchor"
                      iconSize={10}
                    />{' '}
                    icon scroll to the relevant content.
                  </li>
                </ul>
              </Fragment>
            );
            break;

          case '/demo/editor-publishes-submission/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to editors
                  when they need to publish a submission that has been accepted.
                </p>
                <p>
                  Editors have the ability to work collaboratively to set the
                  publication date and other properties required to publish the
                  submission. Editors have access to general and in context
                  comments to coordinate their work.
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
                    icon open resources in context.
                  </li>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="anchor"
                      iconSize={10}
                    />{' '}
                    icon scroll to the relevant content.
                  </li>
                </ul>
              </Fragment>
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
                  This demo showcases how administrators can set up services
                  that will be offered to authors during the execution of
                  editorial workflows.
                </p>
              </Fragment>
            );
            break;

          case '/':
            body = (
              <Fragment>
                <p>This demo showcases a producer dashboard.</p>
                <p>The dashboard allows producers to keep track of:</p>

                <ul>
                  <li>Submissions requiring their attention</li>
                  <li>
                    The latest activity (notification panel{' '}
                    <Iconoclass tagName="span" iconName="alert" iconSize={10} />
                    )
                  </li>
                  <li>
                    Active comments (active comments panel{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="comment"
                      iconSize={10}
                    />
                    )
                  </li>
                </ul>

                <p>
                  Submissions can be tagged and filtered using faceted search
                  (left side panel) or full text search (header).
                </p>
              </Fragment>
            );
            break;

          case '/demo/typesetter-assesses-document-to-typeset/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to producers
                  when they need to typeset a document.
                </p>
                <p>
                  Producers have access to the document to typeset and have the
                  ability to request changes from the author before proceeding
                  with their work.
                </p>
              </Fragment>
            );
            break;

          case '/demo/typesetter-typesets-document/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to producers
                  after they uploaded a typeset document.
                </p>
                <p>
                  Typesetters have the ability to engage with other typesetters
                  through general or contextual comments before sending the
                  typeset document to the authors.
                </p>
              </Fragment>
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
                set up their profile.
              </p>
            );
            break;

          case '/':
            body = (
              <Fragment>
                <p>This demo showcases a reviewer dashboard.</p>
                <p>
                  The dashboard acts like a <em>publishing inbox</em> and allows
                  reviewers to:
                </p>

                <ul>
                  <li>Track submissions</li>
                  <li>
                    Quickly see the latest activity (notification panel{' '}
                    <Iconoclass tagName="span" iconName="alert" iconSize={10} />
                    )
                  </li>
                  <li>
                    Preview active comments (active comments panel{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="comment"
                      iconSize={10}
                    />
                    )
                  </li>
                  <li>
                    View pending invites (invites panel{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="personAdd"
                      iconSize={10}
                    />
                    )
                  </li>
                </ul>
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
                of the reviewer’s participation and activity.
              </p>
            );
            break;

          case '/demo/reviewer-accepts-invitation/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to reviewers
                  to accept an invitation to review a submission.
                </p>
                <p>
                  Reviewers can preview the submission and all the associated
                  resources before deciding to accept or decline the invitation
                  using the controls provided in the sub-header.
                </p>
              </Fragment>
            );
            break;

          case '/demo/reviewer-reviews-submission/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to reviewers
                  to review a submission.
                </p>

                <p>
                  The reviewer has access to the submission and all its
                  associated resources (previous editor assessments and release
                  notes) in context (inbound resources{' '}
                  <Iconoclass tagName="span" iconName="inbound" iconSize={10} />
                  ).
                </p>

                <p>
                  The reviewer needs to review the submission and can write
                  general and contextual reviewer notes (annotations). Each
                  reviewer note can precisely reference specific locations of
                  the manuscript.
                </p>

                <p>
                  Reviewers also need to respond to any endorser comments from
                  the editors in order to complete their reviews.
                </p>

                <p>
                  The <abbr title="User Interface">UI</abbr> is designed to
                  allow reviewers to view several resources at the same time
                  while minimizing context switch. In particular:
                </p>

                <ul>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass tagName="span" iconName="shell" iconSize={10} />{' '}
                    icon open resources in context.
                  </li>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="anchor"
                      iconSize={10}
                    />{' '}
                    icon scroll to the relevant content.
                  </li>
                </ul>
              </Fragment>
            );
            break;

          case '/demo/reviewer-reviews-revised-submission/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to reviewers
                  to review a <em>revised</em> submission.
                </p>

                <p>
                  The reviewer has access to the revised version of the
                  submission as well as to the previous submission (annotated
                  with editor revision requests and author responses).
                </p>

                <p>
                  The reviewer needs to review the revised submission and can
                  write general and contextual reviewer notes. Each reviewer
                  note can precisely reference specific locations of the
                  manuscript.
                </p>

                <p>
                  Reviewers also need to respond to any endorser comments from
                  the editors in order to complete their reviews.
                </p>

                <p>
                  The <abbr title="User Interface">UI</abbr> is designed to
                  allow reviewers to view several resources at the same time
                  while minimizing context switch. In particular:
                </p>

                <ul>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass tagName="span" iconName="shell" iconSize={10} />{' '}
                    icon open resources in context.
                  </li>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="anchor"
                      iconSize={10}
                    />{' '}
                    icon scroll to the relevant content.
                  </li>
                </ul>
              </Fragment>
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
                  authors to:
                </p>

                <ul>
                  <li>
                    Track submissions (new, in progress or published / rejected)
                  </li>
                  <li>
                    Quickly see the latest activity (notification panel{' '}
                    <Iconoclass tagName="span" iconName="alert" iconSize={10} />
                    )
                  </li>
                  <li>
                    View pending digital signatures (digital signatures panel{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="signature"
                      iconSize={10}
                    />
                    )
                  </li>
                  <li>
                    Preview active comments (active comments panel{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="comment"
                      iconSize={10}
                    />
                    )
                  </li>
                </ul>

                <p>
                  Submissions can be tagged and filtered using faceted search
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
                  icon allow you to open resources in context to minimize
                  context switch.
                </p>

                <p>
                  The Download menu{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="download"
                    iconSize={10}
                  />{' '}
                  on the left side bar lets you:
                </p>
                <ul>
                  <li>
                    Print a web-first PDF generated on the fly from the web
                    version of the article
                  </li>
                  <li>
                    Download the article rich metadata in{' '}
                    <a href="https://www.w3.org/TR/json-ld/">JSON-LD</a>
                  </li>
                </ul>

                <p>
                  The{' '}
                  <Iconoclass
                    tagName="span"
                    iconName="brightnessLight"
                    iconSize={10}
                  />{' '}
                  icon in the header lets you switch between various themes
                  (dark, light and alt) for additional reading comfort.
                </p>

                <p>
                  Articles are fully responsive and work well on mobile, tablet
                  and desktop environments.
                </p>

                <p>
                  Under the hood, the markup (HTML +{' '}
                  <a href="https://www.w3.org/TR/rdfa-primer/">RDFa</a>) is
                  sprinkled with <a href="https://schema.org">schema.org</a>{' '}
                  terms to guarantee good discoverability by all the major
                  search engines.
                </p>
              </Fragment>
            );
            break;

          case '/demo/author-prepares-submission/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to authors
                  when they submit a manuscript.
                </p>
                <p>
                  Authors need to upload their files and provide release notes
                  (akin to a cover letter). No other form needs to be filled
                  out, and no information already present in the manuscript
                  needs to be repeated.
                </p>
                <p>
                  A direct link to the style guide required by the journal for
                  this type of submission is provided in context.
                </p>
              </Fragment>
            );
            break;

          case '/demo/author-makes-declarations/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to authors to
                  answer questions or make declarations required by the journal.
                </p>
                <p>
                  Authors can work collaboratively and have access to general
                  and in context comments to coordinate their work.
                </p>
              </Fragment>
            );
            break;

          case '/demo/author-prepares-revision/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to authors to
                  submit a <em>revised</em> version of a manuscript as requested
                  by the editor.
                </p>

                <p>
                  Authors have access to the previous version of the submission,
                  the editor assessment, the revision requests and the reviewer
                  reviews, all in context.
                </p>

                <p>
                  When appropriate, the editor revision requests are displayed
                  in context (as annotations) on the previous version of the
                  manuscript.
                </p>

                <p>
                  Authors can work collaboratively to answer the editor revision
                  requests and upload a new version of the manuscript. When
                  doing so, authors can efficiently link to specific parts of
                  the revised manuscript.
                </p>

                <p>
                  The <abbr title="User Interface">UI</abbr> is designed to
                  allow authors to view several resources at the same time while
                  minimizing context switch. In particular:
                </p>

                <ul>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass tagName="span" iconName="shell" iconSize={10} />{' '}
                    icon open resources in context.
                  </li>
                  <li>
                    Links decorated with a{' '}
                    <Iconoclass
                      tagName="span"
                      iconName="anchor"
                      iconSize={10}
                    />{' '}
                    icon scroll to the relevant content.
                  </li>
                </ul>
              </Fragment>
            );
            break;

          case '/demo/author-requests-apc-discount/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to authors to
                  request a discount on the article processing charges set by
                  the journal.
                </p>
                <p>
                  Authors have the ability to request a discounted price and
                  engage with the editor to reach an agreed upon price.
                </p>
                <p>
                  The conversation can happen as general or contextual comments.
                </p>
              </Fragment>
            );
            break;

          case '/demo/author-confirms-contribution-and-identity/submission':
            body = (
              <Fragment>
                <p>
                  This demo showcases the user interface available to authors to
                  confirm their identity and contributions to the manuscript.
                </p>
                <p>
                  The author can confirm or deny their participation by
                  digitally signing the manuscript using the controls provided
                  in the sub-header.
                </p>
              </Fragment>
            );
            break;
        }
        break;
    }

    return <div className="demo-modal-content">{body}</div>;
  }
}
