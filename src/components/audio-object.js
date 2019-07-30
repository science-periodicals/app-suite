import React from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import { NoRenderingNotice } from './notice';
import { getAudioObjectDisplayEncodings } from '../utils/audio-object';

// TODO integrate with `fetchEncodingStatus`:
// see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
// and use `canplay` or `canplaythrough` events

export default class AudioObject extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string,
    resource: PropTypes.object.isRequired,
    isPrinting: PropTypes.bool
  };

  static defaultProps = {
    resource: {}
  };

  render() {
    const { id, resource } = this.props;

    const encodings = getAudioObjectDisplayEncodings(resource);

    if (!encodings.length) {
      return <NoRenderingNotice id={id} className="audio-object" />;
    }

    return (
      <audio id={id} className="audio-object" controls>
        {encodings.map(e => {
          return (
            <source
              key={getId(e) || e.contentUrl}
              src={e.contentUrl}
              type={(e.fileFormat || '').split(';')[0].trim()}
            />
          );
        })}
      </audio>
    );
  }
}
