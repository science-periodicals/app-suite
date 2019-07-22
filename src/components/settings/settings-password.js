import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { xhr } from '@scipe/librarian';
import { getId } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import { PaperInput, ControlPanel, BemTags, PaperButton } from '@scipe/ui';
import Notice from '../notice';

export default class SettingsPassword extends Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      oldPassword: '',
      password: '',
      confirmedPassword: '',
      error: null,
      isActive: false
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

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value, error: null });
  };

  handleSubmit = e => {
    e.preventDefault();

    const { user } = this.props;
    const { oldPassword, password } = this.state;

    this.setState({ isActive: true }, () => {
      const r = xhr({
        url: '/action',
        method: 'POST',
        body: {
          '@type': 'UpdatePasswordAction',
          actionStatus: 'CompletedActionStatus',
          agent: getId(user),
          instrument: {
            '@type': 'Password',
            value: oldPassword
          },
          object: {
            '@type': 'Password',
            value: password
          },
          targetCollection: getId(user)
        },
        json: true
      });

      this.xhr = r.xhr;

      r.then(({ body }) => {
        window.location.replace('/logout');
        if (this._isMounted) {
          this.setState({
            oldPassword: '',
            password: '',
            confirmedPassword: '',
            error: null,
            isActive: false
          });
        }
      }).catch(err => {
        if (this._isMounted) {
          this.setState({ error: err, isActive: false });
        }
      });
    });
  };

  render() {
    const { disabled } = this.props;
    const {
      oldPassword,
      password,
      confirmedPassword,
      error,
      isActive
    } = this.state;

    const bem = BemTags();

    const canSubmit =
      !isActive &&
      oldPassword &&
      password &&
      confirmedPassword &&
      password === confirmedPassword;

    let clientError;
    if (password && confirmedPassword && password !== confirmedPassword) {
      clientError = new Error(
        'new password and confirmed password do not match'
      );
    }

    return (
      <div className={bem`settings-password`}>
        <div className={bem`content`}>
          <header className={bem`header`}>
            <Iconoclass
              iconName="accessClosed"
              round={true}
              className={bem`header-icon`}
              size={'3.2rem'}
            />
            <h2 className={bem`header-text`}>Change password</h2>
          </header>

          <section className={bem`card-body`}>
            <Notice>
              After changing your password you will be logged out and will have
              to login again with your new password
            </Notice>

            <PaperInput
              label="Old password"
              type="password"
              name="oldPassword"
              value={oldPassword}
              disabled={disabled}
              onChange={this.handleChange}
            />
            <PaperInput
              label="New password"
              type="password"
              name="password"
              value={password}
              disabled={disabled}
              onChange={this.handleChange}
            />
            <PaperInput
              label="Confirm new password"
              type="password"
              name="confirmedPassword"
              value={confirmedPassword}
              disabled={disabled}
              onChange={this.handleChange}
            />

            <ControlPanel error={clientError || error}>
              <PaperButton
                type="submit"
                disabled={disabled || !canSubmit}
                onClick={this.handleSubmit}
              >
                {isActive ? 'Updating password…' : 'Update password'}
              </PaperButton>
            </ControlPanel>
          </section>
        </div>
      </div>
    );
  }
}
