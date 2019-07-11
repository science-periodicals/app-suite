import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { getId, arrayify, getValue, createValue } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import {
  ControlPanel,
  PaperTextarea,
  PaperButton,
  withOnSubmit
} from '@scipe/ui';
import { getChecksumValue, createId } from '@scipe/librarian';
import Encoding from './encoding';
import { getTypesetterRevisionRequestComment } from '../utils/workflow';

const ControlledPaperTextarea = withOnSubmit(PaperTextarea);

export default class EncodingAttachment extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string,
    stageId: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    action: PropTypes.shape({
      '@type': PropTypes.oneOf(['TypesettingAction']).isRequired
    }).isRequired, // TypesettingAction
    encoding: PropTypes.object.isRequired,
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,
    canPerform: PropTypes.bool,
    saveWorkflowAction: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (state.lastEncoding !== props.encoding) {
      return {
        text: '',
        lastEncoding: props.encoding
      };
    }
    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      text: '',
      lastEncoding: props.encoding
    };
  }

  handleChangeNewCommentText = e => {
    this.setState({ [e.target.name]: createValue(e.target.value) });
  };

  handleUpdateCommentText = e => {
    const { graphId, action, saveWorkflowAction } = this.props;
    const comment = getTypesetterRevisionRequestComment(action);

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).map(_comment => {
        if (getId(_comment) === getId(comment)) {
          return Object.assign({}, comment, {
            [e.target.name]: createValue(e.target.value)
          });
        }
        return _comment;
      })
    });
  };

  handleSubmit = e => {
    const { graphId, action, encoding, saveWorkflowAction } = this.props;
    const { text } = this.state;

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).concat({
        '@id': createId('cnode', null, getId(action))['@id'],
        '@type': 'RevisionRequestComment',
        dateCreated: new Date().toISOString(),
        ifMatch: getChecksumValue(encoding, 'sha256'),
        text
      })
    });
  };

  handleCancel = e => {
    const { graphId, action, saveWorkflowAction } = this.props;
    const comment = getTypesetterRevisionRequestComment(action);

    saveWorkflowAction(graphId, {
      '@id': getId(action),
      comment: arrayify(action.comment).filter(
        _comment => getId(comment) !== getId(_comment)
      )
    });

    this.setState({ text: '' });
  };

  render() {
    const {
      id,
      graphId,
      action,
      encoding,
      disabled,
      readOnly,
      canPerform
    } = this.props;

    const { text } = this.state;
    const comment = getTypesetterRevisionRequestComment(action);

    return (
      <section
        id={id}
        className="encoding-attachment"
        data-testid={'encoding-attachment'}
      >
        <header className="selectable-indent">
          <h2 className="annotable-action__attachment-title">
            <Iconoclass
              iconName="email"
              className="annotable-action__attachment-title-icon"
            />
            Document to typeset
          </h2>
        </header>

        <div className="selectable-indent  encoding-attachment__encoding">
          <Encoding
            action={action}
            graphId={graphId}
            encoding={encoding}
            disabled={true}
            readOnly={true}
            isFromMultiPartImage={false}
          />
        </div>

        <div className="selectable-indent encoding-attachment__revision-request">
          {comment ? (
            <Fragment>
              <ControlledPaperTextarea
                label="Requested changes"
                name="text"
                readOnly={readOnly}
                disabled={disabled || !canPerform || readOnly}
                onSubmit={this.handleUpdateCommentText}
                value={comment && comment.text ? getValue(comment.text) : ''}
              />

              <ControlPanel>
                <PaperButton
                  onClick={this.handleCancel}
                  disabled={disabled || !canPerform}
                >
                  Cancel revision request
                </PaperButton>
              </ControlPanel>
            </Fragment>
          ) : (
            <Fragment>
              <ControlledPaperTextarea
                label="Requested changes"
                name="text"
                readOnly={readOnly}
                disabled={disabled || !canPerform || readOnly}
                onChange={this.handleChangeNewCommentText}
                value={getValue(text) || ''}
              />

              <ControlPanel>
                <PaperButton
                  onClick={this.handleSubmit}
                  disabled={disabled || !canPerform || !text}
                >
                  Request revision
                </PaperButton>
              </ControlPanel>
            </Fragment>
          )}
        </div>
      </section>
    );
  }
}
