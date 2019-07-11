import React from 'react';
import PropTypes from 'prop-types';
import { textify } from '@scipe/jsonld';
import {
  Card,
  RichTextarea,
  PaperInput,
  ControlPanel,
  PaperButton,
  Value,
  API_LABELS
} from '@scipe/ui';

export default class EmailComposer extends React.Component {
  static propTypes = {
    // Typically an InviteAction containing an InformAction as a potentialAction itself containing an EmailMessage as instrument that this component will allow to edit
    action: PropTypes.shape({
      '@type': PropTypes.string.isRequired,
      potentialAction: PropTypes.shape({
        '@type': PropTypes.oneOf(['InformAction']),
        instrument: PropTypes.shape({
          '@type': PropTypes.oneOf(['EmailMessage']),
          description: PropTypes.string,
          text: PropTypes.oneOfType([
            PropTypes.shape({
              '@type': PropTypes.oneOf(['rdf:HTML']),
              '@value': PropTypes.string
            }),
            PropTypes.string
          ])
        }).isRequired
      }).isRequired
    }),
    children: PropTypes.any,
    onCancel: PropTypes.func.isRequired,
    onAction: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (props.action !== state.lastAction) {
      return getStateFromAction(props.action);
    }

    return null;
  }

  constructor(props) {
    super(props);
    this.state = getStateFromAction(props.action);
  }

  handleChange = e => {
    if (e.preventDefault) {
      e.preventDefault();
    }
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  handleCancel = e => {
    e.preventDefault();
    this.props.onCancel();
  };

  handleSend = e => {
    e.preventDefault();
    const { subject, body } = this.state;
    const { action } = this.props;

    this.props.onAction(
      Object.assign({}, action, {
        potentialAction: Object.assign({}, action.potentialAction, {
          instrument: Object.assign({}, action.potentialAction.instrument, {
            description: subject,
            text: body
          })
        })
      })
    );
  };

  render() {
    const { action, children } = this.props;
    const { subject, body } = this.state;

    return (
      <Card className="email-composer">
        <Value tagName="h3">
          {action.alternateName ||
            action.name ||
            API_LABELS[action['@type']] ||
            'Email'}
        </Value>

        <div className="email-composer__body">
          <PaperInput
            name="subject"
            label="subject"
            value={subject}
            onChange={this.handleChange}
          />

          <RichTextarea
            name="body"
            label="body"
            defaultValue={body}
            onSubmit={this.handleChange}
          />
        </div>

        {children}

        <ControlPanel>
          <PaperButton onClick={this.handleCancel}>Cancel</PaperButton>
          <PaperButton onClick={this.handleSend}>Send</PaperButton>
        </ControlPanel>
      </Card>
    );
  }
}

function getStateFromAction(action) {
  const emailMessage =
    action && action.potentialAction && action.potentialAction.instrument;

  return {
    lastAction: action,
    subject: textify(emailMessage && emailMessage.description) || '',
    body: (emailMessage && emailMessage.text) || ''
  };
}
