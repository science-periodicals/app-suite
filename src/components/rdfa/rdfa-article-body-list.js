import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Li } from '@scipe/ui';

export default class RdfaArticleBodyList extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    object: PropTypes.object.isRequired,
    content: PropTypes.object,
    isMobile: PropTypes.bool,
    isPrinting: PropTypes.bool
  };

  static defaultProps = {
    content: {}
  };

  render() {
    const { id, className, content } = this.props;

    return React.createElement(
      content.$node.tagName.toLowerCase(),
      {
        id: id || content.id,
        className: classNames(className, 'rdfa-article-body-list')
      },
      content.children.map(child => {
        return (
          <Li id={child.id} key={child.id} escHtml={false}>
            {child.$node.innerHTML}
          </Li>
        );
      })
    );
  }
}
