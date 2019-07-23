import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { withRouter, Link } from 'react-router-dom';
import Iconoclass from '@scipe/iconoclass';
import { getNodeMap, arrayify, getId } from '@scipe/jsonld';
import { getDisplayName, Menu, MenuItem, ActionIdentifier } from '@scipe/ui';
import {
  createActionMapSelector,
  createGraphAclSelector
} from '../selectors/graph-selectors';
import { getWorkflowAction } from '../utils/workflow';
import ShellLink from './shell/shell-link';

class CommentIsBasedOnEditor extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired, // needed for selector
    assessAction: PropTypes.shape({
      '@type': PropTypes.oneOf(['AssessAction'])
    }).isRequired, // an AssessAction with an optional `instrument` property containing the relevant review actions @id
    isBasedOn: PropTypes.array,
    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,

    onAdd: PropTypes.func,
    onDelete: PropTypes.func,

    linkType: PropTypes.oneOf(['shell', 'transition']),

    portal: PropTypes.bool, // set to `false` when used in the shell so that the menu triggers the scroll when it is at the bottom

    // redux
    user: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,
    reviewActions: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  static defaultProps = {
    isBasedOn: [],
    linkType: 'transition',
    portal: true,
    onAdd: noop,
    onDelete: noop
  };

  handleDelete(reviewActionId) {
    const { onDelete } = this.props;

    onDelete(reviewActionId);
  }

  handleAdd(reviewActionId) {
    const { onAdd } = this.props;

    onAdd(reviewActionId);
  }

  render() {
    const {
      user,
      acl,
      reviewActions,
      isBasedOn,
      readOnly,
      disabled,
      portal,
      linkType
    } = this.props;
    const blindingData = acl.getBlindingData(user, {
      ignoreEndDateOnPublicationOrRejection: true
    });

    const reviewActionMap = getNodeMap(reviewActions);

    // TODO clicking on review open review in shell if and only if the user can view the review
    // TODO delete
    const selectedReviewActions = arrayify(isBasedOn)
      .map(reviewActionId => reviewActionMap[getId(reviewActionId)])
      .filter(Boolean);

    const potentialReviewActions = reviewActions.filter(
      action =>
        !selectedReviewActions.some(_action => getId(_action) === getId(action))
    );

    if (
      !selectedReviewActions.length &&
      (readOnly || !potentialReviewActions.length)
    ) {
      return null;
    }

    return (
      <div className="comment-is-based-on-editor">
        <span className="comment-is-based-on-editor__label">Based On </span>

        <ul className="comment-is-based-on-editor__list sa__inline-list">
          {selectedReviewActions.map(reviewAction => {
            const reviewName = `${getDisplayName(
              blindingData,
              reviewAction.agent,
              {
                addRoleNameSuffix: false
              }
            )} review`;

            const [stageIndex, actionIndex] = reviewAction.identifier.split(
              '.'
            );

            return (
              <li
                key={getId(reviewAction)}
                className="comment-is-based-on-editor__list-item"
              >
                <span className="comment-is-based-on-editor__list-item-text">
                  {linkType === 'shell' ? (
                    <Fragment>
                      <span className="comment-is-based-on-editor__list-item-text__name">
                        {reviewName}{' '}
                      </span>
                      <ActionIdentifier>
                        <ShellLink
                          type="attachment"
                          nodeId={getId(reviewAction)}
                          hash={`#${reviewAction.identifier}`}
                        >
                          {reviewAction.identifier}
                        </ShellLink>
                      </ActionIdentifier>
                    </Fragment>
                  ) : (
                    <span>
                      {reviewName}{' '}
                      <ActionIdentifier>
                        <Link
                          className="comment-is-based-on-editor__external-link"
                          to={{
                            pathname: location.pathname,
                            search: `?stage=${stageIndex}&action=${actionIndex}`
                          }}
                        >
                          {reviewAction.identifier}{' '}
                          <Iconoclass
                            iconName="openInNew"
                            tagName="span"
                            iconSize={8}
                          />
                        </Link>
                      </ActionIdentifier>
                    </span>
                  )}
                </span>

                {!readOnly && (
                  <Iconoclass
                    className="comment-is-based-on-editor__delete-button"
                    tagName="span"
                    size={'16px'}
                    iconName="delete"
                    behavior="button"
                    disabled={disabled}
                    onClick={this.handleDelete.bind(this, getId(reviewAction))}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {!readOnly && !!potentialReviewActions.length && (
          <div className="comment-is-based-on-editor__add">
            <Menu iconName="add" iconSize={18} portal={portal}>
              {potentialReviewActions.map(reviewAction => (
                <MenuItem
                  key={getId(reviewAction)}
                  disabled={disabled}
                  onClick={this.handleAdd.bind(this, getId(reviewAction))}
                >
                  {`${getDisplayName(blindingData, reviewAction.agent, {
                    addRoleNameSuffix: false
                  })} review`}{' '}
                  <ActionIdentifier>{reviewAction.identifier}</ActionIdentifier>
                </MenuItem>
              ))}
            </Menu>
          </div>
        )}
      </div>
    );
  }
}

function makeSelector() {
  return createSelector(
    state => state.user,
    (state, props) => props.assessAction,
    createGraphAclSelector(),
    createActionMapSelector(),

    (user, assessAction, acl, actionMap) => {
      const reviewActions = arrayify(assessAction.instrument)
        .map(instrument => {
          return getWorkflowAction(getId(instrument), {
            user,
            actionMap,
            acl
          });
        })
        .filter(
          instrument =>
            instrument &&
            instrument['@type'] === 'ReviewAction' &&
            instrument.actionStatus === 'CompletedActionStatus'
        );

      return {
        user,
        acl,
        reviewActions
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

export default withRouter(connect(makeMapStateToProps)(CommentIsBasedOnEditor));
