import React from 'react';
import PropTypes from 'prop-types';
import isClient from 'is-client';
import classNames from 'classnames';
import { getId, prefix, unprefix } from '@scipe/jsonld';
import { schema, getScopeId } from '@scipe/librarian';
import { CSS_HEADER_HEIGHT } from '@scipe/ui';
import RdfaArticleFrontMatter from './rdfa-article-front-matter';
import RdfaArticleBody from './rdfa-article-body';
import RdfaFigure from './rdfa-figure';
import RdfaArticleBackMatter from './rdfa-article-back-matter';
import Counter from '../../utils/counter';

/**
 * Note: We also use this component to render graph containing only images, or
 * video so that they look like an article...
 */
export default class RdfaScholarlyArticle extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    journal: PropTypes.object,
    issue: PropTypes.object,
    content: PropTypes.object,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    preview: PropTypes.bool,
    graph: PropTypes.object,
    overwriteNodeMap: PropTypes.object,
    isPrinting: PropTypes.bool.isRequired,
    isPrintable: PropTypes.bool,
    isMobile: PropTypes.bool.isRequired,
    mainEntity: PropTypes.object,
    blindingData: PropTypes.object.isRequired,
    object: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
  };

  handleClick = e => {
    // compensate for the header height when we scroll to anchor
    // NOTE link that should open the shell have already been processed by <LinkInterceptor />
    // we handle cases like <a><sup>1</sup></a> where e.target is <sup> and not <a>
    if (e.target.localName === 'a' || e.target.matches('a, a *')) {
      let $a = e.target;
      while ($a.localName !== 'a') {
        $a = $a.parentElement;
      }

      const [, id] = $a.href.split('#');

      if (id) {
        const $target = document.getElementById(id);
        if ($target) {
          e.preventDefault();
          const rect = $target.getBoundingClientRect();
          window.scroll({
            top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT,
            behavior: 'smooth'
          });
        }
      }
    }
  };

  render() {
    const {
      id,
      className,
      object,
      graphId,
      preview,
      stageId,
      graph,
      overwriteNodeMap,
      content,
      journal,
      issue,
      isPrinting,
      isPrintable,
      isMobile,
      mainEntity,
      blindingData
    } = this.props;
    if (!object || !getId(graph)) return null;

    const isArticle = schema.is(object, 'Article');

    const counter = new Counter({
      origin:
        process.env.NODE_ENV === 'production' && !preview
          ? 'https://purl.org'
          : isClient() || preview
          ? window.location.origin
          : 'https://purl.org',
      pathname: preview
        ? `/${unprefix(getId(journal))}/${unprefix(getScopeId(graph))}/preview`
        : `/${
            process.env.NODE_ENV === 'production' || !isClient() ? 'sa/' : ''
          }${graph.slug || unprefix(getScopeId(graph))}`,
      qs: Object.assign(
        {},
        preview && graph.version != null
          ? { version: graph.version }
          : undefined,
        process.env.NODE_ENV === 'production' || preview
          ? undefined
          : {
              hostname: `${unprefix(getId(journal))}.sci.pe`
            }
      ),
      counts: [0, -1, -1] // -1 as we will call increment
    });

    return (
      <div className="rdfa-scholarly-article-container">
        <article
          id={id}
          resource={getId(object)}
          typeof={prefix(object['@type'])}
          onClick={this.handleClick}
          className={classNames(className, 'rdfa-scholarly-article')}
        >
          {isArticle && (
            <RdfaArticleFrontMatter
              journal={journal}
              issue={issue}
              graphId={graphId}
              graph={graph}
              stageId={stageId}
              mainEntity={mainEntity}
              object={object}
              overwriteNodeMap={overwriteNodeMap}
              content={content}
              isPrinting={isPrinting}
              isPrintable={isPrintable}
              isMobile={isMobile}
              blindingData={blindingData}
              counter={counter
                .increment({
                  level: 1,
                  key: `rdfa-scholarly-article-article-front-matter-${getId(
                    object
                  )}`
                })
                .clone()}
            />
          )}

          {isArticle ? (
            <RdfaArticleBody
              graphId={graphId}
              graph={graph}
              stageId={stageId}
              mainEntity={mainEntity}
              object={object}
              overwriteNodeMap={overwriteNodeMap}
              content={content}
              isPrinting={isPrinting}
              isPrintable={isPrintable}
              isMobile={isMobile}
              blindingData={blindingData}
              counter={counter
                .increment({
                  level: 1,
                  key: `rdfa-scholarly-article-article-body-${getId(object)}`
                })
                .clone()}
            />
          ) : (
            <RdfaFigure
              id={getId(object)}
              url={counter
                .increment({
                  level: 1,
                  key: `rdfa-scholarly-article-rdfa-figure-${getId(object)}`
                })
                .increment({ level: 2 })
                .increment({ level: 3 })
                .getUrl()}
              graphId={graphId}
              graph={graph}
              stageId={stageId}
              mainEntity={mainEntity}
              object={object}
              overwriteNodeMap={overwriteNodeMap}
              isPrinting={isPrinting}
              isPrintable={isPrintable}
              isMobile={isMobile}
              blindingData={blindingData}
            />
          )}

          <RdfaArticleBackMatter
            journal={journal}
            graphId={graphId}
            graph={graph}
            issue={issue}
            mainEntity={mainEntity}
            stageId={stageId}
            content={content}
            object={object}
            overwriteNodeMap={overwriteNodeMap}
            isPrinting={isPrinting}
            isPrintable={isPrintable}
            isMobile={isMobile}
            blindingData={blindingData}
            counter={counter.increment({
              level: 1,
              key: `rdfa-scholarly-article-back-matter-${getId(object)}`
            })}
          />
        </article>
      </div>
    );
  }
}
