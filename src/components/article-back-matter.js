import React from 'react';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import { getId, arrayify, createValue } from '@scipe/jsonld';
import { H2 } from '@scipe/ui';
import Citations from './citations';
import ArticleBodySection from './article-body-section';
import { AnonymousSectionNotice } from './notice';
import Annotable from './annotable';
import Counter from '../utils/counter';
import Funding from './funding';

export default class ArticleBackMatter extends React.PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired, // the CreateReleaseAction or TypesettingAction @id providing the resource

    resource: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    blindingData: PropTypes.object.isRequired,

    content: PropTypes.object,
    nodeMap: PropTypes.object
  };

  static defaultProps = {
    content: {}
  };

  renderBlindedSection($section) {
    if (!$section) return null;

    const { blindingData } = this.props;
    const isBlinded = !blindingData.visibleRoleNames.has('author');
    if (isBlinded) {
      let blindedSection = omit($section, ['children']);
      const h2 = $section.children.find(
        child => child.$node.localName === 'h2'
      );
      if (h2) {
        blindedSection = Object.assign(blindedSection, { children: h2 });
      }

      return (
        <ArticleBodySection {...this.props} content={blindedSection}>
          <AnonymousSectionNotice />
        </ArticleBodySection>
      );
    }

    return <ArticleBodySection {...this.props} content={$section} />;
  }

  renderSectionTitle(contentNode = {}, fallback, fallbackId) {
    const h2 = arrayify(contentNode.children).find(
      node => node.$node.localName === 'h2'
    );

    if (h2) {
      return (
        <H2 id={h2.id || fallbackId}>
          {createValue(h2.$node.innerHTML || fallback)}
        </H2>
      );
    }

    return <span id={fallbackId}>{fallback}</span>;
  }

  render() {
    const {
      graphId,
      createSelector,
      matchingLevel,
      resource,
      counter,
      annotable,
      displayAnnotations,
      displayPermalink,
      blindingData,
      nodeMap,
      content: { articleBackMatter, articleSupportingInformation }
    } = this.props;

    const isBlinded = !blindingData.visibleRoleNames.has('author');

    const sections = arrayify(articleBackMatter).filter(
      section => section.type && section.type.startsWith('WP')
    );

    return (
      <section className="article-back-matter">
        {sections.map(section => {
          const h2 = arrayify(section.children).find(
            node => node.$node.localName === 'h2'
          );

          switch (section.type) {
            case 'WPFunding':
              return (
                <section
                  key={section.id}
                  className="article-back-matter__section"
                >
                  <div className="article-body-section__marker-symbol">
                    {String.fromCharCode(167)}
                  </div>

                  <Annotable
                    graphId={graphId}
                    selector={createSelector(
                      {
                        '@type': 'NodeSelector',
                        graph: graphId,
                        node: getId(resource),
                        selectedProperty: 'encoding',
                        hasSubSelector: {
                          '@type': 'HtmlSelector',
                          graph: graphId,
                          htmlId: h2.id
                        }
                      },
                      `article-back-matter-${h2.id}-${graphId}` /* we need graphId as user can toggle versions */
                    )}
                    matchingLevel={matchingLevel}
                    counter={counter.increment({
                      level: 4,
                      key: `article-back-matter-${h2.id}-${graphId}` /* we need graphId as user can toggle versions */,
                      value: h2.annotableIndex
                    })}
                    annotable={annotable}
                    displayAnnotations={displayAnnotations}
                    displayPermalink={displayPermalink}
                  >
                    <H2 id={h2.id}>{createValue(h2.$node.innerHTML)}</H2>
                  </Annotable>

                  <Annotable
                    graphId={graphId}
                    selector={createSelector(
                      {
                        '@type': 'NodeSelector',
                        graph: graphId,
                        node: getId(resource),
                        selectedProperty: 'funder'
                      },
                      `article-back-matter-${section.type}-${graphId}` /* we need graphId as user can toggle versions */
                    )}
                    matchingLevel={matchingLevel}
                    counter={counter.increment({
                      level: 4,
                      key: `article-back-matter-${section.type}-${graphId}` /* we need graphId as user can toggle versions */,
                      value: section.children[1].annotableIndex
                    })}
                    annotable={annotable}
                    displayAnnotations={displayAnnotations}
                    displayPermalink={displayPermalink}
                  >
                    {isBlinded ? (
                      <AnonymousSectionNotice />
                    ) : (
                      <Funding graphId={graphId} nodeMap={nodeMap} />
                    )}
                  </Annotable>
                </section>
              );

            case 'WPReferenceList': {
              // Note: we only render citations if there is a bibliograph
              // section in the MS (as a DS3 document can contain citations even
              // if the user didn't inserted a citation section)

              const citationSectionCounter = counter.increment({
                level: 4,
                key: `article-back-matter-${section.type}-${graphId}` /* we need graphId as user can toggle versions */,
                value: h2.annotableIndex
              });

              const citationCounter = counter.increment({
                level: 4,
                key: `article-back-matter-${section.type}-citations-${graphId}` /* we need graphId as user can toggle versions */,
                value: h2.annotableIndex
              });

              return (
                <section
                  key={section.id}
                  className="article-back-matter__section"
                >
                  <div className="article-body-section__marker-symbol">
                    {String.fromCharCode(167)}
                  </div>

                  <Annotable
                    graphId={graphId}
                    selector={createSelector(
                      {
                        '@type': 'NodeSelector',
                        graph: graphId,
                        node: getId(resource),
                        selectedProperty: 'citation'
                      },
                      `article-back-matter-${section.type}-${graphId}` /* we need graphId as user can toggle versions */
                    )}
                    matchingLevel={matchingLevel}
                    counter={citationSectionCounter}
                    annotable={annotable}
                    displayAnnotations={displayAnnotations}
                    displayPermalink={displayPermalink}
                  >
                    <H2 id={h2.id || 'article-back-matter-reference-list'}>
                      {createValue(h2.$node.innerHTML || 'References')}
                    </H2>
                  </Annotable>
                  <Citations {...this.props} counter={citationCounter} />
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
                  <ArticleBodySection
                    key={section.id}
                    {...this.props}
                    content={blindedSection}
                  >
                    <AnonymousSectionNotice />
                  </ArticleBodySection>
                );
              } else {
                return (
                  <ArticleBodySection
                    key={section.id}
                    {...this.props}
                    content={section}
                  />
                );
              }
          }
        })}

        {/* Supporting Information */}
        {!!(
          articleSupportingInformation && articleSupportingInformation.length
        ) && (
          <ArticleBodySection
            {...this.props}
            counter={
              counter.increment({
                level: 3,
                value: 'D',
                key: `scholarly-article-supporting-information-${getId(
                  resource
                )}-${graphId}` /* we need graphId as user can toggle versions */
              }) /* Note this works without cloning because the counter cache has been preloaded in scholarly-article.js */
            }
            content={articleSupportingInformation[0]}
          />
        )}

        {/* Footnotes and Endnotes ? */}
      </section>
    );
  }
}
