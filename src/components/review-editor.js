import React, { Component } from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import identity from 'lodash/identity';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { getId, createValue, arrayify, dearrayify } from '@scipe/jsonld';
import { RatingStars, RichTextarea, Value } from '@scipe/ui';
import {
  getObjectId,
  getVersion,
  getLocationIdentifier
} from '@scipe/librarian';
import Annotable from './annotable';
import Counter from '../utils/counter';
import AnswerEditor from './answer-editor';
import { ERROR_MISSING_VALUE } from '../constants';
import {
  getSelectorGraphParam,
  getRelativeLocationLink
} from '../utils/annotations';

export default class ReviewEditor extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    action: PropTypes.shape({
      '@type': PropTypes.oneOf(['ReviewAction']).isRequired
    }).isRequired, // review action

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,

    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,

    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,

    saveWorkflowAction: PropTypes.func // required when not readOnly
  };

  static defaultProps = {
    embedded: false,
    displayAnnotations: true,
    createSelector: identity,
    saveWorkflowAction: noop
  };

  handleAnswer = replyAction => {
    const { action, graphId, saveWorkflowAction } = this.props;

    let upd;
    const questionId = getObjectId(replyAction);

    const nextAnswer = dearrayify(
      action.answer,
      arrayify(action.answer).map(answer => {
        if (answer.parentItem && getId(answer.parentItem) === questionId) {
          return Object.assign(
            {},
            omit(replyAction.resultComment, ['parentItem']),
            pick(answer, ['parentItem'])
          );
        }

        return answer;
      })
    );

    upd = {
      '@id': getId(action),
      answer: nextAnswer
    };

    if (upd) {
      saveWorkflowAction(graphId, upd);
    }
  };

  handleChangeRatingValue = ratingValue => {
    const { graphId, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      resultReview: Object.assign({}, action.resultReview, {
        reviewRating: Object.assign(
          {
            '@type': 'Rating',
            bestRating: 5,
            worstRating: 1
          },
          action.resultReview && action.resultReview.reviewRating,
          {
            ratingValue
          }
        )
      })
    });
  };

  handleSubmitReviewBody = e => {
    e.preventDefault();

    const { graphId, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      resultReview: Object.assign({}, action.resultReview, {
        [e.target.name]: createValue(e.target.value)
      })
    });
  };

  suggestionMapper = location => {
    const { action } = this.props;

    return getRelativeLocationLink(
      getVersion(getSelectorGraphParam(action)),
      location
    );
  };

  render() {
    const {
      action,
      graphId,
      readOnly,
      disabled,
      counter,
      annotable,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel,
      locationOptions
    } = this.props;

    const review = action.resultReview || {};

    const answers = arrayify(action.answer);

    const questionCounter = counter.increment({
      level: 3,
      value: getLocationIdentifier(action['@type'], 'answer.parentItem'),
      key: `review-editor-${getId(action)}-answer-parentItem`
    });

    const answerCounter = counter.increment({
      level: 3,
      value: getLocationIdentifier(action['@type'], 'answer'),
      key: `review-editor-${getId(action)}-answer`
    });

    return (
      <div className="review-editor">
        {answers.length ? (
          <section className="selectable-indent">
            <h4 className="annotable-action__sub-title">Questions</h4>
            <ul className="sa__clear-list-styles">
              {answers.map((answer, i) => {
                const question = answer.parentItem;

                return (
                  <li key={getId(answer) || getId(question)}>
                    <div className="review-editor__question">
                      <Annotable
                        graphId={graphId}
                        counter={questionCounter.increment({
                          level: 4,
                          key: `review-editor-${getId(
                            action
                          )}-parentItem-answer-${getId(answer)}-parentItem`
                        })}
                        selector={createSelector(
                          {
                            '@type': 'NodeSelector',
                            graph: getSelectorGraphParam(action),
                            node: getId(action),
                            selectedProperty: 'answer',
                            selectedItem: getId(answer),
                            hasSubSelector: {
                              '@type': 'NodeSelector',
                              graph: getSelectorGraphParam(action),
                              node: getId(answer),
                              selectedProperty: 'parentItem'
                            }
                          },
                          `review-editor-${getId(
                            action
                          )}-parentItem-answer-${getId(answer)}-parentItem`
                        )}
                        matchingLevel={matchingLevel}
                        selectable={false}
                        annotable={annotable}
                        displayAnnotations={displayAnnotations}
                        displayPermalink={displayPermalink}
                        iconName="questionAnswer"
                      >
                        <div>
                          <Value className="review-editor__question__text">
                            {question.text}
                          </Value>
                        </div>
                      </Annotable>
                    </div>

                    <div className="review-editor__answer">
                      <Annotable
                        graphId={graphId}
                        counter={answerCounter.increment({
                          level: 4,
                          key: `review-editor-${getId(
                            action
                          )}-parentItem-answer-${getId(answer)}`
                        })}
                        selector={createSelector(
                          {
                            '@type': 'NodeSelector',
                            graph: getSelectorGraphParam(action),
                            node: getId(action),
                            selectedProperty: 'answer',
                            selectedItem: getId(answer)
                          },
                          `review-editor-${getId(
                            action
                          )}-parentItem-answer-${getId(answer)}`
                        )}
                        info={
                          !disabled &&
                          (!answer || answer.text == null || answer.text == '')
                            ? ERROR_MISSING_VALUE
                            : undefined
                        }
                        matchingLevel={matchingLevel}
                        selectable={false}
                        annotable={annotable}
                        displayAnnotations={displayAnnotations}
                        displayPermalink={displayPermalink}
                      >
                        <AnswerEditor
                          id={getId(answer) || getId(question)}
                          disabled={disabled}
                          answer={answer}
                          readOnly={readOnly}
                          question={question}
                          locationOptions={locationOptions}
                          suggestionMapper={this.suggestionMapper}
                          onAction={this.handleAnswer}
                        />
                      </Annotable>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="selectable-indent">
          <h4 className="annotable-action__sub-title">Rating</h4>

          <Annotable
            graphId={graphId}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: getObjectId(action),
                node: getId(action),
                selectedProperty: 'resultReview',
                hasSubSelector: {
                  '@type': 'NodeSelector',
                  graph: getSelectorGraphParam(action),
                  node: getId(action.resultReview),
                  selectedProperty: 'reviewRating'
                }
              },
              `review-editor-${getId(action)}-resultReview-reviewRating`
            )}
            matchingLevel={matchingLevel}
            counter={counter.increment({
              level: 3,
              key: `review-editor-${getId(action)}-resultReview-reviewRating`,
              value: getLocationIdentifier(
                action['@type'],
                'resultReview.reviewRating'
              )
            })}
            info={
              !disabled &&
              (!review.reviewRating || review.reviewRating.ratingValue == null)
                ? ERROR_MISSING_VALUE
                : undefined
            }
            selectable={false}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <div className="review-editor__rating">
              <RatingStars
                readOnly={readOnly}
                disabled={disabled}
                rating={review.reviewRating}
                onChange={this.handleChangeRatingValue}
              />
            </div>
          </Annotable>

          <Annotable
            graphId={graphId}
            selector={createSelector(
              {
                '@type': 'NodeSelector',
                graph: getObjectId(action),
                node: getId(action),
                selectedProperty: 'resultReview',
                hasSubSelector: {
                  '@type': 'NodeSelector',
                  graph: getSelectorGraphParam(action),
                  node: getId(action.resultReview),
                  selectedProperty: 'reviewBody'
                }
              },
              `review-editor-${getId(action)}-resultReview-reviewBody`
            )}
            matchingLevel={matchingLevel}
            counter={counter.increment({
              level: 3,
              key: `review-editor-${getId(action)}-resultReview-reviewBody`,
              value: getLocationIdentifier(
                action['@type'],
                'resultReview.reviewBody'
              )
            })}
            info={
              !disabled &&
              (!review || review.reviewBody == null || review.reviewBody == '')
                ? ERROR_MISSING_VALUE
                : undefined
            }
            selectable={false}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <div className="review-editor__review-body">
              <RichTextarea
                readOnly={readOnly}
                disabled={disabled}
                name="reviewBody"
                label="reason"
                defaultValue={review.reviewBody}
                onSubmit={this.handleSubmitReviewBody}
                options={locationOptions}
                suggestionMapper={this.suggestionMapper}
              />
            </div>
          </Annotable>
        </section>
      </div>
    );
  }
}
