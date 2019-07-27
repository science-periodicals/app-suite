import React from 'react';
import PropTypes from 'prop-types';
import { bemify, Spinner } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

export default function Loading({
  label = 'Loading…',
  progressMode = 'spinUp'
}) {
  const bem = bemify('loading');

  return (
    <div className={bem`__body`}>
      <div className={bem`__loader`}>
        <Spinner progressMode={progressMode} size={32} heartbeat={false}>
          <Iconoclass iconName="logoSciAlt" size="24px" />
        </Spinner>
        <span className={bem`__label`}>{label}</span>
      </div>
    </div>
  );
}

Loading.propTypes = {
  label: PropTypes.string,
  progressMode: PropTypes.string
};
