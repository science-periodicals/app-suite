import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getId } from '@scipe/jsonld';
import {
  getCanonicalImageObject,
  getResponsiveImageData
} from '../utils/image-object';
import { NoRenderingNotice } from './notice';
import { fetchEncoding } from '../actions/encoding-action-creators';
import classNames from 'classnames';

class ImageObject extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string,
    graphId: PropTypes.string,
    resource: PropTypes.object.isRequired,
    isPrinting: PropTypes.bool,
    width: PropTypes.string,
    height: PropTypes.string,
    // redux
    fetchEncoding: PropTypes.func.isRequired
  };

  static defaultProps = {
    resource: {},
    isPrinting: false
  };

  componentDidMount() {
    const { graphId, resource, fetchEncoding } = this.props;

    const encoding = getCanonicalImageObject(resource);
    fetchEncoding(graphId, encoding, {
      fetchedByHtmlElement: true,
      loaded: false
    });
  }

  componentDidUpdate(prevProps) {
    const { graphId, resource, fetchEncoding } = this.props;

    const encoding = getCanonicalImageObject(resource);

    const prevEncoding = getCanonicalImageObject(prevProps.resource);

    if (getId(encoding) !== getId(prevEncoding)) {
      fetchEncoding(graphId, encoding, {
        fetchedByHtmlElement: true,
        loaded: false
      });
    }
  }

  handleLoad(encoding) {
    const { graphId, fetchEncoding } = this.props;

    fetchEncoding(graphId, encoding, {
      fetchedByHtmlElement: true,
      loaded: true
    });
  }

  render() {
    const { resource, id, width, height, isPrinting } = this.props;
    const encoding = getCanonicalImageObject(resource);

    if (!encoding || !encoding.contentUrl) {
      return <NoRenderingNotice id={id} className="image-object" />;
    }

    const { srcSet, sizes } = getResponsiveImageData(encoding);

    if (isPrinting) {
      // NOTE: The browser's print mode doesn't necessarily seem to correctly
      // choose the best resolution from sizes and/or srcSet props for
      // printing => we do not use srcSet or sizes in print

      return (
        <div
          className={classNames('image-object', 'image-object--print')}
          style={{
            display: 'flex',
            justifyContent: 'center',
            minWidth:
              '0' /* FF requires this to allow it to scale down children properly*/,
            minHeight: '0'
          }}
        >
          <img
            id={id}
            className="image-object__img"
            src={encoding.contentUrl}
            onLoad={this.handleLoad.bind(this, encoding)}
            style={{
              objectFit: 'contain',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </div>
      );
    } else {
      // even though we get optimum size/res for the image we still don't want to exceed the
      // container size.
      const style = { maxWidth: '100%' };
      if (width) {
        style.width = width;
      }
      // if (height) style.height = height; /* if the width exceeds container box we want to auto adjust the height */

      return (
        <div className="image-object" style={style}>
          <img
            id={id}
            className="image-object__img"
            src={encoding.contentUrl}
            srcSet={srcSet}
            sizes={sizes}
            onLoad={this.handleLoad.bind(this, encoding)}
            style={{ objectFit: 'contain', maxWidth: '100%' }}
          />
        </div>
      );
    }
  }
}

export default connect(
  null,
  {
    fetchEncoding
  }
)(ImageObject);
