import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import classNames from 'classnames';
import ds3Mime from '@scipe/ds3-mime';
import { getScopeId } from '@scipe/librarian';
import { getId, arrayify } from '@scipe/jsonld';
import ArticleBody from './article-body';
import ArticleBackMatter from './article-back-matter';
import ArticleFrontMatter from './article-front-matter';
import { NoRenderingNotice } from './notice';
import withForceSingleBlockSelection from '../hoc/with-force-single-block-selection';
import Counter from '../utils/counter';
import config from '../utils/config';

class ScholarlyArticle extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired, // the `CreateReleaseAction` or `TypesettingAction` or `PublishAction` @id providing the resource
    action: PropTypes.shape({
      '@type': PropTypes.oneOf([
        'CreateReleaseAction',
        'TypesettingAction',
        'PublishAction'
      ]).isRequired
    }),
    resource: PropTypes.object,
    nodeMap: PropTypes.object,
    releaseRequirement: PropTypes.oneOf([
      'SubmissionReleaseRequirement',
      'ProductionReleaseRequirement'
    ]),

    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    blindingData: PropTypes.object.isRequired,

    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    // redux
    content: PropTypes.object
  };

  render() {
    const { className, counter, resource, graphId, ...others } = this.props;

    // Note: for convenience, in CI (backstopjs tests) we don't render the body
    // and back matter for publisher action tests except for specific graphs
    // listed in `config.backstop.graphIdsNeedingFullContent`
    const hideContentForBackstopTests =
      graphId &&
      config.ci &&
      config.backstop &&
      !arrayify(config.backstop.graphIdsNeedingFullContent).includes(
        getScopeId(graphId)
      );

    // Only render DS3
    const canRender = arrayify(resource && resource.encoding).some(encoding => {
      return (
        encoding.fileFormat && encoding.fileFormat.trim().startsWith(ds3Mime)
      );
    });

    const frontMatterCounter = counter.increment({
      level: 3,
      value: 'A',
      key: `scholarly-article-front-matter-${getId(
        resource
      )}-${graphId}` /* we need graphId as user can toggle versions */
    });

    const bodyCounter = counter.increment({
      level: 3,
      value: 'B',
      key: `scholarly-article-article-body-${getId(
        resource
      )}-${graphId}` /* we need graphId as user can toggle versions */
    });

    const backMatterCounter = counter.increment({
      level: 3,
      value: 'C',
      key: `scholarly-article-back-matter-${getId(
        resource
      )}-${graphId}` /* we need graphId as user can toggle versions */
    });

    // preload the cache (see article-back-matter.js)
    // eslint-disable-next-line
    const supportingInformationCounter = counter.increment({
      level: 3,
      value: 'D',
      key: `scholarly-article-supporting-information-${getId(
        resource
      )}-${graphId}` /* we need graphId as user can toggle versions */
    });

    return (
      <div className={classNames(className, 'scholarly-article')}>
        {canRender ? (
          <Fragment>
            {
              <ArticleFrontMatter
                {...others}
                graphId={graphId}
                counter={frontMatterCounter}
                resource={resource}
              />
            }

            {!hideContentForBackstopTests && (
              <ArticleBody
                {...others}
                graphId={graphId}
                counter={bodyCounter}
                resource={resource}
              />
            )}

            {!hideContentForBackstopTests && (
              <ArticleBackMatter
                {...others}
                graphId={graphId}
                counter={backMatterCounter}
                resource={resource}
              />
            )}
          </Fragment>
        ) : (
          <NoRenderingNotice resource={resource} />
        )}
      </div>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => {
      if (props.resource && props.resource.encoding) {
        for (let encoding of props.resource.encoding) {
          const encodingId = getId(encoding);
          if (
            encodingId in state.contentMap &&
            state.contentMap[encodingId].articleBody
          ) {
            return state.contentMap[encodingId];
          }
        }
      }
    },
    content => {
      return { content };
    }
  )
)(withForceSingleBlockSelection(ScholarlyArticle));
