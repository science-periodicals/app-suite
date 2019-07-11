import React from 'react';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import querystring from 'querystring';
import { createSelector } from 'reselect';
import {
  LinkButton,
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
  StartMenu
} from '@scipe/ui';
import {
  login,
  proxyLogin,
  clearLoginError
} from '../actions/user-action-creators';
import ResetPasswordForm from './reset-password-form';

/**
 * Note: this is used as a login page and is used to log in to the dashboard
 * Logging in to sifter homepage should be done from Sifter using a Login
 * modal (to avoid domain change redirection)
 *
 * Need to handle some query string params:
 * - `username`  (prepopulate `username`) (typically added by
 *    POST /register on successful registration)
 * - `next` (where to go after succesful login)
 *
 */
class Login extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,

    // redux
    loginStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }).isRequired,
    login: PropTypes.func.isRequired,
    proxyLogin: PropTypes.func.isRequired,
    clearLoginError: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    const query = querystring.parse(props.location.search.slice(1));

    this.state = {
      isModalOpen: false,
      token: '',
      username: query.username || '',
      password: ''
    };
  }

  componentDidMount() {
    const { location, history } = this.props;

    const query = querystring.parse(location.search.slice(1));
    if (query.username) {
      // username was set in the state in the constructor so we remove it from the URL
      const nextQuery = omit(query, ['username']);
      history.replace(
        `/login${
          Object.keys(nextQuery).length
            ? `?${querystring.stringify(nextQuery)}`
            : ''
        }`
      );
    }
  }

  handlePreventFormSubmit = e => {
    e.preventDefault();
  };

  handleSubmit(isProxyUserLogin, e) {
    e.preventDefault();

    const {
      login,
      proxyLogin,
      history,
      location,
      loginStatus: { error }
    } = this.props;

    if (isProxyUserLogin) {
      const { token } = this.state;
      proxyLogin(token, { history });
    } else {
      const query = querystring.parse(location.search.slice(1));
      const { username, password } = this.state;
      if (username && password) {
        this.setState({ error: null });

        const $meta = document.querySelector('meta[name="csrf-token"]');

        if ($meta) {
          const csrfToken = $meta.getAttribute('content');

          if (!error) {
            login(username, password, { csrfToken, history, next: query.next });
          }
        }
      }
    }
  }

  handleChange = e => {
    const {
      loginStatus: { error },
      clearLoginError
    } = this.props;
    if (error) {
      clearLoginError();
    }
    this.setState({ [e.target.name]: e.target.value });
  };

  handleOpenModal = e => {
    e.preventDefault();
    this.setState({ isModalOpen: true });
  };

  handleCloseModal = () => {
    this.setState({ isModalOpen: false });
  };

  render() {
    const {
      location,
      loginStatus: { error, active }
    } = this.props;
    const { token, username, password, isModalOpen } = this.state;

    const query = querystring.parse(location.search.slice(1));
    const isProxyUserLogin = String(query.proxyAuth) === 'true';

    const isSubmittable = isProxyUserLogin ? !!token : !!(username && password);

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
                key: 'login',
                to: `/login${
                  query.next ? `?next=${encodeURIComponent(query.next)}` : ''
                }`,
                children: 'login'
              }
            ]}
            startMenu={<StartMenu />}
          />
        </AppLayoutHeader>

        <AppLayoutMiddle widthMode="center" maxContentWidth="980px">
          <Card className="login">
            <div className="login__content">
              <form onClick={this.handlePreventFormSubmit}>
                <div className="login__row">
                  <PaperInput
                    name={isProxyUserLogin ? 'token' : 'username'}
                    label={
                      isProxyUserLogin ? 'authentication token' : 'username'
                    }
                    type="text"
                    autoComplete="off"
                    value={isProxyUserLogin ? token : username}
                    disabled={active}
                    onChange={this.handleChange}
                  />
                </div>

                {!isProxyUserLogin && (
                  <div className="login__row">
                    <PaperInput
                      name="password"
                      label="password"
                      type="password"
                      autoComplete="off"
                      value={password}
                      disabled={active}
                      onChange={this.handleChange}
                    />
                  </div>
                )}

                <ControlPanel error={error}>
                  <PaperButton
                    type="submit"
                    disabled={active || !isSubmittable}
                    onClick={this.handleSubmit.bind(this, isProxyUserLogin)}
                  >
                    {active ? 'Logging in…' : 'Log in'}
                  </PaperButton>
                </ControlPanel>
              </form>

              <p>
                Don’t have an account yet?{' '}
                <Link
                  to={{
                    pathname: 'register',
                    search: query.next
                      ? `?next=${encodeURIComponent(query.next)}`
                      : undefined
                  }}
                >
                  register
                </Link>
              </p>
              <p>
                Forgot password?{' '}
                <LinkButton onClick={this.handleOpenModal}>reset it</LinkButton>
              </p>
            </div>

            {isModalOpen && (
              <Modal>
                <ResetPasswordForm onClose={this.handleCloseModal} />
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

export default connect(
  createSelector(
    state => state.loginStatus,
    loginStatus => {
      return { loginStatus };
    }
  ),
  { login, proxyLogin, clearLoginError }
)(Login);
