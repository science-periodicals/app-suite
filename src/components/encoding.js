import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import path from 'path';
import moment from 'moment';
import isUrl from 'is-url';
import { getId, arrayify, textify } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import { getFileInputAccept } from '@scipe/librarian';
import {
  Dropzone,
  Spinner,
  AutoAbridge,
  Tooltip,
  getIconNameFromSchema,
  getDisplaySize
} from '@scipe/ui';
import { reviseResource } from '../actions/graph-action-creators';

// TODO upgrade download icon to a ResourceDownloadMenu and move it

class Encoding extends Component {
  static propTypes = {
    id: PropTypes.string,
    graphId: PropTypes.string,
    action: PropTypes.object.isRequired, // the CreateReleaseAction or TypesettingAction @id providing the resource
    forceEnableUpdateMainEntityEncoding: PropTypes.bool, // for `TypesettingAction` we only allow to update the main entity encoding (not the parts) => we set `disabled` to `true` this props allows to overwrite that
    encoding: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
      .isRequired, // can be temporary a string during worker updates etc.
    resource: PropTypes.object, // used to assess if we can delete and for revision dropzone and to provide part of the encoding name in case of encoding from multi part figures (`isFromMultiPartImage` will be `true` in that case)
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,
    ioActions: PropTypes.arrayOf(PropTypes.object),

    isFromMultiPartImage: PropTypes.bool.isRequired,

    // connect (redux)
    reviseResource: PropTypes.func.isRequired
  };

  static defaultProps = {
    action: {},
    ioActions: [],
    resource: {}
  };

  handleRevise = files => {
    const { action, graphId, resource, reviseResource } = this.props;
    reviseResource(files && files[0], action, graphId, getId(resource));
  };

  render() {
    const {
      id,
      encoding,
      action,
      forceEnableUpdateMainEntityEncoding,
      disabled: _disabled,
      readOnly: _readOnly,
      isFromMultiPartImage,
      resource,
      ioActions
    } = this.props;

    const isActive = ioActions.some(
      action =>
        action['@type'] !== 'TypesettingAction' &&
        action.actionStatus !== 'CompletedActionStatus' &&
        action.actionStatus !== 'CanceledActionStatus' &&
        action.actionStatus !== 'FailedActionStatus'
    );

    const isBlinking = isActive;

    // Note: for TypesettingAction we use the top level dropzone for revisions => we overwrite _disabled and _readOnly
    const disabled =
      // special case for TypesettingAction where the top level dropzone is used for revisions
      (action['@type'] === 'TypesettingAction' &&
      forceEnableUpdateMainEntityEncoding
        ? false
        : _disabled) ||
      isActive ||
      isUrl(encoding.contentUrl || '');

    // special case for TypesettingAction where the top level dropzone is used for revisions
    const readOnly =
      action['@type'] === 'TypesettingAction' &&
      forceEnableUpdateMainEntityEncoding
        ? false
        : _readOnly;

    let resolution;
    //TODO resolution concept for audio files (maybe lossless encoding??
    if (encoding['@type'] === 'VideoObject') {
      if (encoding.width && encoding.height) {
        resolution =
          encoding.width >= 1920 && encoding.height >= 1080 ? 'HD' : 'SD';
      }
    } else if (encoding['@type'] === 'ImageObject') {
      if (encoding.exifData) {
        let resolutionData;
        for (let data of encoding.exifData) {
          if (data && data.propertyID === 'resolution') {
            resolutionData = data;
            break;
          }
        }
        if (resolutionData) {
          resolution = `${Math.floor(
            Math.min.apply(Math, resolutionData.value.split('x'))
          )} ${resolutionData.unitText}`;
        }
      }
    }

    let dimension;
    if (encoding.width != null && encoding.height != null) {
      dimension = `${encoding.width}${String.fromCharCode(215)}${
        encoding.height
      }px`;
    }

    let duration;
    if (encoding.duration) {
      const unit = encoding.duration > 60 ? 'minutes' : 'seconds';
      duration =
        moment
          .duration(encoding.duration, unit)
          .as(unit)
          .toFixed(1) + (unit === 'minutes' ? 'mn' : 's');
    }

    const size = getDisplaySize(encoding);

    const hasResData = resolution || dimension || duration;
    let name;
    if (encoding.name && !encoding.name.startsWith('node:')) {
      name = encoding.name;
    } else if (encoding.contentUrl && encoding.contentUrl.startsWith('file:')) {
      name = path.basename(encoding.contentUrl.replace(/^file:/, ''));
    } else if (!encoding.fileFormat && isUrl(encoding.contentUrl)) {
      name = encoding.contentUrl;
    } else if (encoding.fileFormat) {
      name = encoding.fileFormat;
    } else {
      name = getId(encoding);
    }

    if (isFromMultiPartImage && resource.alternateName) {
      name = `(${textify(resource.alternateName)}) ${name}`;
    }

    let accept;
    const typesettingAction = arrayify(ioActions).find(
      action => action['@type'] === 'TypesettingAction'
    );
    if (
      action['@type'] === 'CreateReleaseAction' &&
      typesettingAction &&
      (typesettingAction.actionStatus === 'ActiveActionStatus' ||
        typesettingAction.actionStatus === 'StagedActionStatus')
    ) {
      // for author revision _in the context of a TypesettingAction_ we force PDF uploads
      accept = 'application/pdf';
    } else {
      accept = getFileInputAccept(
        encoding,
        action['@type'] === 'TypesettingAction'
          ? 'ProductionReleaseRequirement'
          : action.releaseRequirement
      );
    }

    return (
      <div className="encoding-container">
        <Dropzone
          accept={accept}
          onFiles={this.handleRevise}
          multiple={false}
          disabled={disabled}
          readOnly={readOnly}
        >
          <div
            className={classNames('encoding', {
              'encoding--active': isActive
            })}
            id={id}
          >
            <div
              className={
                'encoding__icon' + (isActive ? ' encoding__icon--active' : '')
              }
            >
              <Spinner heartbeat={isBlinking} showPercentage={false}>
                <Iconoclass
                  iconName={getIconNameFromSchema(encoding)}
                  iconSize={16}
                />
              </Spinner>
            </div>

            <div className="encoding__name">
              <Tooltip
                displayText={
                  disabled
                    ? encoding.fileFormat ||
                      encoding.name ||
                      encoding['@type'] ||
                      ''
                    : 'Click or drag and drop file to upload'
                }
              >
                <AutoAbridge backgroundColor="none">{name}</AutoAbridge>
              </Tooltip>
            </div>

            {hasResData ? (
              <div className="encoding__resolution">
                <span title={dimension || duration}>
                  {resolution || dimension || duration}
                </span>
              </div>
            ) : null}
            <div className="encoding__content-size">{size}</div>
            <div
              className={`encoding__download ${
                encoding.contentUrl
                  ? 'encoding__download--enabled'
                  : 'encoding__download--disabled'
              }`}
            >
              {encoding.contentUrl &&
              !encoding.contentUrl.startsWith('file:') ? (
                <Tooltip
                  displayText={`${
                    encoding.contentUrl ? 'Download' : 'Download Unavailable'
                  }`}
                >
                  <a
                    className="encoding__download__link"
                    href={encoding.contentUrl}
                    download={encoding.name || getId(encoding)}
                    onClick={e => e.stopPropagation()}
                  >
                    <Iconoclass
                      iconName="download"
                      behavior={encoding.contentUrl ? 'button' : 'passive'}
                      iconSize={16}
                    />
                  </a>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </Dropzone>
      </div>
    );
  }
}

export default connect(
  null,
  {
    reviseResource
  }
)(Encoding);
