import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getId, prefix, arrayify, unprefix } from '@scipe/jsonld';
import Node from '../node';
import MetaMargin from '../meta-margin/meta-margin';
import MetaMarginContent from '../meta-margin/meta-margin-content';
import MetaMarginMixedData from '../meta-margin/meta-margin-mixed-data';
import RdfaArticleBodyElement from './rdfa-article-body-element';
import RdfaArticleBodyList from './rdfa-article-body-list';
import RdfaFigure from './rdfa-figure';
import PrintableInlineResource from '../printable-inline-resource';

// TODO? rename to RdfaArticleSection as it is used in backmatter as well

export default class RdfaArticleBodySection extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    children: PropTypes.any,
    className: PropTypes.string,
    counter: PropTypes.object.isRequired,
    level: PropTypes.number.isRequired,
    graphId: PropTypes.string.isRequired,
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    object: PropTypes.object.isRequired,
    overwriteNodeMap: PropTypes.object,
    content: PropTypes.object,
    isMobile: PropTypes.bool,
    isPrinting: PropTypes.bool,
    isPrintable: PropTypes.bool,
    blindingData: PropTypes.object.isRequired
  };

  static defaultProps = {
    content: {}
  };

  render() {
    const {
      id,
      className,
      level,
      counter,
      object,
      content,
      graphId,
      graph,
      mainEntity,
      overwriteNodeMap,
      isPrinting,
      isPrintable,
      isMobile,
      children,
      blindingData
    } = this.props;

    // We only increment second level for top level sections
    let sectionCounter = counter;

    return (
      <section
        id={id || content.id}
        className={classNames(className, 'rdfa-article-body-section')}
        resource={getId(object)}
        typeof={prefix(object['@type'])}
      >
        {arrayify(content.children).map(child => {
          const {
            $node: { tagName }
          } = child;

          if (/^SECTION$/i.test(tagName)) {
            sectionCounter =
              level === 0
                ? sectionCounter.clone().increment({ level: 2 })
                : sectionCounter;

            return (
              <RdfaArticleBodySection
                key={child.id}
                level={level + 1}
                counter={level === 0 ? sectionCounter.clone() : sectionCounter}
                graphId={graphId}
                graph={graph}
                mainEntity={mainEntity}
                object={object}
                overwriteNodeMap={overwriteNodeMap}
                content={child}
                isMobile={isMobile}
                isPrinting={isPrinting}
                isPrintable={isPrintable}
                blindingData={blindingData}
              />
            );
          }

          if (/^OL$|^UL$/i.test(tagName)) {
            return (
              <MetaMargin
                key={child.id}
                url={counter.increment({ level: 3 }).getUrl()}
                margin={true}
                graph={graph}
                mainEntity={mainEntity}
                resource={object}
                isMobile={isMobile}
                isPrinting={isPrinting}
                isPrintable={isPrintable}
                fillDeadSpace={isPrinting}
              >
                <RdfaArticleBodyList
                  graphId={graphId}
                  graph={graph}
                  mainEntity={mainEntity}
                  object={object}
                  content={child}
                  isMobile={isMobile}
                  isPrinting={isPrinting}
                />
              </MetaMargin>
            );
          }

          if (
            /^FIGURE$/i.test(tagName) ||
            /^TABLE$/i.test(tagName) ||
            /^ASIDE$/i.test(tagName)
          ) {
            const figureResourceId = child.$node.getAttribute('resource');
            if (!figureResourceId) return null;
            const figureResourceType = unprefix(
              child.$node.getAttribute('typeof')
            );
            if (!figureResourceType) return null;

            // NOTE: we increment the counter even for print as we will get the URL value by key in print (see back matter)
            const url = counter
              .increment({ level: 3, key: `rdfa-figure-${figureResourceId}` })
              .getUrl();

            return (
              <Node
                key={child.id}
                graphId={graphId}
                node={figureResourceId}
                nodeMap={overwriteNodeMap}
                embed="*"
              >
                {object => {
                  // In print mode, we render all the figures at the end and
                  // only link to the figure from the meta margins. Only exceptions
                  // is for `Formula`, `SoftwareSoruceCode` and `TextBox` that we keep inline
                  if (isPrinting) {
                    return object['@type'] === 'Formula' ||
                      object['@type'] === 'TextBox' ||
                      object['@type'] === 'SoftwareSourceCode' ? (
                      <PrintableInlineResource
                        id={figureResourceId}
                        url={url}
                        graphId={graphId}
                        graph={graph}
                        mainEntity={mainEntity}
                        object={object}
                        predicate="schema:hasPart"
                        isMobile={isMobile}
                        isPrinting={isPrinting}
                        isPrintable={isPrintable}
                        blindingData={blindingData}
                        overwriteNodeMap={overwriteNodeMap}
                      />
                    ) : null;
                  }

                  return (
                    /* meta margin is inside of rdfa-figure */
                    <RdfaFigure
                      id={figureResourceId}
                      url={url}
                      graphId={graphId}
                      graph={graph}
                      mainEntity={mainEntity}
                      object={object}
                      overwriteNodeMap={overwriteNodeMap}
                      predicate="schema:hasPart"
                      isMobile={isMobile}
                      isPrinting={isPrinting}
                      isPrintable={isPrintable}
                      blindingData={blindingData}
                    />
                  );
                }}
              </Node>
            );
          }

          return (
            <MetaMargin
              key={child.id}
              url={counter.increment({ level: 3 }).getUrl()}
              margin={true}
              graph={graph}
              mainEntity={mainEntity}
              resource={object}
              isMobile={isMobile}
              isPrinting={isPrinting}
              isPrintable={isPrintable}
              fillDeadSpace={isPrinting}
              updateDomBasedOn={child}
            >
              <RdfaArticleBodyElement
                graphId={graphId}
                graph={graph}
                mainEntity={mainEntity}
                object={object}
                content={child}
                isMobile={isMobile}
                isPrinting={isPrinting}
              />

              <MetaMarginContent>
                {domValues => (
                  <MetaMarginMixedData
                    graphId={getId(graph)}
                    overwriteNodeMap={overwriteNodeMap}
                    domValues={domValues}
                  />
                )}
              </MetaMarginContent>
            </MetaMargin>
          );
        })}

        {children}
      </section>
    );
  }
}
