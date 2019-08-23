import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import capitalize from 'lodash/capitalize';
import Iconoclass from '@scipe/iconoclass';
import {
  getId,
  prefix,
  arrayify,
  getValue,
  unprefix,
  textify
} from '@scipe/jsonld';
import { SA_DOI_PREFIX, getScopeId, getAgentId } from '@scipe/librarian';
import {
  Logo,
  Span,
  H1,
  H2,
  H3,
  Div,
  RdfaDate,
  RdfaLicense,
  RdfaPerson,
  RdfaPersonOrOrganization,
  RdfaContributorNotes,
  RdfaCopyright,
  RdfaAbstractText,
  getDisplayName,
  BemTags,
  getWorkflowBadgePaths,
  WorkflowBadge
} from '@scipe/ui';
import { getOrderedAffiliationMap } from '../../utils/graph-utils';
import { compareAbstracts } from '../../utils/sort';
import MetaMargin, {
  StyleMetaMarginListItem,
  StyleMetaMarginList
} from '../meta-margin/meta-margin';
import MetaMarginContent from '../meta-margin/meta-margin-content';
import MetaMarginMixedData from '../meta-margin/meta-margin-mixed-data';
import Droplet from '../droplet';
import ContributorInfoMenu from '../contributor-info-menu';
import { createActionMapSelector } from '../../selectors/graph-selectors';

