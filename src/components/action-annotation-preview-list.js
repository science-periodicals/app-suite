import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import querystring from 'querystring';
import classNames from 'classnames';
import {
  getVersion,
  getScopeId,
  getLocationIdentifier
} from '@scipe/librarian';
import { getId, textify, unprefix, arrayify } from '@scipe/jsonld';
import { AutoAbridge } from '@scipe/ui';
import { createActionMapSelector } from '../selectors/graph-selectors';
import Annotable from './annotable';
import Counter from '../utils/counter';
import ScrollLink from './scroll-link';
import { ERROR_MISSING_VALUE, ERROR_NEED_AUTHOR_RESPONSE } from '../constants';
import { compareCommentsByIdentifiersAndDateCreated } from '../utils/sort';
import { getSelectorGraphParam, prettifyLocation } from '../utils/annotations';

/**
 * Display the in context comment (`annotation`) of
 * `ReviewAction` and `AssessAction` (`action.annotation`)
 *
 * Responses can be found in `CreateReleaseAction.annotation`
 */
class ActionAnnotationPreviewList extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    user: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    action: PropTypes.shape({
      '@type': PropTypes.oneOf(['AssessAction', 'ReviewAction']).isRequired
    }).isRequired,
    search: PropTypes.string.isRequired,

    addAuthorResponses: PropTypes.bool,
    counter: PropTypes.instanceOf(Counter).isRequired,

    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,

    createSelector: PropTypes.func.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    reviewAttachmentLinkType: PropTypes.oneOf(['shell', 'transition']), // TODO (if we display isBasedOn for revisionRequestComment)

    // redux
    annotations: PropTypes.arrayOf(PropTypes.object).isRequired,
    responseAnnotationsByRevisionRequestCommentIds: PropTypes.object
  };

  static defaultProps = {
    addAuthorResponses: false,
    responseAnnotationsByRevisionRequestCommentIds: {}
  };

  getInfo(annotation, responseAnnotation) {
    const { addAuthorResponses, disabled } = this.props;

    if (disabled) {
      return;
    }

    const info = [];

    if (addAuthorResponses) {
      if (
        !responseAnnotation ||
        !responseAnnotation.annotationBody ||
        responseAnnotation.annotationBody == null ||
        responseAnnotation.annotationBody == ''
      ) {
        info.push(ERROR_NEED_AUTHOR_RESPONSE);
      }
    } else {
      if (
        !annotation.annotationBody ||
        annotation.annotationBody.text == null ||
        annotation.annotationBody.text == ''
      ) {
        info.push(ERROR_MISSING_VALUE);
      }
    }

    return info.length ? info : undefined;
  }

  render() {
    const {
      annotations,
      journalId,
      graphId,
      search,
      action,
      displayAnnotations,
      displayPermalink,
      createSelector,
      counter,
      responseAnnotationsByRevisionRequestCommentIds,
      addAuthorResponses
    } = this.props;

    if (!annotations.length) {
      return null;
    }

    const listCounter = counter.increment({
      level: 3,
      value: getLocationIdentifier(action['@type'], 'annotation'),
      key: `action-annotation-preview-list-${getId(action)}`
    });

    return (
      <ul className="action-annotation-preview-list">
        {annotations.map(annotation => {
          const identifier =
            annotation.annotationTarget &&
            annotation.annotationTarget.identifier;

          const responseAnnotation =
            responseAnnotationsByRevisionRequestCommentIds[
              getId(annotation.annotationBody)
            ];

          return (
            <li key={getId(annotation)}>
              <Annotable
                graphId={graphId}
                selector={createSelector(
                  {
                    '@type': 'NodeSelector',
                    graph: getSelectorGraphParam(action),
                    node: getId(action),
                    selectedProperty:
                      'annotation-preview' /* Note: we set an invalid property so that the in-context annotation comment are not repeated here */,
                    selectedItem: getId(annotation)
                  },
                  `action-annotation-preview-list-${getId(action)}-${getId(
                    annotation
                  )}${addAuthorResponses ? '-addAuthorResponses' : ''}`
                )}
                info={this.getInfo(annotation, responseAnnotation)}
                counter={listCounter.increment({
                  level: 4,
                  key: `action-annotation-preview-list-${getId(action)}-${getId(
                    annotation
                  )}${addAuthorResponses ? '-addAuthorResponses' : ''}`
                })}
                selectable={false}
                annotable={false}
                iconName={addAuthorResponses ? 'questionAnswer' : 'feedback'}
                displayAnnotations={displayAnnotations}
                displayPermalink={displayPermalink}
              >
                <div>
                  <div className="action-annotation-preview-list__item">
                    <span className="action-annotation-preview-list__content">
                      <AutoAbridge
                        ellipsis={true}
                        className={classNames(
                          'action-annotation-preview-list__preview',
                          {
                            'action-annotation-preview-list__preview--request': !!addAuthorResponses
                          }
                        )}
                      >
                        {textify(annotation.annotationBody.text)}
                      </AutoAbridge>

                      {!!identifier && (
                        <ScrollLink
                          actionAnnotationId={getId(annotation)}
                          preventLinkInterceptor={true}
                          to={{
                            pathname: `/${unprefix(journalId)}/${unprefix(
                              getScopeId(graphId)
                            )}/submission`,
                            search: `?${querystring.stringify(
                              Object.assign(
                                querystring.parse(search.substring(1)),
                                {
                                  version: getVersion(
                                    getSelectorGraphParam(action)
                                  )
                                }
                              )
                            )}`,
                            hash: identifier ? `#${identifier}` : undefined
                          }}
                        >
                          <span className="action-annotation-preview-list__number">
                            <span>{prettifyLocation(identifier)}</span>
                          </span>
                        </ScrollLink>
                      )}

                      <span className="action-annotation-preview-list__spacer">
                        {/* Spacer for CSS rounded border */}
                      </span>
                    </span>
                  </div>

                  {!!responseAnnotation && (
                    <div className="action-annotation-preview-list__item action-annotation-preview-list__item--response">
                      <span className="action-annotation-preview-list__content">
                        <AutoAbridge
                          ellipsis={true}
                          className="action-annotation-preview-list__preview"
                        >
                          {textify(responseAnnotation.annotationBody.text)}
                        </AutoAbridge>

                        <span className="action-annotation-preview-list__spacer">
                          {/* Spacer for CSS rounded border */}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </Annotable>
            </li>
          );
        })}
      </ul>
    );
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => props.action,
    (state, props) => props.addAuthorResponses,
    createActionMapSelector(),
    (action, addAuthorResponses, actionMap = {}) => {
      const annotations = arrayify(action.annotation).sort(
        compareCommentsByIdentifiersAndDateCreated
      );

      let responseAnnotationsByRevisionRequestCommentIds;
      if (addAuthorResponses) {
        const createReleaseAction = Object.values(actionMap).find(
          _action =>
            _action['@type'] === 'CreateReleaseAction' &&
            getId(_action.instrument) === getId(action)
        );
        if (createReleaseAction) {
          responseAnnotationsByRevisionRequestCommentIds = arrayify(
            createReleaseAction.annotation
          ).reduce((map, annotation) => {
            if (
              getId(
                annotation.annotationBody &&
                  annotation.annotationBody.parentItem
              )
            ) {
              map[getId(annotation.annotationBody.parentItem)] = annotation;
              return map;
            }
          }, {});
        }
      }

      return {
        annotations,
        responseAnnotationsByRevisionRequestCommentIds
      };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(ActionAnnotationPreviewList);
