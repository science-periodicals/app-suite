import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import omit from 'lodash/omit';
import PropTypes from 'prop-types';
import { createId, getVersion } from '@scipe/librarian';
import { RichTextarea, PaperInput, withOnSubmit } from '@scipe/ui';
import { getId, arrayify, textify } from '@scipe/jsonld';
import {
  createActionMapSelector,
  createGraphAclSelector,
  locationAutocompleteDataSelector
} from '../../selectors/graph-selectors';
import { saveWorkflowAction } from '../../actions/workflow-action-creators';
import { getWorkflowAction } from '../../utils/workflow';
import CommentIsBasedOnEditor from '../comment-is-based-on-editor';
import {
  getSelectorGraphParam,
  getRelativeLocationLink
} from '../../utils/annotations';

const ControlledPaperInput = withOnSubmit(PaperInput);

class ShellEditorActionComment extends React.Component {
  static propTypes = {
    // params (from <Shell />)
    graphId: PropTypes.string.isRequired, // needed for selector
    actionId: PropTypes.string.isRequired,
    commentId: PropTypes.string, // required if `requestId` is missing
    requestId: PropTypes.string, // RevisionRequestComment @id => comment is an AuthorResponseComment

    // std props
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,

    // redux
    action: PropTypes.object.isRequired,

    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),

    saveWorkflowAction: PropTypes.func.isRequired
  };

  handleUpsert = e => {
    const {
      graphId,
      commentId,
      requestId,
      action,
      saveWorkflowAction
    } = this.props;

    if (commentId != null) {
      // update
      saveWorkflowAction(graphId, {
        '@id': getId(action),
        comment: arrayify(action.comment).map(comment => {
          if (getId(comment) === commentId) {
            return Object.assign({}, comment, {
              [e.target.name]: e.target.value
            });
          }

          return comment;
        })
      });
    } else {
      // create (only for AuthorResponseComment case)
      saveWorkflowAction(graphId, {
        '@id': getId(action),
        comment: arrayify(action.comment).concat({
          '@id': createId('cnode', null, getId(action))['@id'],
          '@type': 'AuthorResponseComment',
          [e.target.name]: e.target.value,
          parentItem: requestId
        })
      });
    }
  };

  handleAddIsBasedOnItem = uri => {
    const { graphId, commentId, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).map(comment => {
        if (getId(comment) === commentId) {
          return Object.assign({}, comment, {
            isBasedOn: arrayify(comment.isBasedOn).concat(getId(uri))
          });
        }

        return comment;
      })
    });
  };

  handleDeleteIsBasedOnItem = uri => {
    const { graphId, commentId, action, saveWorkflowAction } = this.props;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).map(comment => {
        if (getId(comment) === commentId) {
          const nextIsBasedOn = arrayify(comment.isBasedOn).filter(
            _uri => _uri !== getId(uri)
          );

          return nextIsBasedOn.length
            ? Object.assign({}, comment, {
                isBasedOn: nextIsBasedOn
              })
            : omit(comment, ['isBasedOn']);
        }

        return comment;
      })
    });
  };

  render() {
    const {
      graphId,
      disabled,
      readOnly,
      action,
      commentId,
      requestId,
      locationOptions
    } = this.props;

    const comment = arrayify(action.comment).find(
      comment => getId(comment) === commentId
    );

    // Note: the `data-prevent-link-interceptor-in-shell` attribute is used by
    // the LinkInterceptor in `resource-view.js` to prevent opening the shell for
    // location links and instead scroll the user to the location

    return (
      <div className="shell-editor-action-comment" data-force-scroll="true">
        {!requestId && (
          <ControlledPaperInput
            label="subject"
            name="name"
            large={true}
            readOnly={readOnly}
            disabled={disabled}
            value={textify(comment && comment.name) || ''}
            onSubmit={this.handleUpsert}
          />
        )}

        <RichTextarea
          label={requestId == null ? 'body' : 'response'}
          name="text"
          readOnly={readOnly}
          disabled={disabled}
          defaultValue={comment && comment.text}
          onSubmit={this.handleUpsert}
          options={locationOptions}
          locationLinksType="scroll"
          suggestionMapper={location =>
            getRelativeLocationLink(
              getVersion(getSelectorGraphParam(action)),
              location
            )
          }
        />

        {comment && comment['@type'] === 'RevisionRequestComment' && (
          <CommentIsBasedOnEditor
            graphId={graphId}
            assessAction={action}
            isBasedOn={comment.isBasedOn}
            readOnly={readOnly}
            disabled={disabled}
            portal={false}
            onAdd={this.handleAddIsBasedOnItem}
            onDelete={this.handleDeleteIsBasedOnItem}
          />
        )}
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    (state, props) => props.actionId,
    createGraphAclSelector(),
    createActionMapSelector(),
    locationAutocompleteDataSelector,
    (user, actionId, acl, actionMap, locationOptions) => {
      const action = getWorkflowAction(actionId, { user, acl, actionMap });

      return { action, locationOptions };
    }
  ),
  { saveWorkflowAction }
)(ShellEditorActionComment);
