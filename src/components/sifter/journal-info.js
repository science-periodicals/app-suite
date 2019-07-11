import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { helmetify } from '@scipe/librarian';
import { getId, arrayify } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import {
  Value,
  BemTags,
  Card,
  SubjectEditor,
  ExpansionPanelGroup,
  ExpansionPanel,
  ExpansionPanelPreview,
  AuthorGuidelines,
  Div
} from '@scipe/ui';
import { RE_TWITTER, RE_FACEBOOK } from '../../constants';
import WorkflowList from '../workflow-list';
import StartSubmissionButton from '../start-submission-button';

// TODO display eligible workflow list for each type (see settings for code)

export default class JournalInfo extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    journal: PropTypes.object,
    droplets: PropTypes.object
  };

  static defaultProps = {
    journal: {},
    droplets: {}
  };

  render() {
    const { user, journal, droplets } = this.props;

    const publicationTypes = arrayify(journal.publicationTypeCoverage)
      .map(id => droplets[getId(id)])
      .filter(Boolean);

    const facebookUrl =
      arrayify(journal.sameAs).find(uri => RE_FACEBOOK.test(uri)) || '';
    const twitterUrl =
      arrayify(journal.sameAs).find(uri => RE_TWITTER.test(uri)) || '';
    const twitterHandle = twitterUrl.split('/')[3] || '';

    const hasSocialMedia = !!(facebookUrl || twitterHandle);

    const semanticTagsMap = arrayify(journal && journal.about)
      .filter(tag => {
        const tagId = getId(tag);
        return tagId && tagId.startsWith('subjects:');
      })
      .reduce((semanticTagsMap, semanticTag) => {
        semanticTagsMap[getId(semanticTag)] = semanticTag;
        return semanticTagsMap;
      }, {});

    const workflows = arrayify(journal.potentialWorkflow)
      .map(id => droplets[getId(id)])
      .filter(Boolean);

    const helmet = helmetify(journal, {
      defaultImg: '/favicon/alt-submark-favicon/android-chrome-512x512.png'
    });

    const bem = BemTags();

    return (
      <div className={bem`journal-info`}>
        <Helmet>
          {helmet.title && <title>{`${helmet.title} • About`}</title>}
          {helmet.meta.map(attrMap => (
            <meta key={attrMap.name || attrMap.content} {...attrMap} />
          ))}
        </Helmet>

        <Card className={bem`__card`}>
          <header className={bem`__header`}>
            <Iconoclass
              iconName="info"
              size="24px"
              className={bem`__header-icon`}
            />
            <h2 className={bem`__header-title`}>Journal information</h2>
          </header>

          {/* Detailed description of the journal */}
          {!!journal.text && (
            <Div className={`${bem`__description`} sa__sans-body-user-type`}>
              {journal.text}
            </Div>
          )}

          {!!journal.publishingPrinciples && (
            <section className={bem`__section --subjects`}>
              <h3 className={bem`__section-title`}>Publishing principles</h3>
              <Div className="sa__sans-body-user-type">
                {journal.publishingPrinciples}
              </Div>
            </section>
          )}

          {!!Object.keys(semanticTagsMap).length && (
            <section className={bem`__section --subjects`}>
              <h3 className={bem`__section-title`}>Subjects covered</h3>
              <p>
                <Value tagName="span">
                  {journal.name || journal.alternateName || journal['@id']}
                </Value>{' '}
                welcomes submissions covering (but not limited to) the following
                subjects:
              </p>
              <SubjectEditor
                entity={journal}
                semanticTagsMap={semanticTagsMap}
                disabled={true}
                readOnly={true}
              />
            </section>
          )}

          {!!publicationTypes.length && (
            <section className={bem`__section --workflows`}>
              <h3 className={bem`__section-title`}>Publication types</h3>

              <p className={bem`__section-description`}>
                Several types of publication are considered and published:
              </p>

              <ExpansionPanelGroup>
                {publicationTypes.map(publicationType => (
                  <ExpansionPanel key={getId(publicationType)}>
                    <ExpansionPanelPreview>
                      {publicationType.name || getId(publicationType)}
                    </ExpansionPanelPreview>
                    <Div>{publicationType.description}</Div>

                    <AuthorGuidelines publicationType={publicationType} />
                  </ExpansionPanel>
                ))}
              </ExpansionPanelGroup>
            </section>
          )}

          {!!workflows.length && (
            <section className={bem`__section --workflows`}>
              <h3 className={bem`__section-title`}>Editorial workflows</h3>

              <p className={bem`__section-description`}>
                Manuscripts are processed according to the following workflows:
              </p>

              <WorkflowList journal={journal} workflows={workflows} />
            </section>
          )}

          {hasSocialMedia && (
            <section className={bem`__section --social`}>
              <h3 className={bem`__section-title`}>Social media</h3>

              <p className={bem`__section-description`}>Follow us on:</p>

              <ul className={bem`contact-details-list`}>
                {!!twitterHandle && (
                  <li className={bem`contact-details-item --twitter`}>
                    <Iconoclass iconName="socialTwitter" size="16px" />
                    <a href={`https://twitter.com/${twitterHandle}`}>
                      {twitterHandle}
                    </a>
                  </li>
                )}
                {!!facebookUrl && (
                  <li className={bem`contact-details-item --facebook`}>
                    <Iconoclass iconName="socialFacebook" size="16px" />
                    <a href={facebookUrl}>{facebookUrl}</a>
                  </li>
                )}
              </ul>
            </section>
          )}

          <section className={bem`__section --submit`}>
            <StartSubmissionButton
              user={user}
              journal={journal}
              raised={true}
              reset={true}
            />
          </section>
        </Card>
      </div>
    );
  }
}
