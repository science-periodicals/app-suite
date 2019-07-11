import React from 'react';
import PropTypes from 'prop-types';
import { arrayify } from '@scipe/jsonld';
import ArticleBodyList from './article-body-list';
import ArticleBodyFigure from './article-body-figure';
import ArticleBodyElement from './article-body-element';
import ArticleBodyTable from './article-body-table';
import ArticleBodyAside from './article-body-aside';
import Counter from '../utils/counter';

export default class ArticleBodySection extends React.PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired, // the CreateReleaseAction or TypesettingAction @id providing the resource

    resource: PropTypes.object.isRequired,
    content: PropTypes.object,
    nodeMap: PropTypes.object,

    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    blindingData: PropTypes.object.isRequired,
    children: PropTypes.element
  };

  static defaultProps = {
    content: {}
  };

  render() {
    const { content, children, ...others } = this.props;

    return (
      <section id={content.id} className="article-body-section reverse-z-index">
        <div className="article-body-section__opening-block">
          <div className="article-body-section__marker-symbol">
            {String.fromCharCode(167)}
          </div>
        </div>

        {arrayify(content.children).map((child, i) => {
          const { $node } = child;

          if (/^SECTION$/i.test($node.tagName)) {
            return (
              <ArticleBodySection key={child.id} {...others} content={child} />
            );
          } else if (/^OL$|^UL$/i.test($node.tagName)) {
            return (
              <ArticleBodyList key={child.id} {...others} content={child} />
            );
          } else if (/^TABLE$/i.test($node.tagName)) {
            return (
              <ArticleBodyTable key={child.id} {...others} content={child} />
            );
          } else if (/^FIGURE$/i.test($node.tagName)) {
            return (
              <ArticleBodyFigure key={child.id} {...others} content={child} />
            );
          } else if (/^ASIDE$/i.test($node.tagName)) {
            return (
              <ArticleBodyAside key={child.id} {...others} content={child} />
            );
          } else {
            return (
              <ArticleBodyElement key={child.id} {...others} content={child} />
            );
          }
        })}

        {children}
      </section>
    );
  }
}
