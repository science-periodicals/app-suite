import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { arrayify, getId } from '@scipe/jsonld';
import RdfaArticleBodySection from './rdfa-article-body-section';
import { getCanonicalDocumentObject } from '../../utils/document-object';
import ArticleBodyLoader from '../article-body-loader';

class RdfaArticleBody extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    object: PropTypes.shape({
      '@type': PropTypes.oneOf(['ScholarlyArticle'])
    }).isRequired,
    overwriteNodeMap: PropTypes.object,
    content: PropTypes.object,
    isPrinting: PropTypes.bool.isRequired,
    isPrintable: PropTypes.bool,
    isMobile: PropTypes.bool.isRequired,
    counter: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,

    // redux
    fetchEncodingStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    })
  };

  static defaultProps = {
    fetchEncodingStatus: {},
    content: {}
  };

  render() {
    const {
      id,
      className,
      content: { articleBody },
      fetchEncodingStatus
    } = this.props;
    const content = { children: arrayify(articleBody) };

    if (
      fetchEncodingStatus &&
      (fetchEncodingStatus.active || fetchEncodingStatus.error)
    ) {
      return <ArticleBodyLoader error={fetchEncodingStatus.error} />;
    }

    return (
      <RdfaArticleBodySection
        {...this.props}
        id={id}
        className={classNames(className, 'rdfa-article-body')}
        level={0}
        content={content}
      />
    );
  }
}

export default connect(
  createSelector(
    (state, props) => {
      const encoding = getCanonicalDocumentObject(props.object);
      if (encoding) {
        return state.fetchEncodingStatus[getId(encoding)];
      }
    },
    fetchEncodingStatus => {
      return { fetchEncodingStatus };
    }
  )
)(RdfaArticleBody);
