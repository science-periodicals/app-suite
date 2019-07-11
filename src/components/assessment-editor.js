import React, { Component } from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { arrayify, getId, getNodeMap } from '@scipe/jsonld';
import { getVersion, getLocationIdentifier } from '@scipe/librarian';
import { PaperSelect, RichTextarea } from '@scipe/ui';
import Annotable from './annotable';
import Counter from '../utils/counter';
import { ERROR_MISSING_VALUE } from '../constants';
import { createWorkflowSelector } from '../selectors/graph-selectors';
import {
  getSelectorGraphParam,
  getRelativeLocationLink
} from '../utils/annotations';

const type2name = {
  RejectAction: 'Reject',
  StartWorkflowStageAction: 'Next'
};

class AssessmentEditor extends Component {
  static propTypes = {
    journalId: PropTypes.string.isRequired,
    graph: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    saveWorkflowAction: PropTypes.func.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,

    action: PropTypes.shape({
      '@type': PropTypes.oneOf(['AssessAction']).isRequired
    }).isRequired,
    isBlocked: PropTypes.bool,
    canComment: PropTypes.bool,
    canPerform: PropTypes.bool,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    createSelector: PropTypes.func.isRequired,
    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,

    // redux
    isRevisionDecision: PropTypes.bool
  };

  static defaultProps = {
    saveWorkflowAction: noop
  };

