import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import querystring from 'querystring';
import { xhr } from '@scipe/librarian';
import {
  Modal,
  Header,
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutMiddle,
  AppLayoutFooter,
  PaperInput,
  PaperButton,
  ControlPanel,
  Card,
  StartMenu,
  PaperButtonLink
} from '@scipe/ui';
import Notice from './notice';

export default class ResetPasswordPage extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    match: PropTypes.shape({
      params: PropTypes.shape({
        username: PropTypes.string.isRequired
      }).isRequired
    }).isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      password: '',
      password2: '',
      error: null,
      isActive: false,
      updatePasswordAction: null
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

  handlePreventFormSubmit = e => {
    e.preventDefault();
  };

  handleSubmit = e => {
    e.preventDefault();

    const { password } = this.state;
    const {
      location,
      match: {
        params: { username }
      }
    } = this.props;

    const query = querystring.parse(location.search.slice(1));
    const userId = `user:${username}`;

    const action = {
      '@type': 'UpdatePasswordAction',
      agent: userId,
      actionStatus: 'CompletedActionStatus',
      targetCollection: userId,
      instrument: {
        '@id': `token:${query.token}`,
        '@type': 'Token',
        tokenType: 'passwordResetToken',
        value: query.value
      },
      object: {
        '@type': 'Password',
        value: password
      }
    };

    const r = xhr({
      url: '/action',
      method: 'POST',
      json: true,
      body: action
    });

    this.xhr = r.xhr;

    this.setState({ isActive: true, updatePasswordAction: null }, () => {
      r.then(({ body: updatePasswordAction }) => {
        if (this._isMounted) {
          this.setState({ isActive: false, updatePasswordAction });
        }
      }).catch(err => {
        if (this._isMounted) {
          this.setState({
            error: err,
            isActive: false,
            updatePasswordAction: null
          });
        }
      });
    });
  };

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value, error: null });
  };

  render() {
    const {
      location,
      match: {
        params: { username }
      }
    } = this.props;

    const {
      password,
      password2,
      isActive,
      error,
      updatePasswordAction
    } = this.state;

    const query = querystring.parse(location.search.slice(1));

    const isSubmittable = password && password === password2;
    return (
      <AppLayout leftExpanded={false} rightExpanded={false}>
        <AppLayoutHeader>
          <Header
            homeLink={{ href: '/' }}
            logoLink={{ href: '/' }}
            loginLink={{
              to: `/login${
                query.next ? `?next=${encodeURIComponent(query.next)}` : ''
              }`
            }}
            registerLink={{
              to: `/register${
                query.next ? `?next=${encodeURIComponent(query.next)}` : ''
              }`
            }}
            crumbs={[
              {
                key: 'reset-password',
                children: 'Reset Password',
                to: {
                  pathname: location.pathname,
                  search: location.search
                }
              },
              {
                key: 'username',
                children: username,
                to: {
                  pathname: location.pathname,
                  search: location.search
                }
              }
            ]}
            startMenu={<StartMenu />}
          />
        </AppLayoutHeader>

        <AppLayoutMiddle widthMode="center" maxContentWidth="980px">
          <Card className="reset-password-page">
            <div className="reset-password-page__content">
              <form onClick={this.handlePreventFormSubmit}>
                <div className="reset-password-page__row">
                  <PaperInput
                    name="password"
                    label="new password"
                    type="password"
                    autoComplete="off"
                    value={password}
                    disabled={isActive}
                    onChange={this.handleChange}
                  />
                </div>

                <div className="reset-password-page__row">
                  <PaperInput
                    name="password2"
                    label="re-enter new password"
                    type="password"
                    autoComplete="off"
                    value={password2}
                    disabled={isActive}
                    onChange={this.handleChange}
                  />
                </div>

                <ControlPanel
                  error={
                    password &&
                    password2 &&
                    password.length === password2.length &&
                    password !== password2
                      ? new Error('Password mismatch')
                      : error
                  }
                >
                  <PaperButton
                    type="submit"
                    disabled={isActive || !isSubmittable}
                    onClick={this.handleSubmit}
                  >
                    {isActive ? 'Resetting password…' : 'Reset password'}
                  </PaperButton>
                </ControlPanel>
              </form>

              <p>
                Remember your password?{' '}
                <Link
                  to={{
                    pathname: '/login',
                    search: query.next
                      ? `?next=${encodeURIComponent(query.next)}`
                      : undefined
                  }}
                >
                  Log in
                </Link>
              </p>
            </div>

            {!!updatePasswordAction && (
              <Modal>
                <Card>
                  <Notice iconName="check">
                    Your password has been successfully updated.
                  </Notice>
                  <ControlPanel>
                    <PaperButtonLink
                      to={{
                        pathname: '/login',
                        search: `?username=${username}`
                      }}
                    >
                      log in
                    </PaperButtonLink>
                  </ControlPanel>
                </Card>
              </Modal>
            )}
          </Card>
        </AppLayoutMiddle>

        <AppLayoutFooter>
          <Footer hideCopyright={true} />
        </AppLayoutFooter>
      </AppLayout>
    );
  }
}
