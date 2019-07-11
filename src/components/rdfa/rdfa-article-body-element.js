import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Value } from '@scipe/ui';

export default class RdfaArticleBodyElement extends React.PureComponent {
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

    return (
      <Value
        id={id || content.id}
        className={classNames(className, 'rdfa-article-body-element')}
        escHtml={false}
      >
        {content.$node.outerHTML ||
          content.$node.innerHTML ||
          content.$node.textContent}
      </Value>
    );
  }
}
