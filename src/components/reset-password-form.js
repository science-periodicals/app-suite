import React from 'react';
import PropTypes from 'prop-types';
import { Card, ControlPanel, PaperButton, PaperInput } from '@scipe/ui';
import { xhr } from '@scipe/librarian';
import Notice from './notice';
import { createEmailMessage } from '../utils/email-utils';

export default class ResetPasswordForm extends React.Component {
  static propTypes = {
    onClose: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      username: '',
      isActive: false,
      error: null,
      resetPasswordAction: null
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this.xhr) {
      this.xhr.abort();
    }
  }

  handleClose = e => {
    const { onClose } = this.props;

    onClose();
  };

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value, error: null });
  };

  handleSubmit = e => {
    const { username } = this.state;
    const userId = `user:${username}`;
    const action = {
      '@type': 'ResetPasswordAction',
      agent: userId,
      actionStatus: 'CompletedActionStatus',
      object: userId
    };
    action.potentialAction = {
      '@type': 'InformAction',
      recipient: userId,
      actionStatus: 'CompletedActionStatus',
      instrument: createEmailMessage(action)
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    this.xhr = r.xhr;

    this.setState({ isActive: true, resetPasswordAction: null }, () => {
      r.then(({ body: resetPasswordAction }) => {
        if (this._isMounted) {
          this.setState({ isActive: false, resetPasswordAction });
        }
      }).catch(err => {
        if (this._isMounted) {
          this.setState({
            error: err,
            isActive: false,
            resetPasswordAction: null
          });
        }
      });
    });
  };

  render() {
    const { username, isActive, error, resetPasswordAction } = this.state;

    return (
      <div>
        <Card>
          <header>
            <h2>Reset Password</h2>
          </header>

          {resetPasswordAction ? (
            <Notice iconName="check">
              An email with instruction to reset your password has been sent
            </Notice>
          ) : (
            <Notice>
              Enter your username and an email with instruction to reset your
              password will be sent to the address associated with your account
            </Notice>
          )}

          {!resetPasswordAction && (
            <PaperInput
              name="username"
              label="username"
              type="text"
              autoComplete="off"
              onChange={this.handleChange}
              value={username}
              disabled={isActive}
            />
          )}

          <ControlPanel error={error}>
            <PaperButton onClick={this.handleClose}>Close</PaperButton>
            {!resetPasswordAction && (
              <PaperButton
                type="submit"
                onClick={this.handleSubmit}
                disabled={!username || isActive}
              >
                Submit
              </PaperButton>
            )}
          </ControlPanel>
        </Card>
      </div>
    );
  }
}
