import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import slug from 'slug';
import { arrayify, getId, textify } from '@scipe/jsonld';
import { Value, RdfaAbstractText, H1 } from '@scipe/ui';
import { compareAbstracts } from '../utils/sort';
import Annotable from './annotable';
import AnnotableContributorList from './annotable-contributor-list';
import Counter from '../utils/counter';
import LicenseEditor from './license-editor';
import AboutEditor from './about-editor';

export default class ArticleFrontMatter extends React.PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired, // the `CreateReleaseAction` or `TypesettingAction` or `PublishAction` @id providing the resource
    action: PropTypes.shape({
      '@type': PropTypes.oneOf([
        'CreateReleaseAction',
        'TypesettingAction',
        'PublishAction'
      ]).isRequired
    }),
    nodeMap: PropTypes.object,
    releaseRequirement: PropTypes.oneOf([
      'SubmissionReleaseRequirement',
      'ProductionReleaseRequirement'
    ]),

    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,

    resource: PropTypes.object.isRequired // hydrated
  };

  render() {
    const {
      graphId,
      actionId,
      action,
      resource,
      counter,
      createSelector,
      matchingLevel,
      blindingData,
      nodeMap,
      annotable,
      displayAnnotations,
      displayPermalink,
      releaseRequirement
    } = this.props;

    // counters
    let titleCounter,
      subTitleCounter,
      subjectsCounter,
      licenseCounter,
      authorsCounter,
      contributorsCounter;

    const hasTitle = !!resource.name;
    if (hasTitle) {
      titleCounter = counter.increment({
        level: 4,
        key: `article-front-matter-name-${getId(
          resource
        )}-${graphId}` /* we need graphId as user can toggle versions */
      });
    }

    const hasSubTitle = !!resource.headline;
    if (hasSubTitle) {
      subTitleCounter = (hasTitle ? titleCounter.clone() : counter).increment({
        level: hasTitle ? 5 : 4,
        key: `article-front-matter-headline-${getId(
          resource
        )}-${graphId}` /* we need graphId as user can toggle versions */
      });
    }

    const hasSubjects = arrayify(resource.about).some(
      about => getId(about) && getId(about).startsWith('subjects:')
    );
    if (hasSubjects) {
      subjectsCounter = counter.increment({
        level: 4,
        key: `article-front-matter-subjects-${getId(
          resource
        )}-${graphId}` /* we need graphId as user can toggle versions */
      });
    }

    const hasLicense = !!arrayify(resource.license).length;
    if (hasLicense) {
      licenseCounter = counter.increment({
        level: 4,
        key: `article-front-matter-license-${getId(
          resource
        )}-${graphId}` /* we need graphId as user can toggle versions */
      });
    }

    const hasAuthors = !!arrayify(resource.author).length;
    if (hasAuthors) {
      authorsCounter = counter.increment({
        level: 4,
        key: `article-front-matter-authors-${getId(
          resource
        )}-${graphId}` /* we need graphId as user can toggle versions */
      });
    }

    const hasContributors = !!arrayify(resource.contributor).length;
    if (hasContributors) {
      contributorsCounter = counter.increment({
        level: 4,
        key: `article-front-matter-contributors-${getId(
          resource
        )}-${graphId}` /* we need graphId as user can toggle versions */
      });
    }

    return (
      <section className="article-front-matter">
        {/* Title */}
        {hasTitle && (
          <Annotable
            graphId={graphId}
            selectable={false}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: graphId,
                node: getId(resource),
                selectedProperty: 'name'
              },
              `article-front-matter-name-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            )}
            matchingLevel={matchingLevel}
            counter={titleCounter}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <H1 className="article-front-matter__title">{resource.name}</H1>
          </Annotable>
        )}

        {/* Sub-title (headline) (only displayed if there is a title) */}
        {hasSubTitle && (
          <Annotable
            graphId={graphId}
            selectable={false}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: graphId,
                node: getId(resource),
                selectedProperty: 'headline'
              },
              `article-front-matter-headline-${getId(
                resource
              )}-${graphId}` /* we need graphId as user can toggle versions */
            )}
            matchingLevel={matchingLevel}
            counter={subTitleCounter}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <Value className="article-front-matter__sub-title">
              {resource.headline}
            </Value>
          </Annotable>
        )}

        {(hasSubjects || hasLicense) && (
          <section className="article-front-matter__section">
            <div className="article-front-matter__metadata reverse-z-index">
              {hasSubjects && (
                <Fragment>
                  <h2 className="article-front-matter__section__heading">
                    Subjects
                  </h2>

                  <AboutEditor
                    graphId={graphId}
                    actionId={actionId}
                    counter={subjectsCounter}
                    resource={resource}
                    readOnly={true}
                    disabled={true}
                    nodeMap={nodeMap}
                    createSelector={createSelector}
                    matchingLevel={matchingLevel}
                    annotable={annotable}
                    displayAnnotations={displayAnnotations}
                    displayPermalink={displayPermalink}
                  />
                </Fragment>
              )}

              {hasLicense && (
                <Fragment>
                  <h2 className="article-front-matter__section__heading">
                    License
                  </h2>

                  <LicenseEditor
                    graphId={graphId}
                    actionId={actionId}
                    resource={resource}
                    counter={licenseCounter}
                    readOnly={true}
                    disabled={true}
                    createSelector={createSelector}
                    matchingLevel={matchingLevel}
                    annotable={annotable}
                    displayAnnotations={displayAnnotations}
                    displayPermalink={displayPermalink}
                  />
                </Fragment>
              )}
            </div>
          </section>
        )}

        {hasAuthors && (
          <section className="article-front-matter__section">
            <h2
              className="article-front-matter__section__heading"
              id={'authors' /* used for the ToC*/}
            >
              Authors
            </h2>
            <AnnotableContributorList
              graphId={graphId}
              actionId={actionId}
              action={action}
              resource={resource}
              property="author"
              counter={authorsCounter}
              releaseRequirement={releaseRequirement}
              createSelector={createSelector}
              matchingLevel={matchingLevel}
              disabled={true}
              readOnly={true}
              blindingData={blindingData}
              annotable={annotable}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
            />
          </section>
        )}

        {hasContributors && (
          <section className="article-front-matter__section">
            <h2
              className="article-front-matter__section__heading"
              id={'contributors' /* used for the ToC*/}
            >
              Contributors
            </h2>
            <AnnotableContributorList
              graphId={graphId}
              actionId={actionId}
              action={action}
              resource={resource}
              property="contributor"
              counter={contributorsCounter}
              releaseRequirement={releaseRequirement}
              createSelector={createSelector}
              matchingLevel={matchingLevel}
              disabled={true}
              readOnly={true}
              blindingData={blindingData}
              annotable={annotable}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
            />
          </section>
        )}

        {arrayify(resource.detailedDescription)
          .sort(compareAbstracts)
          .map((abstract, i) => (
            <section
              key={getId(abstract)}
              className="article-front-matter__section"
            >
              <Value
                tagName="h2"
                id={
                  slug(textify(abstract.name), {
                    lower: true
                  }) /* used for the ToC*/
                }
                className="article-front-matter__section__heading"
              >
                {abstract.name}
              </Value>
              <Annotable
                className="resource-metadata__rich-text-container"
                graphId={graphId}
                selectable={false}
                selector={createSelector(
                  {
                    '@type': 'NodeSelector',
                    graph: graphId,
                    node: getId(resource),
                    selectedProperty: 'detailedDescription',
                    selectedItem: getId(abstract)
                  },
                  `article-front-matter-detailed-description-${getId(
                    resource
                  )}-${getId(
                    abstract
                  )}-${graphId}` /* we need graphId as user can toggle versions */
                )}
                matchingLevel={matchingLevel}
                counter={counter.increment({
                  level: 4,
                  key: `article-front-matter-detailed-description-${getId(
                    abstract
                  )}-${graphId}` /* we need graphId as user can toggle versions */
                })}
                annotable={annotable}
                displayAnnotations={displayAnnotations}
                displayPermalink={displayPermalink}
              >
                <RdfaAbstractText object={abstract} />
              </Annotable>
            </section>
          ))}
      </section>
    );
  }
}
