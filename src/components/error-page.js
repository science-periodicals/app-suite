import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { getId } from '@scipe/jsonld';
import {
  resetSubdomain,
  MenuItem,
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutMiddle,
  AppLayoutFooter,
  Header,
  ErrorCard,
  UserBadgeMenu,
  StartMenu
} from '@scipe/ui';

export default class ErrorPage extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    error: PropTypes.shape({
      description: PropTypes.string,
      statusCode: PropTypes.number
    })
  };

  render() {
    const { user, error } = this.props;

    return (
      <AppLayout leftExpanded={false} rightExpanded={false}>
        <AppLayoutHeader>
          <Header
            showHamburger={false}
            crumbs={[
              {
                key: 'error',
                children: 'error'
              }
            ]}
            userBadgeMenu={
              user ? (
                <UserBadgeMenu userId={getId(user)}>
                  <MenuItem href={resetSubdomain('/logout')}>Logout</MenuItem>
                </UserBadgeMenu>
              ) : (
                undefined
              )
            }
            showHome={true}
            homeLink={{
              href: '/'
            }}
            logoLink={{
              href: '/'
            }}
            startMenu={<StartMenu />}
          />
        </AppLayoutHeader>

        <AppLayoutMiddle widthMode="auto">
          <Helmet>
            <title>sci.pe • error</title>
          </Helmet>
          <ErrorCard error={error} />
        </AppLayoutMiddle>

        <AppLayoutFooter>
          <Footer padding="small" sticky={true} hideCopyright={true} />
        </AppLayoutFooter>
      </AppLayout>
    );
  }
}
