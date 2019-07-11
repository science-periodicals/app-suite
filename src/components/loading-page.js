import React from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import {
  bemify,
  Spinner,
  resetSubdomain,
  MenuItem,
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutMiddle,
  AppLayoutFooter,
  Header,
  UserBadgeMenu,
  StartMenu
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

export default class LoadingPage extends React.Component {
  static propTypes = {
    user: PropTypes.object
  };

  render() {
    const { user } = this.props;

    const bem = bemify('loading-page');

    return (
      <AppLayout leftExpanded={false} rightExpanded={false}>
        <AppLayoutHeader>
          <Header
            showHamburger={false}
            userBadgeMenu={
              user ? (
                <UserBadgeMenu userId={getId(user)}>
                  <MenuItem href={resetSubdomain('/logout')}>Logout</MenuItem>
                </UserBadgeMenu>
              ) : (
                undefined
              )
            }
            showHome={false}
            logoLink={{
              href: '/'
            }}
            startMenu={<StartMenu />}
          />
        </AppLayoutHeader>

        <AppLayoutMiddle widthMode="center" maxContentWidth="980px">
          {/* TODO use <Loading /> component */}
          <div className={bem`__body`}>
            <div className={bem`__loader`}>
              <Spinner progressMode="spinUp" size={32} heartbeat={false}>
                <Iconoclass iconName="logoSciAlt" size="24px" />
              </Spinner>
              <span className={bem`__label`}>Loading…</span>
            </div>
          </div>
        </AppLayoutMiddle>

        <AppLayoutFooter>
          <Footer hideCopyright={true} />
        </AppLayoutFooter>
      </AppLayout>
    );
  }
}
