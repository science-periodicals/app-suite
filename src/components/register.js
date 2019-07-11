import React from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import { Link } from 'react-router-dom';
import { unprefix } from '@scipe/jsonld';
import { xhr, getAgent } from '@scipe/librarian';
import {
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
  PaperButtonLink,
  StartMenu,
  TextLogo
} from '@scipe/ui';
import config from '../utils/config';
import Notice from './notice';

export default class Register extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    match: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      username: '',
      email: '',
      password: '',
      isPosting: false,
      postError: null,
      isFetching: false,
      fetchError: null,
      activeRegisterAction: null
    };
  }

  componentDidMount() {
    this._isMounted = true;

    const {
      match: { params }
    } = this.props;

    if (params.username) {
      this.setState({
        isFetching: true,
        fetchError: null,
        activeRegisterAction: null
      });

      this.xhrFetch = xhr({
        url: `/register/${params.username}`,
        method: 'GET',
        json: true
      });

      this.xhrFetch
        .then(({ body }) => {
          if (this._isMounted) {
            this.setState({
              isFetching: false,
              fetchError: null,
              activeRegisterAction: body
            });
          }
        })
        .catch(err => {
          if (this._isMounted) {
            this.setState({
              isFetching: false,
              fetchError: err,
              activeRegisterAction: null
            });
          }
        });
    }
  }

  componentWillUnmount() {
    if (this.xhrFetch) {
      this.xhrFetch.abort();
    }
    if (this.xhrPost) {
      this.xhrPost.abort();
    }

    this._isMounted = false;
  }

  handlePreventFormSubmit = e => {
    e.preventDefault();
  };

  handleSubmit = e => {
    e.preventDefault();

    const { history, location } = this.props;
    const { username, email, password } = this.state;

    const query = querystring.parse(location.search.slice(1));

    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute('content');

    this.setState({
      isPosting: true,
      postError: null,
      activeRegisterAction: null
    });

    this.xhrFetch = xhr({
      url: `/register${
        query.next ? `?next=${encodeURIComponent(query.next)}` : ''
      }`,
      method: 'POST',
      headers: {
        'CSRF-Token': csrfToken
      },
      body: {
        username,
        email,
        password
      },
      json: true
    });

    this.xhrFetch
      .then(({ body }) => {
        if (this._isMounted) {
          this.setState({
            username: '',
            email: '',
            password: '',
            isPosting: false,
            postError: null,
            activeRegisterAction: body
          });

          history.replace({ pathname: `/register/${username}` });
        }
      })
      .catch(err => {
        if (this._isMounted) {
          this.setState({
            isPosting: false,
            postError: err,
            activeRegisterAction: null
          });
        }
      });
  };

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  render() {
    const {
      location,
      match: { params }
    } = this.props;
    const {
      username,
      email,
      password,
      isPosting,
      postError,
      isFetching,
      fetchError,
      activeRegisterAction
    } = this.state;

    const query = querystring.parse(location.search.slice(1));
    const disabled = isPosting || !email || !username || !password;

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
            startMenu={<StartMenu />}
            crumbs={[
              {
                key: 'register',
                to: `/register${
                  query.next ? `?next=${encodeURIComponent(query.next)}` : ''
                }`,
                children: 'register'
              }
            ].concat(
              params.username
                ? [
                    {
                      key: 'username',
                      to: location.pathname,
                      children: params.username
                    }
                  ]
                : []
            )}
          />
        </AppLayoutHeader>

        <AppLayoutMiddle widthMode="center" maxContentWidth="980px">
          <Card className="register">
            <div className="register__content">
              {params.username ? (
                <div>
                  {activeRegisterAction ? (
                    <div>
                      <Notice>
                        <span>
                          An email with an activation link has been sent to{' '}
                          <strong>
                            {unprefix(
                              getAgent(activeRegisterAction.agent).email
                            )}
                          </strong>
                        </span>
                      </Notice>
                    </div>
                  ) : isFetching ? (
                    <p>Searching for an active registration…</p>
                  ) : (
                    <ControlPanel error={fetchError}>
                      <PaperButtonLink
                        to={{
                          pathname: '/login',
                          search: `?username=${params.username}`
                        }}
                      >
                        Log in
                      </PaperButtonLink>
                      <PaperButtonLink to="/register">Register</PaperButtonLink>
                    </ControlPanel>
                  )}
                </div>
              ) : config.openRegistration ? (
                <form onClick={this.handlePreventFormSubmit}>
                  <div className="register__row">
                    <PaperInput
                      name={'username'}
                      label={'username'}
                      type="text"
                      autoComplete="off"
                      value={username}
                      disabled={isPosting}
                      onChange={this.handleChange}
                    />
                  </div>
                  <div className="register__row">
                    <PaperInput
                      name="email"
                      label="email"
                      type="email"
                      autoComplete="off"
                      value={email}
                      disabled={isPosting}
                      onChange={this.handleChange}
                    />
                  </div>
                  <div className="register__row">
                    <PaperInput
                      name="password"
                      label="password"
                      type="password"
                      autoComplete="off"
                      value={password}
                      disabled={isPosting}
                      onChange={this.handleChange}
                    />
                  </div>

                  <ControlPanel error={postError}>
                    <PaperButton
                      type="submit"
                      disabled={disabled}
                      onClick={this.handleSubmit}
                    >
                      {isPosting ? 'Registering…' : 'Register'}
                    </PaperButton>
                  </ControlPanel>

                  <p>
                    Already have an account?{' '}
                    <Link
                      to={{
                        pathname: 'login',
                        search: query.next
                          ? `?next=${encodeURIComponent(query.next)}`
                          : undefined
                      }}
                    >
                      login
                    </Link>
                  </p>
                </form>
              ) : (
                <div>
                  <Notice>
                    <span>
                      <b>
                        <TextLogo />
                      </b>{' '}
                      is currently in testing phase.
                    </span>
                  </Notice>

                  <div className="register__row">
                    <p>
                      If you are interested to start or migrate a journal, send
                      an email to{' '}
                      <a href="mailto:contact@sci.pe">contact@sci.pe</a> to get
                      access.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </AppLayoutMiddle>

        <AppLayoutFooter>
          <Footer hideCopyright={true} />
        </AppLayoutFooter>
      </AppLayout>
    );
  }
}
