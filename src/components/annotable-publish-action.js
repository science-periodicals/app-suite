import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import isPlainObject from 'lodash/isPlainObject';
import { getId } from '@scipe/jsonld';
import {
  getObjectId,
  getResultId,
  getLocationIdentifier
} from '@scipe/librarian';
import {
  PaperSlug,
  PaperDateInput,
  PaperTimeInput,
  MenuItem,
  withOnSubmit,
  Card
} from '@scipe/ui';
import Annotable from './annotable';
import Counter from '../utils/counter';
import FilesAttachment from './files-attachment';
import Notice, { NoAccessNotice } from './notice';
import AnnotableActionHead from './annotable-action-head';
import { StyleCardBody } from './annotable-action';
import { createFirstAuthorFamilyNameSelector } from '../selectors/graph-selectors';
import { ERROR_SLUG, WARNING_SLUG } from '../constants';
import { deepSetGraph, getSelectorGraphParam } from '../utils/annotations';

const ControlledPaperSlug = withOnSubmit(PaperSlug);

class AnnotablePublishAction extends Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graph: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
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
    canAssign: PropTypes.bool.isRequired,
    canComment: PropTypes.bool.isRequired,
    canReschedule: PropTypes.bool.isRequired,
    canPerform: PropTypes.bool.isRequired,
    canEndorse: PropTypes.bool.isRequired,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

    counter: PropTypes.instanceOf(Counter).isRequired,

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,
    memoizeCreateSelector: PropTypes.func.isRequired,
    saveWorkflowAction: PropTypes.func.isRequired,

    // redux
    firstAuthorFamilyName: PropTypes.string
  };

  setDatePublished = date => {
    const { graph, action, saveWorkflowAction } = this.props;
    saveWorkflowAction(getId(graph), {
      '@id': getId(action),
      result: Object.assign(
        {},
        isPlainObject(action.result)
          ? action.result
          : typeof action.result === 'string'
          ? { '@id': action.result }
          : undefined,
        {
          datePublished: date.toISOString()
        }
      )
    });
  };

  handleSubmitSlug = e => {
    e.preventDefault();
    const { graph, action, saveWorkflowAction } = this.props;
    saveWorkflowAction(getId(graph), {
      '@id': getId(action),
      result: Object.assign(
        {},
        isPlainObject(action.result)
          ? action.result
          : typeof action.result === 'string'
          ? { '@id': action.result }
          : undefined,
        {
          [e.target.name]: e.target.value
        }
      )
    });
  };

  render() {
    const {
      user,
      acl,
      journalId,
      graphId,
      graph,
      canView,
      counter,
      action,
      readOnly,
      disabled,
      canComment,
      canPerform,
      isBlocked,
      annotable,
      displayAnnotations,
      blindingData,
      firstAuthorFamilyName,
      memoizeCreateSelector,
      children
    } = this.props;

    const date =
      action.result && action.result.datePublished
        ? new Date(action.result.datePublished)
        : new Date();

    return (
      <div className="annotable-publish-action">
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
                <section className="selectable-indent reverse-z-index">
                  <h4 className="annotable-action__sub-title">Slug</h4>

                  <Notice>
                    <span>
                      The{' '}
                      <a href="https://en.wikipedia.org/wiki/Slug_(publishing)">
                        slug
                      </a>{' '}
                      is used to create a human readable URL for the published
                      version of the submission.
                    </span>
                  </Notice>

                  <Annotable
                    graphId={graphId}
                    selectedProperty="slug"
                    selector={memoizeCreateSelector(
                      {
                        '@type': 'NodeSelector',
                        graph: getSelectorGraphParam(action),
                        node: getId(action),
                        selectedProperty: 'result',
                        hasSubSelector: {
                          '@type': 'NodeSelector',
                          graph: getSelectorGraphParam(action),
                          node: getResultId(action),
                          selectedProperty: 'slug'
                        }
                      },
                      `annotable-publish-action-${getId(action)}-slug`
                    )}
                    counter={counter.increment({
                      level: 3,
                      key: `annotable-publish-action-${action}-result-slug`,
                      value: getLocationIdentifier(
                        action['@type'],
                        'result.slug'
                      )
                    })}
                    selectable={false}
                    annotable={annotable && canComment}
                    displayAnnotations={displayAnnotations}
                    info={
                      !disabled && canPerform && !isBlocked
                        ? getSlugInfo(
                            (action.result && action.result.slug) || graph.slug,
                            firstAuthorFamilyName,
                            date
                          )
                        : undefined
                    }
                  >
                    <ControlledPaperSlug
                      readOnly={readOnly}
                      disabled={disabled || !canPerform || isBlocked}
                      name="slug"
                      value={
                        (action.result && action.result.slug) ||
                        graph.slug ||
                        ''
                      }
                      label="value"
                      autoComplete="off"
                      floatLabel={true}
                      onSubmit={this.handleSubmitSlug}
                    />
                  </Annotable>
                </section>

                <section className="selectable-indent reverse-z-index">
                  <h4 className="annotable-action__sub-title">
                    Publication date
                  </h4>
                  <Annotable
                    graphId={graphId}
                    selectedProperty="slug"
                    selector={memoizeCreateSelector(
                      {
                        '@type': 'NodeSelector',
                        graph: getSelectorGraphParam(action),
                        node: getId(action),
                        selectedProperty: 'result',
                        hasSubSelector: {
                          '@type': 'NodeSelector',
                          graph: getSelectorGraphParam(action),
                          node: getResultId(action),
                          selectedProperty: 'datePublished'
                        }
                      },
                      `annotable-publish-action-${getId(action)}-datePublished`
                    )}
                    counter={counter.increment({
                      level: 3,
                      key: `annotable-publish-action-${action}-result-datePublished`,
                      value: getLocationIdentifier(
                        action['@type'],
                        'result.datePublished'
                      )
                    })}
                    annotable={annotable && canComment}
                    selectable={false}
                    displayAnnotations={displayAnnotations}
                  >
                    <div>
                      <PaperDateInput
                        data-test-now="true"
                        showCalendar="menu"
                        portal={true}
                        name="date"
                        label="Date"
                        value={date}
                        onChange={this.setDatePublished}
                        readOnly={readOnly}
                        disabled={disabled || !canPerform || isBlocked}
                      />
                      <PaperTimeInput
                        data-test-now="true"
                        name="time"
                        label="Time"
                        value={date}
                        onChange={this.setDatePublished}
                        readOnly={readOnly}
                        disabled={disabled || !canPerform || isBlocked}
                      >
                        <MenuItem value="09:00">
                          <span style={{ color: 'grey' }}>09:00 AM </span>{' '}
                          Morning
                        </MenuItem>
                        <MenuItem value="12:00">
                          <span style={{ color: 'grey' }}>12:00 PM </span>{' '}
                          Afternoon
                        </MenuItem>
                        <MenuItem value="18:00">
                          <span style={{ color: 'grey' }}>06:00 PM </span>{' '}
                          Evening
                        </MenuItem>
                      </PaperTimeInput>
                    </div>
                  </Annotable>
                </section>
              </Fragment>
            )}
            {children}
          </StyleCardBody>
        </Card>

        {!!(canView && getId(graph.mainEntity)) && (
          <Card bevel={true} className="annotable-action__card">
            <FilesAttachment
              user={user}
              acl={acl}
              journalId={journalId}
              search={counter.search}
              graphId={
                action.actionStatus === 'CompletedActionStatus'
                  ? getResultId(action)
                  : getObjectId(action)
              }
              action={action}
              readOnly={true}
              disabled={true}
              annotable={annotable && canComment}
              displayAnnotations={displayAnnotations}
              createSelector={memoizeCreateSelector(selector => {
                return {
                  '@type': 'NodeSelector',
                  node: getId(action),
                  graph: getSelectorGraphParam(action),
                  selectedProperty: 'result',
                  hasSubSelector: deepSetGraph(
                    selector,
                    getSelectorGraphParam(action)
                  )
                };
              }, `annotabe-typesetting-action-files-attachment-${getId(action)}-result`)}
              blindingData={blindingData}
            />
          </Card>
        )}
      </div>
    );
  }
}

function getSlugInfo(slug, firstAuthorFamilyName, date) {
  if (!slug) {
    return ERROR_SLUG;
  }

  if (firstAuthorFamilyName && date) {
    const re = new RegExp(
      `${firstAuthorFamilyName.toLowerCase()}${date.getFullYear()}[a-z]?`
    );

    if (!re.test(slug)) {
      return WARNING_SLUG;
    }
  }
}

export default connect(
  createSelector(
    createFirstAuthorFamilyNameSelector(),
    firstAuthorFamilyName => {
      return { firstAuthorFamilyName };
    }
  )
)(AnnotablePublishAction);
