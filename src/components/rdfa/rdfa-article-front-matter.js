import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Iconoclass from '@scipe/iconoclass';
import {
  getId,
  prefix,
  arrayify,
  getValue,
  unprefix,
  textify
} from '@scipe/jsonld';
import { SA_DOI_PREFIX, getScopeId } from '@scipe/librarian';
import {
  Logo,
  Span,
  H1,
  H2,
  H3,
  Div,
  RdfaDate,
  RdfaLicense,
  RdfaPersonOrOrganization,
  RdfaContributorNotes,
  RdfaCopyright,
  RdfaAbstractText,
  getDisplayName,
  BemTags
} from '@scipe/ui';
import { getOrderedAffiliationMap } from '../../utils/graph-utils';
import { compareAbstracts } from '../../utils/sort';
import MetaMargin, {
  StyleMetaMarginListItem,
  StyleMetaMarginList
} from '../meta-margin/meta-margin';
import MetaMarginContent from '../meta-margin/meta-margin-content';
import MetaMarginMixedData from '../meta-margin/meta-margin-mixed-data';

import ContributorInfoMenu from '../contributor-info-menu';

export default class RdfaArticleFrontMatter extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    graph: PropTypes.object,
    stageId: PropTypes.string,
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
      stageId,
      journal,
      issue,
      isPrinting,
      isPrintable,
      isMobile,
      mainEntity,
      counter,
      blindingData,
      overwriteNodeMap
    } = this.props;

    const authors = arrayify(object.author);
    const contributors = arrayify(object.contributor);
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
                    stageId={stageId}
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
                    stageId={stageId}
                    domValues={domValues}
                  />
                )}
              </MetaMarginContent>
            </MetaMargin>
          </section>
        )}

        {/* Editors and Reviewers */}
        {/* TODO wire: use compareEditors defined in utils/sort.js
         <section>
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
         isMobile={isMobile}
         >
         <div className={bem`__editorial-team__`}>
         <div className={bem`__row`}>
         <span className={bem`__label`}>Editors </span>
         <ul className={bem`@__inline-list`}>
         <li>Name One</li>
         <li>Name Two</li>
         </ul>
         </div>

         <div className={bem`__row`}>
         <span className={bem`__label`}>Reviewers </span>
         <ul className={bem`@__inline-list`}>
         <li>Name One</li>
         <li>Name Two</li>
         </ul>
         </div>
         </div>
         </MetaMargin>
         </section> /*}


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
