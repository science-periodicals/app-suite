import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { bemify, ControlPanel, Spinner } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

export default class ArticleBodyLoader extends React.Component {
  static propTypes = {
    error: PropTypes.instanceOf(Error)
  };

  render() {
    const { error } = this.props;

    const bem = bemify('article-body-loader');
    return (
      <div className={bem``}>
        {error ? (
          <ControlPanel error={error} />
        ) : (
          <Fragment>
            <Spinner progressMode="spinUp" size={32} heartbeat={false}>
              <Iconoclass iconName="logoSciAlt" size="24px" />
            </Spinner>
            <span className={bem`__label`}>Loading Content...</span>
          </Fragment>
        )}
      </div>
    );
  }
}
