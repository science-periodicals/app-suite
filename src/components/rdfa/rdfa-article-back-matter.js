import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import omit from 'lodash/omit';
import uniqBy from 'lodash/uniqBy';
import { arrayify, getId, embed, unrole, createValue } from '@scipe/jsonld';
import {
  RdfaCitation,
  RdfaFundingTable,
  BemTags,
  getFunderTree,
  H2,
  getResourceInfo
} from '@scipe/ui';
import { createGraphDataSelector } from '../../selectors/graph-selectors';
import MetaMargin from '../meta-margin/meta-margin';
import MetaMarginContent from '../meta-margin/meta-margin-content';
import MetaMarginMixedData from '../meta-margin/meta-margin-mixed-data';
import MetaMarginCitationIdentifiers from '../meta-margin/meta-margin-citation-identifiers';
import PrintableResource from '../printable-resource';
import RdfaArticleBodySection from './rdfa-article-body-section';
import { compareCitations } from '../../utils/sort';
import { AnonymousSectionNotice } from '../notice';
import OnlineResources from '../online-resources';
import RdfaArticleNotes from './rdfa-article-notes';

class RdfaArticleBackMatter extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    journal: PropTypes.object,
    issue: PropTypes.object,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    object: PropTypes.object.isRequired,
    content: PropTypes.object,
    overwriteNodeMap: PropTypes.object,
    isMobile: PropTypes.bool,
    isPrinting: PropTypes.bool,
    isPrintable: PropTypes.bool,
    counter: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,

    // redux
    mainEntityBodyResources: PropTypes.arrayOf(PropTypes.object), // hydrated resources part of the main body
    onlineResources: PropTypes.arrayOf(PropTypes.object), // hydrated resources part of the main body but not displayable in print (Audio, Video etc.)
    supportingResources: PropTypes.arrayOf(PropTypes.object), // hydrated supporting  resources
    acknowledgeAction: PropTypes.object,
    disclosureAction: PropTypes.object,
    funderTree: PropTypes.array
  };

  static defaultProps = {
    content: {}
  };

  render() {
    const {
      id,
      className,
      journal,
      issue,
      graphId,
      stageId,
      graph,
      mainEntity,
      object,
      overwriteNodeMap,
      funderTree,
      isMobile,
      isPrinting,
      isPrintable,
      blindingData,
      counter,
      content: { articleBackMatter, articleSupportingInformation },
      mainEntityBodyResources,
      onlineResources,
      supportingResources
    } = this.props;

    const bem = BemTags('@sa', '@meta-margin');

    const isBlinded = !blindingData.visibleRoleNames.has('author');

    const sections = arrayify(articleBackMatter).filter(
      section => section.type && section.type.startsWith('WP')
    );

    const citations = uniqBy(
      arrayify(object.citation)
        .map(citation => unrole(citation, 'citation'))
        .filter(citation => getId(citation) && typeof citation !== 'string'),
      citation => getId(citation)
    ).sort(compareCitations);

    return (
      <section
        id={id || `${getId(object)}::back-matter`}
        className={classNames(className, bem`rdfa-article-back-matter`, {
          'rdfa-article-back-matter--print': isPrinting
        })}
      >
        {sections.map(section => {
          const h2 = arrayify(section.children).find(
            node => node.$node.localName === 'h2'
          );

          switch (section.type) {
            case 'WPFunding':
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="rdfa-article-back-matter__funding"
                >
                  <MetaMargin
                    margin={true}
                    url={counter
                      .increment({ level: 2 })
                      .increment({ level: 3 })
                      .getUrl()}
                    graph={graph}
                    mainEntity={mainEntity}
                    resource={mainEntity}
                    isMobile={isMobile}
                    isPrinting={isPrinting}
                    fillDeadSpace={isPrinting}
                    isPrintable={isPrintable}
                  >
                    <H2 id={h2.id}>{createValue(h2.$node.innerHTML)}</H2>
                  </MetaMargin>

                  {isBlinded ? (
                    <AnonymousSectionNotice />
                  ) : (
                    <MetaMargin
                      margin={true}
                      url={counter.increment({ level: 3 }).getUrl()}
                      graph={graph}
                      mainEntity={mainEntity}
                      resource={mainEntity}
                      isMobile={isMobile}
                      isPrinting={isPrinting}
                      fillDeadSpace={isPrinting}
                      isPrintable={isPrintable}
                      inline={isPrinting}
                    >
                      <RdfaFundingTable
                        object={graph}
                        funderTree={funderTree}
                      />
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
                  )}
                </section>
              );

            case 'WPReferenceList': {
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="rdfa-article-back-matter__citations"
                >
                  <MetaMargin
                    margin={true}
                    url={counter
                      .increment({ level: 2 })
                      .increment({ level: 3 })
                      .getUrl()}
                    graph={graph}
                    mainEntity={mainEntity}
                    resource={mainEntity}
                    isMobile={isMobile}
                    isPrinting={isPrinting}
                    fillDeadSpace={isPrinting}
                    isPrintable={isPrintable}
                  >
                    <H2 id={h2.id}>
                      {createValue(h2.$node.innerHTML || 'References')}
                    </H2>
                  </MetaMargin>

                  <ul className="rdfa-article-back-matter__citations-list">
                    {citations.map(citation => (
                      <li
                        key={getId(citation) || JSON.stringify(citation)}
                        className="rdfa-article-back-matter__citation"
                      >
                        <MetaMargin
                          margin={true}
                          url={counter.increment({ level: 3 }).getUrl()}
                          graph={graph}
                          mainEntity={mainEntity}
                          resource={mainEntity}
                          isMobile={isMobile}
                          isPrinting={isPrinting}
                          fillDeadSpace={isPrinting}
                          isPrintable={isPrintable}
                          updateDomBasedOn={citation}
                        >
                          <RdfaCitation
                            object={citation}
                            predicate="schema:citation"
                            isPrinting={isPrinting}
                            displayDoi={isMobile && !isPrinting}
                            displayIsbn={isMobile && !isPrinting}
                          />
                          <MetaMarginContent>
                            <MetaMarginCitationIdentifiers
                              citation={citation}
                              isPrinting={isPrinting}
                              section="back-matter"
                            />
                          </MetaMarginContent>
                        </MetaMargin>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }

            default:
              if (isBlinded) {
                const blindedSection = Object.assign(
                  omit(section, ['children']),
                  {
                    children: h2
                  }
                );

                return (
                  <RdfaArticleBodySection
                    key={section.id}
                    level={1}
                    counter={counter.increment({ level: 2 }).clone()}
                    graphId={graphId}
                    stageId={stageId}
                    graph={graph}
                    mainEntity={mainEntity}
                    object={object}
                    overwriteNodeMap={overwriteNodeMap}
                    isMobile={isMobile}
                    isPrinting={isPrinting}
                    isPrintable={isPrintable}
                    blindingData={blindingData}
                    content={blindedSection}
                  >
                    <AnonymousSectionNotice />
                  </RdfaArticleBodySection>
                );
              } else {
                return (
                  <RdfaArticleBodySection
                    key={section.id}
                    level={1}
                    counter={counter.increment({ level: 2 }).clone()}
                    graphId={graphId}
                    stageId={stageId}
                    graph={graph}
                    mainEntity={mainEntity}
                    object={object}
                    overwriteNodeMap={overwriteNodeMap}
                    isMobile={isMobile}
                    isPrinting={isPrinting}
                    isPrintable={isPrintable}
                    blindingData={blindingData}
                    content={section}
                  />
                );
              }
          }
        })}

        {/* Supporting information */}
        {articleSupportingInformation &&
        articleSupportingInformation.length &&
        !isPrinting ? (
          <section id={`${getId(object)}::supporting-information`}>
            <RdfaArticleBodySection
              level={1}
              counter={counter.increment({ level: 2 }).clone()}
              graphId={graphId}
              stageId={stageId}
              graph={graph}
              mainEntity={mainEntity}
              object={object}
              overwriteNodeMap={overwriteNodeMap}
              isMobile={isMobile}
              isPrinting={isPrinting}
              isPrintable={isPrintable}
              blindingData={blindingData}
              content={articleSupportingInformation[0]}
            />
          </section>
        ) : null}

        {/* In print mode (and in print mode only) we insert the list of all the figures / tables at the end of the document*/}
        {isPrinting && !!mainEntityBodyResources.length && (
          <section>
            {mainEntityBodyResources.map(resource => {
              const url = counter.getUrl(`rdfa-figure-${getId(resource)}`);

              // `Formula` (equations), `SoftwareSourceCode` and `TextBox` are
              // kept inline and Dataset, Audio and Video are moved to the
              // OnlineResources notice
              return resource['@type'] === 'Formula' ||
                resource['@type'] === 'TextBox' ||
                resource['@type'] === 'SoftwareSourceCode' ||
                resource['@type'] === 'Dataset' ||
                resource['@type'] === 'Audio' ||
                resource['@type'] === 'Video' ? null : (
                <PrintableResource
                  key={getId(resource)}
                  id={getId(resource)}
                  journal={journal}
                  issue={issue}
                  url={url}
                  graphId={graphId}
                  stageId={stageId}
                  graph={graph}
                  mainEntity={mainEntity}
                  resource={resource}
                  blindingData={blindingData}
                  isPrintable={isPrintable}
                />
              );
            })}
          </section>
        )}

        {isPrinting &&
        ((articleSupportingInformation &&
          articleSupportingInformation.length) ||
          (supportingResources && supportingResources.length) ||
          (onlineResources && onlineResources.length)) ? (
          <OnlineResources
            counter={counter
              .increment({ level: 2 })
              .increment({
                level: 3 /* we compensate for the fact that the section header is not rendered in print */
              })
              .clone()}
            graph={graph}
            mainEntity={mainEntity}
            isMobile={isMobile}
            isPrinting={isPrinting}
            isPrintable={isPrintable}
            blindingData={blindingData}
            hasSupportingInformation={
              !!(
                articleSupportingInformation &&
                articleSupportingInformation.length
              )
            }
            onlineResources={onlineResources}
            supportingResources={supportingResources}
          />
        ) : null}

        {/* Footnotes and Endnotes */}
        <RdfaArticleNotes
          graphId={graphId}
          graph={graph}
          stageId={stageId}
          mainEntity={mainEntity}
          overwriteNodeMap={overwriteNodeMap}
          counter={counter.increment({ level: 2 }).clone()}
          isPrinting={isPrinting}
          isPrintable={isPrintable}
          isMobile={isMobile}
          blindingData={blindingData}
        />
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.content,
    (state, props) => props.overwriteNodeMap,
    createGraphDataSelector(),
    (content, overwriteNodeMap, { graph, nodeMap } = {}) => {
      nodeMap = overwriteNodeMap || nodeMap;
      const resourceInfo = getResourceInfo(graph, nodeMap, {
        sort: true
      });

      // hydrate the graph
      const framedResources = resourceInfo.resourceIds.map(resourceId => {
        return embed(resourceId, nodeMap, {
          blacklist: ['potentialAction', 'resourceOf']
        });
      });

      const hydratedGraph = Object.assign({}, graph, {
        '@graph': framedResources
      });

      const funderTree = getFunderTree(hydratedGraph);

      const mainEntity = framedResources.find(
        r => getId(r) === getId(graph.mainEntity)
      );
      // !! we need to exclude the parts in multi part figure case
      // => we only take the first level of parts of the `mainEntity`
      const mainEntityBodyResources = arrayify(mainEntity.hasPart).filter(
        resource => !resource.isSupportingResource
      );

      const supportingResources = arrayify(mainEntity.hasPart).filter(
        resource => resource.isSupportingResource
      );

      const onlineResources = mainEntityBodyResources.filter(
        resource =>
          resource['@type'] === 'Dataset' ||
          resource['@type'] === 'Audio' ||
          resource['@type'] === 'Video'
      );

      return {
        funderTree: funderTree,
        mainEntityBodyResources,
        supportingResources,
        onlineResources
      };
    }
  )
)(RdfaArticleBackMatter);
