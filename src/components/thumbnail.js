import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getIconNameFromSchema } from '@scipe/ui';
import { arrayify, getId, getValue } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import { createGraphDataSelector } from '../selectors/graph-selectors';
import createListShallowEqualSelector from '../selectors/create-list-shallow-equal-selector';

class Thumbnail extends Component {
  render() {
    const { resource, thumbnail, popUpThumbnail, fallback } = this.props;
    if (!thumbnail.contentUrl) {
      if (!fallback) return null;
      switch (fallback) {
        case 'icon': {
          const iconName = getIconNameFromSchema(resource, 'fileText');
          return (
            <Iconoclass
              iconName={iconName}
              elementType="div"
              iconSize={32}
              title={resource['@type'] || 'Creative Work'}
            />
          );
        }
        case 'link': {
          return (
            <Iconoclass
              iconName="fileLink"
              elementType="div"
              iconSize={32}
              title="URL"
            />
          );
        }
        default:
          return null;
      }
    }

    const alt = getValue(
      resource.description ||
        resource.name ||
        resource.alternateName ||
        resource.caption ||
        resource.transcript
    );
    return (
      <div className="thumbnail">
        <div className="thumbnail__small-preview">
          <img src={thumbnail.contentUrl} alt={alt} />
        </div>
        {this.props.popUpPreview && (
          <div className="thumbnail__pop-up">
            <div className="thumbnail__big-preview">
              <img src={popUpThumbnail.contentUrl} alt={alt} />
            </div>
          </div>
        )}
      </div>
    );
  }
}

Thumbnail.propTypes = {
  resource: PropTypes.object,
  thumbnail: PropTypes.object,
  fallback: PropTypes.oneOf(['icon', 'link']),
  popUpPreview: PropTypes.bool,
  popUpThumbnail: PropTypes.object
};

Thumbnail.defaultProps = {
  resource: {},
  thumbnail: {},
  popUpPreview: false,
  popUpThumbnail: {}
};

function makeSelector() {
  const graphDataSelector = createGraphDataSelector();
  return createListShallowEqualSelector(
    (state, props) => {
      const { nodeMap } = graphDataSelector(state, props) || {};
      const { resource } = props;

      if (resource && nodeMap) {
        const thumbnails = [];
        if (resource.thumbnail) {
          arrayify(resource.thumbnail).forEach(_thumbnail => {
            const thumbnailId = getId(_thumbnail);
            const thumbnail = nodeMap[thumbnailId];
            if (thumbnail && thumbnail.contentUrl) {
              thumbnails.push(thumbnail);
            }
          });
        }
        if (thumbnails.lenggth) {
          return thumbnails;
        }

        if (resource.encoding) {
          arrayify(resource.encoding).forEach(_encoding => {
            const encodingId = getId(_encoding);
            const encoding = nodeMap[encodingId];
            if (encoding && encoding.thumbnail) {
              arrayify(encoding.thumbnail).forEach(_thumbnail => {
                const thumbnailId = getId(_thumbnail);
                const thumbnail = nodeMap[thumbnailId];
                if (thumbnail && thumbnail.contentUrl) {
                  thumbnails.push(thumbnail);
                }
              });
            }
          });
        }
        // TODO multi part figure, if no encoding graph encoding of first part
        if (thumbnails.length) {
          return thumbnails;
        }
      }
    },
    thumbnails => {
      thumbnails = arrayify(thumbnails).sort((a, b) => a.height - b.height);
      return {
        thumbnail: thumbnails[0],
        popUpThumbnail: thumbnails[1] || thumbnails[0]
      };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(Thumbnail);
