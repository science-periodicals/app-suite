import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import { Card, withOnSubmit, PaperInput, Price } from '@scipe/ui';
import { getObjectId, getLocationIdentifier } from '@scipe/librarian';
import Counter from '../utils/counter';
import Annotable from './annotable';
import AnnotableActionHead from './annotable-action-head';
import { StyleCardBody } from './annotable-action';
import Notice, { NoAccessNotice } from './notice';
import FilesAttachment from './files-attachment';
import { createActionMapSelector } from '../selectors/graph-selectors';
import { getFileAction } from '../utils/workflow';
import { getSelectorGraphParam } from '../utils/annotations';

const ControlledPaperInput = withOnSubmit(PaperInput);

class AnnotablePayAction extends React.Component {
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

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,

    saveWorkflowAction: PropTypes.func.isRequired,
    postWorkflowAction: PropTypes.func.isRequired,
    memoizeCreateSelector: PropTypes.func.isRequired,

    // redux
    createReleaseAction: PropTypes.object
  };

  handleChange = e => {
    const { graph, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(getId(graph), {
      '@id': getId(action),
      [e.target.name]:
        e.target.name === 'requestedPrice'
          ? e.target.value !== ''
            ? parseInt(e.target.value, 10)
            : null
          : e.target.value
    });
  };

  render() {
    const {
      user,
      acl,
      journalId,
      disabled,
      readOnly,
      createReleaseAction,
      blindingData,
      canView,
      canComment,
      displayAnnotations,
      annotable,
      action,
      endorseAction,
      graph,
      counter,
      canPerform,
      memoizeCreateSelector,
      children
    } = this.props;

    return (
      <div className="annotable-pay-action">
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
              <section className="selectable-indent">
                <h4 className="annotable-action__sub-title">Payment</h4>

                <Notice iconName="money">
                  {action.actionStatus === 'EndorsedActionStatus' ? (
                    <span>
                      Amount due:{' '}
                      <strong>
                        <Price
                          requestedPrice={action.requestedPrice}
                          priceSpecification={action.priceSpecification}
                          numberOfUnit={1}
                        />
                      </strong>{' '}
                      (was{' '}
                      <Price
                        priceSpecification={action.priceSpecification}
                        numberOfUnit={1}
                      />
                      )
                    </span>
                  ) : action.actionStatus === 'CompletedActionStatus' ? (
                    <span>
                      Amount paid:{' '}
                      <strong>
                        <Price
                          requestedPrice={action.requestedPrice}
                          priceSpecification={action.priceSpecification}
                          numberOfUnit={1}
                        />
                      </strong>{' '}
                      (was{' '}
                      <Price
                        priceSpecification={action.priceSpecification}
                        numberOfUnit={1}
                      />
                      )
                    </span>
                  ) : (
                    <span>
                      Amount due:{' '}
                      <strong>
                        <Price
                          requestedPrice={action.requestedPrice}
                          priceSpecification={action.priceSpecification}
                          numberOfUnit={1}
                        />
                      </strong>
                    </span>
                  )}
                </Notice>

                {/* controls to request a discout */}
                {!!endorseAction && action.priceSpecification.price > 0 && (
                  <Fragment>
                    {endorseAction.actionStatus !== 'CompletedActionStatus' && (
                      <Notice>
                        <span>
                          Authors unable to pay the total amount may be eligible
                          for a partial or total discount. Authors can also make
                          a donnation to the journal by entering a higher price.{' '}
                          {action.actionStatus === 'ActiveActionStatus' ? (
                            <Fragment>
                              Indicate a requested price below and stage the
                              action to get the endorser approval.
                            </Fragment>
                          ) : (
                            ''
                          )}
                        </span>
                      </Notice>
                    )}

                    <Annotable
                      graphId={getId(graph)}
                      counter={counter.increment({
                        level: 3,
                        value: getLocationIdentifier(
                          action['@type'],
                          'requestedPrice'
                        ),
                        key: `annotable-pay-action--${getId(
                          action
                        )}-requestedPrice`
                      })}
                      selector={memoizeCreateSelector(
                        {
                          '@type': 'NodeSelector',
                          graph: getSelectorGraphParam(action),
                          node: getId(action),
                          selectedProperty: 'requestedPrice'
                        },
                        `annotable-pay-action-${getId(action)}-requestedPrice`
                      )}
                      selectable={false}
                      annotable={annotable && canComment}
                      displayAnnotations={displayAnnotations}
                    >
                      <ControlledPaperInput
                        label={`Requested price (${action.priceSpecification.priceCurrency})`}
                        name="requestedPrice"
                        type="number"
                        min={0}
                        step={1}
                        disabled={
                          disabled ||
                          !canPerform ||
                          (endorseAction &&
                            endorseAction.actionStatus ===
                              'CompletedActionStatus') ||
                          action.actionStatus ===
                            'EndorsedActionStatus' /* after endorsement price can't be change */
                        }
                        readOnly={readOnly}
                        value={
                          'requestedPrice' in action &&
                          action.requestedPrice != null
                            ? action.requestedPrice
                            : ''
                        }
                        onSubmit={this.handleChange}
                      />
                    </Annotable>
                  </Fragment>
                )}
              </section>
            )}

            {children}
          </StyleCardBody>
        </Card>

        {!!(
          canView &&
          createReleaseAction &&
          createReleaseAction.actionStatus === 'CompletedActionStatus' &&
          getId(graph.mainEntity)
        ) && (
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
                  node: getId(action),
                  graph: getSelectorGraphParam(action),
                  selectedProperty: 'object',
                  hasSubSelector: selector
                };
              }, `annotable-pay-action-${getId(action)}-object`)}
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
    (user, acl, payAction, actionMap) => {
      const createReleaseAction = getFileAction(payAction, {
        user,
        acl,
        actionMap
      });

      return { createReleaseAction };
    }
  )
)(AnnotablePayAction);
