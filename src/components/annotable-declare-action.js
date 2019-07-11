import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import pick from 'lodash/pick';
import { getId, arrayify } from '@scipe/jsonld';
import {
  getObjectId,
  createId,
  getVersion,
  getLocationIdentifier
} from '@scipe/librarian';
import { Value, Card } from '@scipe/ui';
import Annotable from './annotable';
import Counter from '../utils/counter';
import AnswerEditor from './answer-editor';
import FilesAttachment from './files-attachment';
import AnnotableActionHead from './annotable-action-head';
import { NoAccessNotice } from './notice';
import { StyleCardBody } from './annotable-action';
import { ERROR_MISSING_VALUE } from '../constants';
import { createActionMapSelector } from '../selectors/graph-selectors';
import { getWorkflowAction } from '../utils/workflow';
import {
  getSelectorGraphParam,
  getRelativeLocationLink
} from '../utils/annotations';

class AnnotableDeclareAction extends Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graph: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,
    children: PropTypes.element,
    stage: PropTypes.object.isRequired,
    action: PropTypes.object.isRequired,
    endorseAction: PropTypes.object,
    serviceActions: PropTypes.arrayOf(PropTypes.object), // instantiated service action for CreateReleaseAction
    blockingActions: PropTypes.array,
    authorizeActions: PropTypes.array,
    completeImpliesSubmit: PropTypes.bool.isRequired,
    isBlocked: PropTypes.bool.isRequired,
    isReadyToBeSubmitted: PropTypes.bool.isRequired,
    canView: PropTypes.bool.isRequired,
    canComment: PropTypes.bool.isRequired,
    canAssign: PropTypes.bool.isRequired,
    canReschedule: PropTypes.bool.isRequired,
    canPerform: PropTypes.bool.isRequired,
    canEndorse: PropTypes.bool.isRequired,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,

    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    memoizeCreateSelector: PropTypes.func.isRequired,

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,

    saveWorkflowAction: PropTypes.func.isRequired,

    // redux
    createReleaseAction: PropTypes.object
  };

  handleAnswer = replyAction => {
    const { action, graph } = this.props;

    let upd;
    const questionId = getObjectId(replyAction);

    const answer = Object.assign(
      { '@type': 'Answer' },
      pick(
        arrayify(action.result).find(
          result => result.parentItem === questionId
        ),
        ['@id', 'parentItem']
      ),
      replyAction.resultComment
    );

    const nextResult = Array.isArray(action.question)
      ? arrayify(action.result)
          .filter(
            result =>
              !(result.parentItem && getId(result.parentItem) === questionId)
          )
          .concat(answer)
      : answer;

    upd = {
      '@id': getId(action),
      result: nextResult
    };

    if (upd) {
      this.props.saveWorkflowAction(getId(graph), upd);
    }
  };

  render() {
    const {
      user,
      acl,
      journalId,
      canView,
      canComment,
      action,
      graph,
      counter,
      readOnly,
      disabled,
      annotable,
      displayAnnotations,
      blindingData,
      canPerform,
      isBlocked,
      createReleaseAction,
      locationOptions,
      children,
      memoizeCreateSelector
    } = this.props;

    const questions = arrayify(action.question);

    const questionCounter = counter.increment({
      level: 3,
      value: getLocationIdentifier(action['@type'], 'question'),
      key: `annotable-declare-action-${getId(action)}-question`
    });
    const answerCounter = counter.increment({
      level: 3,
      value: getLocationIdentifier(action['@type'], 'result'),
      key: `annotable-declare-action-${getId(action)}-result`
    });

    return (
      <div className="annotable-declare-action">
        <Card
          className="annotable-action__head-card"
          data-testid="annotable-action-body"
        >
          <StyleCardBody>
            <AnnotableActionHead {...this.props} counter={counter} />

            {!canView ? (
              <div className="selectable-indent">
                <NoAccessNotice data-testid="no-access-notice" />
              </div>
            ) : (
              <Fragment>
                {questions.length ? (
                  <section className="selectable-indent">
                    <h4 className="annotable-action__sub-title">Questions</h4>

                    <ul className="sa__clear-list-styles">
                      {questions.map(question => {
                        const answer = getAnswer(action, question);
                        return (
                          <li key={getId(question)}>
                            <div className="annotable-declare-action__question">
                              <Annotable
                                graphId={getId(graph)}
                                counter={questionCounter.increment({
                                  level: 4,
                                  key: `annotable-declare-action-${getId(
                                    action
                                  )}-question-${getId(question)}`
                                })}
                                selector={memoizeCreateSelector(
                                  {
                                    '@type': 'NodeSelector',
                                    graph: getSelectorGraphParam(action),
                                    node: getId(action),
                                    selectedProperty: 'question',
                                    selectedItem: getId(question)
                                  },
                                  `annotable-declare-action-${getId(
                                    action
                                  )}-question-${getId(question)}`
                                )}
                                selectable={false}
                                iconName="questionAnswer"
                                annotable={annotable && canComment}
                                displayAnnotations={displayAnnotations}
                              >
                                <div>
                                  <Value className="annotable-declare-action__question__text">
                                    {question.text}
                                  </Value>
                                </div>
                              </Annotable>
                            </div>

                            <div className="annotable-declare-action__answer">
                              <Annotable
                                graphId={getId(graph)}
                                counter={answerCounter.increment({
                                  level: 4,
                                  key: `annotable-declare-action--${getId(
                                    action
                                  )}-result-${getId(answer)}`
                                })}
                                selector={memoizeCreateSelector(
                                  {
                                    '@type': 'NodeSelector',
                                    graph: getSelectorGraphParam(action),
                                    node: getId(action),
                                    selectedProperty: 'result',
                                    selectedItem: getId(answer)
                                  },
                                  `annotable-declare-action-${getId(
                                    action
                                  )}-result-${getId(answer)}`
                                )}
                                selectable={false}
                                annotable={annotable && canComment}
                                info={
                                  !disabled &&
                                  canPerform &&
                                  !isBlocked &&
                                  (!answer ||
                                    answer.text == null ||
                                    answer.text == '')
                                    ? ERROR_MISSING_VALUE
                                    : undefined
                                }
                                displayAnnotations={displayAnnotations}
                              >
                                <AnswerEditor
                                  id={getId(answer)}
                                  disabled={
                                    disabled || !canPerform || isBlocked
                                  }
                                  answer={answer}
                                  readOnly={readOnly}
                                  question={question}
                                  locationOptions={locationOptions}
                                  suggestionMapper={location =>
                                    getRelativeLocationLink(
                                      getVersion(getSelectorGraphParam(action)),
                                      location
                                    )
                                  }
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
              </Fragment>
            )}

            {children}
          </StyleCardBody>
        </Card>

        {canView &&
          createReleaseAction &&
          createReleaseAction.actionStatus === 'CompletedActionStatus' &&
          getId(graph.mainEntity) && (
            <Card bevel={true} className="annotable-action__card">
              <FilesAttachment
                user={user}
                acl={acl}
                journalId={journalId}
                search={counter.search}
                graphId={getObjectId(action)}
                action={createReleaseAction}
                readOnly={true}
                disabled={true}
                annotable={annotable && canComment}
                displayAnnotations={displayAnnotations}
                createSelector={memoizeCreateSelector(selector => {
                  return {
                    '@type': 'NodeSelector',
                    graph: getSelectorGraphParam(action),
                    node: getId(action),
                    selectedProperty: 'object',
                    hasSubSelector: selector
                  };
                }, `annotable-declare-action-${getId(action)}-object`)}
                blindingData={blindingData}
              />
            </Card>
          )}
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    (state, props) => props.acl,
    (state, props) => props.action,
    createActionMapSelector(),
    (user, acl, declareAction, actionMap) => {
      let createReleaseAction =
        getId(declareAction.instrument) &&
        getWorkflowAction(getId(declareAction.instrument), {
          user,
          actionMap,
          acl
        });

      return { createReleaseAction };
    }
  )
)(AnnotableDeclareAction);

function getAnswer(action, question) {
  const answer = arrayify(action.result).find(answer => {
    return getId(answer.parentItem) === getId(question);
  });

  return answer;
}
