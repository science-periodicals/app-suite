import React from 'react';
import PropTypes from 'prop-types';
import { getDataDownloadDisplayEncodings } from '../utils/data-download';
import Notice from './notice';
// Note: for tabular data and spreadsheet we use TableObject instead of this component

export default class DataDownload extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string,
    resource: PropTypes.object,
    isPrinting: PropTypes.bool
  };

  static defaultProps = {
    resource: {}
  };

  render() {
    const { resource } = this.props;
    const encodings = getDataDownloadDisplayEncodings(resource);

    if (!encodings.length) {
      return (
        <Notice className="data-download" id={this.props.id}>
          No content or download URL.
        </Notice>
      );
    }

    // TODO display file size, fileFormat (if known)
    return (
      <ul className="data-download" id={this.props.id}>
        {encodings.map(encoding => (
          <li key={encoding['@id']}>
            <a href={encoding.contentUrl}>{encoding.contentUrl}</a>
          </li>
        ))}
      </ul>
    );
  }
}