  handleChange = e => {
    const { graph, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(getId(graph), {
      '@id': getId(action),
      [e.target.name]: e.target.value
    });
  };

  handleChangeResult = e => {
    const {
      graph,
      action,
      saveWorkflowAction,
      isRevisionDecision
    } = this.props;

    saveWorkflowAction(getId(graph), {
      '@id': getId(action),
      [e.target.name]:
        e.target.value === 'tmp:null' ? undefined : e.target.value,
      // reset revision type if the decision is not a revision
      revisionType: isRevisionDecision ? action.revisionType : undefined
    });
  };

  handleChangeRevisionType = e => {
    const { graph, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(getId(graph), {
      '@id': getId(action),
      [e.target.name]:
        e.target.value === 'tmp:null' ? undefined : e.target.value
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
      annotable,
      displayPermalink,
      displayAnnotations,
      counter,
      canComment,
      canPerform,
      isBlocked,
      createSelector,
      isRevisionDecision,
      locationOptions
    } = this.props;

    const potentialResults = arrayify(action.potentialResult);

    return (
      <div className="assessment-editor">
        <section>
          <div className="selectable-indent">
            <h4 className="annotable-action__sub-title">Decision</h4>
            <Annotable
              graphId={graphId}
              selector={createSelector(
                {
                  '@type': 'NodeSelector',
                  graph: getSelectorGraphParam(action),
                  node: getId(action),
                  selectedProperty: 'result'
                },
                `assessment-editor-${getId(action)}-result`
              )}
              counter={counter.increment({
                value: getLocationIdentifier(action['@type'], 'result'),
                level: 3,
                key: `assessment-editor-${getId(action)}-result`
              })}
              annotable={annotable && canComment}
              selectable={false}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
              info={
                !disabled && canPerform && !isBlocked && !getId(action.result)
                  ? ERROR_MISSING_VALUE
                  : undefined
              }
            >
              <div className="annotable-action__section">
                <PaperSelect
                  value={
                    action.actionStatus === 'CompletedActionStatus'
                      ? getId(action.result) || 'tmp:null'
                      : potentialResults.length > 1
                      ? getId(action.result) || 'tmp:null'
                      : getId(arrayify(potentialResults)[0]) || 'tmp:null'
                  }
                  name="result"
                  label="result"
                  portal={true}
                  onChange={this.handleChangeResult}
                  floatLabel={true}
                  readOnly={readOnly}
                  disabled={disabled || !canPerform || isBlocked}
                >
                  {potentialResults.map(potentialResult => (
                    <option
                      key={getId(potentialResult)}
                      value={getId(potentialResult)}
                    >
                      {potentialResult.alternateName ||
                        potentialResult.name ||
                        type2name[potentialResult['@type']]}
                    </option>
                  ))}
                  <option key="tmp:null" value="tmp:null">
                    No decision
                  </option>
                </PaperSelect>
              </div>
            </Annotable>

            {isRevisionDecision && (
              <Annotable
                graphId={graphId}
                selector={createSelector(
                  {
                    '@type': 'NodeSelector',
                    graph: getSelectorGraphParam(action),
                    node: getId(action),
                    selectedProperty: 'revisionType'
                  },
                  `assessment-editor-${getId(action)}-revisionType`
                )}
                counter={counter.increment({
                  level: 3,
                  value: getLocationIdentifier(action['@type'], 'revisionType'),
                  key: `assessment-editor-${getId(action)}-revisionType`
                })}
                annotable={annotable && canComment}
                selectable={false}
                displayAnnotations={displayAnnotations}
                displayPermalink={displayPermalink}
                info={
                  !disabled && canPerform && !isBlocked && !action.revisionType
                    ? ERROR_MISSING_VALUE
                    : undefined
                }
              >
                <div className="annotable-action__section">
                  <PaperSelect
                    value={action.revisionType || 'tmp:null'}
                    name="revisionType"
                    label="revision type"
                    portal={true}
                    onChange={this.handleChangeRevisionType}
                    floatLabel={true}
                    readOnly={readOnly}
                    disabled={disabled || !canPerform || isBlocked}
                  >
                    <option value="MinorRevision">Minor revision</option>
                    <option value="MajorRevision">Major revision</option>
                    <option value="tmp:null">Unspecified</option>
                  </PaperSelect>
                </div>
              </Annotable>
            )}

            <Annotable
              graphId={graphId}
              selector={createSelector(
                {
                  '@type': 'NodeSelector',
                  graph: getSelectorGraphParam(action),
                  node: getId(action),
                  selectedProperty: 'resultReason'
                },
                `assessment-editor-${getId(action)}-resultReason`
              )}
              counter={counter.increment({
                level: 3,
                value: getLocationIdentifier(action['@type'], 'resultReason'),
                key: `assessment-editor-${getId(action)}-resultReason`
              })}
              annotable={annotable && canComment}
              selectable={false}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
              info={
                !disabled && canPerform && !isBlocked && !action.resultReason
                  ? ERROR_MISSING_VALUE
                  : undefined
              }
            >
              <RichTextarea
                name="resultReason"
                label="reason"
                readOnly={readOnly}
                disabled={disabled || !canPerform || isBlocked}
                defaultValue={action.resultReason}
                onSubmit={this.handleChange}
                options={locationOptions}
                suggestionMapper={this.suggestionMapper}
              />
            </Annotable>
          </div>
        </section>
      </div>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.action,
    createWorkflowSelector(),
    (assessAction, workflowSpecification) => {
      let isRevisionDecision = false;
      if (getId(assessAction.result)) {
        const result = arrayify(assessAction.potentialResult).find(
          result => getId(result) === getId(assessAction.result)
        );

        if (result && workflowSpecification) {
          const nodeMap = getNodeMap(
            workflowSpecification.potentialAction.result
          );

          const stage = nodeMap[getId(result.instanceOf)];
          if (stage && stage['@type'] === 'StartWorkflowStageAction') {
            isRevisionDecision = arrayify(stage.result).some(resultId => {
              const result = nodeMap[getId(resultId)];
              let graph;
              if (result['@type'] === 'CreateReleaseAction') {
                graph = nodeMap[getId(result.result)];
              }
              return (
                result &&
                result['@type'] === 'CreateReleaseAction' &&
                (!graph ||
                  !arrayify(graph.potentialAction).some(actionId => {
                    const action = nodeMap[getId(actionId)];
                    return action && action['@type'] === 'PublishAction';
                  }))
              );
            });
          }
        }
      }

      return { isRevisionDecision };
    }
  )
)(AssessmentEditor);
