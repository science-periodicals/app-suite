import React from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import { getResponsiveImageData } from '../utils/image-object';
import {
  getVideoObjectDisplayEncodings,
  getPosterEncoding
} from '../utils/video-object';
import { NoRenderingNotice } from './notice';

// TODO integrate with `fetchEncodingStatus`:
// see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
// and use `canplay` or `canplaythrough` events

export default class VideoObject extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string,
    resource: PropTypes.object.isRequired,
    isPrinting: PropTypes.bool
  };

  static defaultProps = {
    resource: {}
  };

  render() {
    const { id, resource, isPrinting } = this.props;

    const encodings = getVideoObjectDisplayEncodings(resource);
    const posterEncoding = getPosterEncoding(resource);

    return isPrinting ? (
      <div id={id} className="video-object video-object--print">
        {posterEncoding ? (
          <img
            src={posterEncoding.contentUrl}
            {...getResponsiveImageData(posterEncoding)}
          />
        ) : (
          <NoRenderingNotice />
        )}
      </div>
    ) : (
      <div className="video-object">
        {encodings.length ? (
          <video
            id={id}
            poster={posterEncoding ? posterEncoding.contentUrl : undefined}
            className="video-object__video"
            controls
          >
            {encodings.map(e => (
              <source
                key={getId(e) || e.contentUrl}
                src={e.contentUrl}
                type={(e.fileFormat || '').split(';')[0].trim()}
              />
            ))}
          </video>
        ) : (
          <NoRenderingNotice />
        )}
      </div>
    );
  }
}
