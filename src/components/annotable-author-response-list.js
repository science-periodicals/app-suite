import React from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import Iconoclass from '@scipe/iconoclass';
import { getId, arrayify } from '@scipe/jsonld';
import { Value, RichTextarea } from '@scipe/ui';
import {
  createId,
  getVersion,
  getLocationIdentifier
} from '@scipe/librarian';
import Annotable from './annotable';
import Counter from '../utils/counter';
import CommentIsBasedOnEditor from './comment-is-based-on-editor';
import ShellEditorActionComment from './shell/shell-editor-action-comment';
import { ERROR_NEED_AUTHOR_RESPONSE } from '../constants';
import {
  getSelectorGraphParam,
  getRelativeLocationLink
} from '../utils/annotations';

/**
 * General (not in context) author responses
 * - Responses are stored in `createReleaseAction.comment`
 * - Request they answer are stored in `assessAction.comment`
 */
export default class AnnotableAuthorResponseList extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    assessAction: PropTypes.object.isRequired,
    createReleaseAction: PropTypes.object.isRequired,

    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,

    counter: PropTypes.instanceOf(Counter).isRequired, // cloned version => do NOT increment here
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,
    reviewAttachmentLinkType: PropTypes.oneOf(['shell', 'transition']),
    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    saveWorkflowAction: PropTypes.func,
    openShell: PropTypes.func
  };

  static defaultProps = {
    openShell: noop,
    saveWorkflowAction: noop
  };

  handleUpsert(request, response, e) {
    const { graphId, createReleaseAction, saveWorkflowAction } = this.props;
    if (response) {
      // update
      saveWorkflowAction(graphId, {
        '@id': getId(createReleaseAction),
        comment: arrayify(createReleaseAction.comment).map(comment => {
          if (getId(comment) === getId(response)) {
            return Object.assign({}, comment, {
              [e.target.name]: e.target.value
            });
          }
          return comment;
        })
      });
    } else {
      // create
      saveWorkflowAction(graphId, {
        '@id': getId(createReleaseAction),
        comment: arrayify(createReleaseAction.comment).concat({
          '@id': createId('cnode', null, getId(createReleaseAction))['@id'],
          '@type': 'AuthorResponseComment',
          [e.target.name]: e.target.value,
          parentItem: getId(request)
        })
      });
    }
  }

  handleEdit(hash, selector, request, response, e) {
    const {
      readOnly,
      disabled,
      graphId,
      createReleaseAction,
      openShell
    } = this.props;

    openShell('edit', getId(response), {
      hash,
      selector,
      connectedComponent: ShellEditorActionComment,
      params: {
        graphId,
        actionId: getId(createReleaseAction),
        commentId: getId(response),
        requestId: getId(request)
      },
      readOnly,
      disabled
    });
  }

  getInfo(authorResponseComment) {
    const { disabled } = this.props;
    if (disabled) {
      return;
    }

    if (
      !authorResponseComment ||
      authorResponseComment.text == null ||
      authorResponseComment.text == ''
    ) {
      return ERROR_NEED_AUTHOR_RESPONSE;
    }
  }

  suggestionMapper = location => {
    const { createReleaseAction } = this.props;
    return getRelativeLocationLink(
      getVersion(getSelectorGraphParam(createReleaseAction)),
      location
    );
  };

  render() {
    const {
      graphId,
      assessAction,
      createReleaseAction,
      createSelector,
      matchingLevel,
      annotable,
      displayAnnotations,
      displayPermalink,
      reviewAttachmentLinkType,
      counter,
      readOnly,
      disabled,
      locationOptions
    } = this.props;

    const responseMap = arrayify(createReleaseAction.comment).reduce(
      (map, comment) => {
        if (getId(comment.parentItem)) {
          map[getId(comment.parentItem)] = comment;
        }
        return map;
      },
      {}
    );

    const listCounter = counter.increment({
      level: 3,
      value: getLocationIdentifier(createReleaseAction['@type'], 'comment'),
      key: `annotable-author-response-list-list-${getId(createReleaseAction)}`
    });

    return (
      <ul className="annotable-author-response-list sa__clear-list-styles">
        {arrayify(assessAction.comment).map((request, commentIndex) => {
          const response = responseMap[getId(request)];

          const selector = createSelector(
            {
              '@type': 'NodeSelector',
              graph: getSelectorGraphParam(createReleaseAction),
              node: getId(createReleaseAction),
              selectedProperty: 'comment',
              selectedItem: getId(request)
            },
            `annotable-author-response-list-list-${getId(
              createReleaseAction
            )}-${getId(request)}`
          );

          const itemCounter = listCounter.increment({
            level: 4,
            key: `annotable-author-response-list-list-${getId(
              createReleaseAction
            )}-${getId(request)}`
          });

          return (
            <li
              key={getId(request)}
              className="annotable-author-response-list__item"
            >
              <Annotable
                graphId={graphId}
                selector={selector}
                matchingLevel={matchingLevel}
                counter={itemCounter}
                selectable={false}
                annotable={annotable}
                displayAnnotations={displayAnnotations}
                displayPermalink={displayPermalink}
                info={this.getInfo(response)}
                iconName="questionAnswer"
              >
                {(id, onResize) => (
                  <div
                    id={id}
                    className="annotable-author-response-list__text-container"
                  >
                    <div className="annotable-author-response-list__text">
                      {assessAction.identifier && (
                        <h5>{`#${
                          assessAction.identifier
                        }⋮${getLocationIdentifier(
                          'AssessAction',
                          'comment'
                        )}.${commentIndex}`}</h5>
                      )}

                      {request.name && (
                        <Value className="annotable-author-response-list__subject">
                          {request.name}
                        </Value>
                      )}

                      <Value className="annotable-author-response-list__request">
                        {request.text}
                      </Value>

                      <CommentIsBasedOnEditor
                        graphId={graphId}
                        assessAction={assessAction}
                        isBasedOn={request.isBasedOn}
                        linkType={reviewAttachmentLinkType}
                        readOnly={true}
                        disabled={true}
                      />
                    </div>

                    <div className="annotable-author-response-list__answer">
                      <div className="annotable-author-response-list__value">
                        <RichTextarea
                          label="response"
                          name="text"
                          readOnly={readOnly}
                          disabled={disabled}
                          defaultValue={response ? response.text : undefined}
                          onSubmit={this.handleUpsert.bind(
                            this,
                            request,
                            response
                          )}
                          options={locationOptions}
                          suggestionMapper={this.suggestionMapper}
                          onResize={onResize}
                        />
                      </div>
                      {!readOnly && (
                        <div className="annotable-author-response-list__shell">
                          <Iconoclass
                            iconName="shell"
                            disabled={disabled}
                            behavior="button"
                            className="annotable-author-response-list__shell-icon"
                            size="18px"
                            onClick={this.handleEdit.bind(
                              this,
                              itemCounter.getHash(),
                              selector,
                              request,
                              response
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Annotable>
            </li>
          );
        })}
      </ul>
    );
  }
}