export default class RdfaArticleFrontMatter extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    graph: PropTypes.object.isRequired,
    journal: PropTypes.object,
    issue: PropTypes.object,
    object: PropTypes.object.isRequired,
    overwriteNodeMap: PropTypes.object,
    isPrinting: PropTypes.bool.isRequired,
    isPrintable: PropTypes.bool,
    isMobile: PropTypes.bool.isRequired,
    mainEntity: PropTypes.object,
    blindingData: PropTypes.object.isRequired,
    className: PropTypes.string,
    counter: PropTypes.object.isRequired
  };

  render() {
    const {
      id,
      className,
      object,
      graph,
      journal,
      issue,
      isPrinting,
      isPrintable,
      isMobile,
      mainEntity,
      counter,
      blindingData,
      overwriteNodeMap,
      graphId
    } = this.props;

    const authors = arrayify(object.author);
    const contributors = arrayify(object.contributor);
    const reviewers = arrayify(graph.reviewer);
    const editors = arrayify(graph.editor);
    const producers = arrayify(graph.producer);
    const affiliationMap = getOrderedAffiliationMap(object);

    const publicationType = arrayify(graph.additionalType)[0];

    const isBlinded = !blindingData.visibleRoleNames.has('author');

    const bem = BemTags('@sa', '@meta-margin');

    return (
      <section
        id={id}
        resource={getId(object)}
        typeof={prefix(object['@type'])}
        className={classNames(className, bem`rdfa-article-front-matter`)}
      >
        {/* Title and subtitle */}
        {(object.name || object.headline) && (
          <MetaMargin
            url={counter
              .increment({ level: 2 })
              .increment({ level: 3 })
              .getUrl()}
            margin={true}
            graph={graph}
            resource={object}
            mainEntity={mainEntity}
            isPrinting={isPrinting}
            isPrintable={isPrintable}
            fillDeadSpace={false}
            isMobile={isMobile}
            updateDomBasedOn={object}
            bigQR={isPrinting}
            className={bem`__meta-margin-title-container`}
          >
            <header>
              {!!object.name && (
                <H1 property="schema:name" className={bem`__title`}>
                  {object.name}
                </H1>
              )}
              {!!object.headline && (
                <Div property="schema:headline" className={bem`__subtitle`}>
                  {object.headline}
                </Div>
              )}
            </header>

            <MetaMarginContent>
              <StyleMetaMarginList className={bem`__article-margin-info`}>
                {isPrinting && !!journal && (
                  <StyleMetaMarginListItem>
                    {!!journal.logo && (
                      <Logo logo={journal.logo} className={bem`__logo`} />
                    )}
                    <H3 className={bem`__journal-name`}>
                      {journal.name || journal.alternateName || getId(journal)}
                    </H3>
                  </StyleMetaMarginListItem>
                )}

                <StyleMetaMarginListItem>
                  <StyleMetaMarginList>
                    {!!issue && (
                      <StyleMetaMarginListItem>
                        <span className={bem`__margin-issue-title`}>
                          {issue['@type'] === 'PublicationIssue'
                            ? `Issue ${issue.issueNumber}`
                            : textify(issue.name) ||
                              (unprefix(getId(issue)) || '').split('/', 2)[1]}
                        </span>
                      </StyleMetaMarginListItem>
                    )}

                    {!!publicationType && (
                      <StyleMetaMarginListItem>
                        <Span>{publicationType.name}</Span>
                      </StyleMetaMarginListItem>
                    )}

                    {graph.version && (
                      <StyleMetaMarginListItem>
                        Version: {getValue(graph.version)}
                      </StyleMetaMarginListItem>
                    )}

                    {(graph.slug || getId(graph)) && (
                      <StyleMetaMarginListItem icon={true}>
                        <Iconoclass
                          iconName="doi"
                          size={isPrinting ? '12px' : '16px'}
                        />
                        <a
                          href={`https://doi.org/${SA_DOI_PREFIX}/${graph.slug ||
                            unprefix(getScopeId(graph))}`}
                        >{`${SA_DOI_PREFIX}/${graph.slug ||
                          unprefix(getScopeId(graph))}`}</a>
                      </StyleMetaMarginListItem>
                    )}
                    {graph.datePublished && (
                      <StyleMetaMarginListItem icon={true}>
                        {/*Published on:{' '}*/}
                        <Iconoclass
                          iconName="calendar"
                          size={isPrinting ? '12px' : '16px'}
                        />
                        <RdfaDate
                          object={graph.datePublished}
                          predicate="schema:datePublished"
                        />
                      </StyleMetaMarginListItem>
                    )}
                  </StyleMetaMarginList>
                </StyleMetaMarginListItem>

                <StyleMetaMarginListItem>
                  <StyleMetaMarginList icon={true} className={bem`@--space`}>
                    <StyleMetaMarginListItem icon={true}>
                      <Iconoclass
                        iconName="accessOpen"
                        size={isPrinting ? '12px' : '16px'}
                      />
                      Open Access
                    </StyleMetaMarginListItem>
                    {arrayify(object.license).map(license => (
                      <StyleMetaMarginListItem
                        key={getId(license) || JSON.stringify(license)}
                      >
                        <RdfaLicense
                          showName={true}
                          object={license}
                          predicate="schema:license"
                          isPrinting={isPrinting}
                        />
                      </StyleMetaMarginListItem>
                    ))}
                  </StyleMetaMarginList>
                </StyleMetaMarginListItem>

                {/* Copyright TODO blind instead of removing */}
                {!isBlinded &&
                  (object.copyrightYear || object.copyrightHolder) && (
                    <StyleMetaMarginListItem>
                      <RdfaCopyright object={object} />
                    </StyleMetaMarginListItem>
                  )}
              </StyleMetaMarginList>
            </MetaMarginContent>
          </MetaMargin>
        )}

        {/* Authors and Contributors */}
        {(!!authors.length || !!contributors.length) && (
          <section id={`${getId(object)}::authors`} className={bem`authors`}>
            <MetaMargin
              margin={true}
              url={counter
                .increment({ level: 2 })
                .increment({ level: 3 })
                .getUrl()}
              graph={graph}
              resource={object}
              mainEntity={mainEntity}
              isPrinting={isPrinting}
              isPrintable={isPrintable}
              fillDeadSpace={false}
              isMobile={isMobile}
              isBlinded={isBlinded}
              updateDomBasedOn={object}
            >
              <ol className={bem`@__inline-list __authors-list`}>
                {/* Authors */}
                {authors.map(author => (
                  <li
                    key={getId(author) || JSON.stringify(author)}
                    className={bem`__authors-list-item`}
                    property={prefix('author')}
                    typeof={prefix('ContributorRole')}
                  >
                    <RdfaPersonOrOrganization
                      className={
                        isBlinded
                          ? 'rdfa-article-front-matter--blinded'
                          : undefined
                      }
                      blindedName={
                        isBlinded
                          ? getDisplayName(blindingData, author, {
                              alwaysPrefix: true
                            })
                          : undefined
                      }
                      object={author}
                      predicate={prefix('author')}
                      link={isPrinting ? true : false}
                    />
                    {!isBlinded && (
                      <ContributorInfoMenu
                        role={author}
                        isPrinting={isPrinting}
                      />
                    )}

                    <RdfaContributorNotes
                      object={author}
                      mainEntity={mainEntity}
                    />
                  </li>
                ))}

                {/* Contributors */}
                {/* Note that we currently merge authors and contributors */}
                {contributors.map(contributor => (
                  <li
                    key={getId(contributor) || JSON.stringify(contributor)}
                    className={bem`__authors-list-item`}
                    property={prefix('contributor')}
                    typeof={prefix('ContributorRole')}
                  >
                    <RdfaPersonOrOrganization
                      className={
                        isBlinded
                          ? 'rdfa-article-front-matter--blinded'
                          : undefined
                      }
                      blindedName={
                        isBlinded
                          ? getDisplayName(blindingData, contributor, {
                              alwaysPrefix: true
                            })
                          : undefined
                      }
                      object={contributor}
                      predicate={prefix('contributor')}
                      link={isPrinting ? true : false}
                    />
                    {!isBlinded && (
                      <ContributorInfoMenu
                        role={contributor}
                        isPrinting={isPrinting}
                      />
                    )}
                    <RdfaContributorNotes
                      object={contributor}
                      mainEntity={mainEntity}
                    />
                  </li>
                ))}
              </ol>

              <MetaMarginContent>
                {domValues => (
                  <MetaMarginMixedData
                    graphId={getId(graph)}
                    domValues={domValues}
                    overwriteNodeMap={overwriteNodeMap}
                  />
                )}
              </MetaMarginContent>
            </MetaMargin>
          </section>
        )}

        {/* Affiliations. Note this rely on the numbering of the <ol>. If smtg else is used we should add an explicit label (present in the `affiliationMap` values) */}
        {!!affiliationMap.size && (
          <section className={bem`__affiliations`}>
            <MetaMargin
              margin={true}
              url={counter
                .increment({ level: 2 })
                .increment({ level: 3 })
                .getUrl()}
              graph={graph}
              resource={object}
              mainEntity={mainEntity}
              isPrinting={isPrinting}
              isPrintable={isPrintable}
              fillDeadSpace={false}
              updateDomBasedOn={object}
              isMobile={isMobile}
              isBlinded={isBlinded}
            >
              <ol className={bem`__affiliation-list`}>
                {Array.from(affiliationMap.values()).map(({ affiliation }) => (
                  <li
                    key={getId(affiliation)}
                    id={getId(affiliation)}
                    className={bem`__affiliation-list-item`}
                  >
                    <RdfaPersonOrOrganization
                      object={affiliation}
                      blindedName={
                        isBlinded
                          ? getDisplayName(blindingData, affiliation, {
                              subject: 'organization',
                              alwaysPrefix: true
                            })
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ol>
              <MetaMarginContent>
                {domValues => (
                  <MetaMarginMixedData
                    graphId={getId(graph)}
                    domValues={domValues}
                  />
                )}
              </MetaMarginContent>
            </MetaMargin>
          </section>
        )}

        {/* Editors, Reviewers and Producers */}
        {!!(editors.length || reviewers.length || producers.length) && (
          <section className={bem`journal-participants__`}>
            <MetaMargin
              margin={true}
              url={counter
                .increment({ level: 2 })
                .increment({ level: 3 })
                .getUrl()}
              graph={graph}
              resource={object}
              mainEntity={mainEntity}
              isPrintable={isPrintable}
              isPrinting={isPrinting}
              isMobile={isMobile}
            >
              <h2>Journal participants</h2>

              <div className={bem`__list`}>
                {['editor', 'reviewer', 'producer']
                  .filter(p => arrayify(graph[p]).length)
                  .map(p => (
                    <div key={p} className={bem`__list__row`}>
                      <span className={bem`__list__label`}>
                        {`${capitalize(p)}s`}{' '}
                      </span>
                      <ul className={bem`@__inline-list`}>
                        {arrayify(graph[p]).map(role => {
                          const isBlinded = !blindingData.visibleRoleNames.has(
                            p
                          );

                          return (
                            <li key={getId(role)}>
                              <Droplet node={getAgentId(role)}>
                                {unroled => {
                                  const hydratedRole = Object.assign({}, role, {
                                    [p]: unroled
                                  });

                                  return (
                                    <Fragment>
                                      <RdfaPerson
                                        className={
                                          isBlinded
                                            ? 'rdfa-article-front-matter--blinded'
                                            : undefined
                                        }
                                        blindedName={
                                          isBlinded
                                            ? getDisplayName(
                                                blindingData,
                                                hydratedRole,
                                                {
                                                  alwaysPrefix: true
                                                }
                                              )
                                            : undefined
                                        }
                                        object={hydratedRole}
                                        predicate={prefix(p)}
                                        link={isPrinting ? true : false}
                                      />
                                      {!isBlinded && (
                                        <ContributorInfoMenu
                                          role={hydratedRole}
                                          isPrinting={isPrinting}
                                        />
                                      )}
                                    </Fragment>
                                  );
                                }}
                              </Droplet>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </div>

              <MetaMarginContent>
                <div className={bem`__meta-margin-workflow-badge-container`}>
                  <ConnectedWorkflowBadge
                    graphId={graphId}
                    graph={graph}
                    mainEntity={mainEntity}
                    badgeWidth={260}
                    badgeHeight={108}
                  />
                </div>
              </MetaMarginContent>
            </MetaMargin>
          </section>
        )}

        {/* Description (short abstract without title) */}
        {!!object.description && (
          <section role="doc-abstract">
            <MetaMargin
              margin={true}
              url={counter
                .increment({ level: 2 })
                .increment({ level: 3 })
                .getUrl()}
              graph={graph}
              resource={object}
              updateDomBasedOn={object}
              mainEntity={mainEntity}
              isPrinting={isPrinting}
              isPrintable={isPrintable}
              fillDeadSpace={isPrinting}
              isMobile={isMobile}
            >
              <Div property="schema:description">{object.description}</Div>
            </MetaMargin>
          </section>
        )}

        {/* Abstracts (including impact statement, if any) */}
        {arrayify(object.detailedDescription)
          .filter(abstract => abstract.name && abstract.text)
          .sort(compareAbstracts)
          .map(abstract => (
            <section
              id={`${getId(abstract)}::abstract`}
              key={getId(abstract) || JSON.stringify(abstract)}
              role="doc-abstract"
              property={prefix('detailedDescription')}
              resource={getId(abstract)}
              typeof={prefix(abstract['@type'])}
              className={bem`__abstract`}
            >
              <MetaMargin
                margin={true}
                url={counter
                  .increment({ level: 2 })
                  .increment({ level: 3 })
                  .getUrl()}
                graph={graph}
                resource={object}
                updateDomBasedOn={object}
                mainEntity={mainEntity}
                isPrinting={isPrinting}
                isPrintable={isPrintable}
                fillDeadSpace={isPrinting}
                isMobile={isMobile}
              >
                <H2
                  className={bem`__abstract-title ${
                    abstract['@type'] == 'WPImpactStatement' ? '--impact' : ''
                  }`}
                  property="schema:name"
                >
                  {abstract.name}
                </H2>
                <div
                  property="schema:text"
                  className={bem`__abstract-content ${
                    abstract['@type'] == 'WPImpactStatement' ? '--impact' : ''
                  }`}
                >
                  <RdfaAbstractText object={abstract} />
                </div>
              </MetaMargin>
            </section>
          ))}
      </section>
    );
  }
}

const ConnectedWorkflowBadge = connect(
  createSelector(
    createActionMapSelector(),
    (state, props) => props.graph,
    (state, props) => props.mainEntity,
    (actionMap, graph, mainEntity = {}) => {
      const stages = Object.values(actionMap).filter(
        action => action['@type'] === 'StartWorkflowStageAction'
      );

      return {
        viewIdentityPermissionMatrix: arrayify(
          graph.hasDigitalDocumentPermission
        ).reduce(
          (matrix, perm) => {
            if (perm.permissionType === 'ViewIdentityPermission') {
              if (perm.grantee && perm.grantee.audienceType) {
                arrayify(perm.permissionScope).forEach(permissionScope => {
                  if (permissionScope.audienceType) {
                    matrix[perm.grantee.audienceType][
                      permissionScope.audienceType
                    ] = true;
                  }
                });
              }
            }

            return matrix;
          },
          {
            author: {
              author: false,
              editor: false,
              reviewer: false,
              producer: false
            },
            editor: {
              author: false,
              editor: false,
              reviewer: false,
              producer: false
            },
            reviewer: {
              author: false,
              editor: false,
              reviewer: false,
              producer: false
            },
            producer: {
              author: false,
              editor: false,
              reviewer: false,
              producer: false
            },
            public: {
              author: false,
              editor: false,
              reviewer: false,
              producer: false
            }
          }
        ),
        startTime: new Date(graph.dateSubmitted || graph.dateCreated),
        endTime: new Date(
          graph.dateEnded ||
            graph.dateModified ||
            graph.datePublished ||
            graph.dateRejected ||
            graph.dateSubmitted ||
            graph.dateCreated
        ),
        paths: getWorkflowBadgePaths(stages, { nCat: 3 }),
        counts: {
          authors: arrayify(mainEntity.author).concat(
            arrayify(mainEntity.contributor)
          ).length,
          editors: arrayify(graph.editor).length,
          reviewers: arrayify(graph.reviewer).length,
          producers: arrayify(graph.producer).length
        }
      };
    }
  )
)(WorkflowBadge);

ConnectedWorkflowBadge.propTypes = {
  graphId: PropTypes.string.isRequired,
  graph: PropTypes.object.isRequired,
  mainEntity: PropTypes.object
};
