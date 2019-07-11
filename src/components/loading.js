import React from 'react';
import { bemify, Spinner } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';

export default function Loading() {
  const bem = bemify('loading');

  return (
    <div className={bem`__body`}>
      <div className={bem`__loader`}>
        <Spinner progressMode="spinUp" size={32} heartbeat={false}>
          <Iconoclass iconName="logoSciAlt" size="24px" />
        </Spinner>
        <span className={bem`__label`}>Loading…</span>
      </div>
    </div>
  );
}
