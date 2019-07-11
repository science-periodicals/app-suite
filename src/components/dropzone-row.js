import React, { Component } from 'react';
import Iconoclass from '@scipe/iconoclass';

const icons = [
  {
    name: 'fileAdd',
    description: 'add files (manuscript, datasets, code, image, audio, video)'
  },
  { name: 'fileText', description: 'add manuscript (DOCX, HTML)' },
  { name: 'fileData', description: 'add dataset' },
  { name: 'fileCode', description: 'add code' },
  { name: 'fileImage', description: 'add images' },
  { name: 'fileAudio', description: 'add audio' },
  { name: 'fileMedia', description: 'add video' }
];

export default class DropzoneRow extends Component {
  constructor(props) {
    super(props);
    this.state = icons.reduce((state, entry) => {
      state[entry.name] = false;
      return state;
    });
  }

  handleDragEnter(iconName, e) {
    this.setState({ [iconName]: true });
  }

  handleDragLeave(iconName, e) {
    this.setState({ [iconName]: false });
  }

  handleDrop(iconName, e) {
    this.setState({ [iconName]: false });
  }

  handleClick(e) {
    e.preventDefault();
  }

  render() {
    // TODO make it colorful so that it matches iconoclass colors
    return (
      <div className="dropzone-row">
        <ul className="dropzone-row-icons">
          {icons.map(icon =>
            <li key={icon.name}>
              <Iconoclass
                elementType={'button'}
                behavior={'button'}
                round={false}
                iconName={icon.name}
                iconSize={16}
                size="100%"
                color="black"
                title={icon.description}
                className={this.state[icon.name] ? ' active' : ''}
                onDragEnter={this.handleDragEnter.bind(this, icon.name)}
                onDragLeave={this.handleDragLeave.bind(this, icon.name)}
                onDrop={this.handleDrop.bind(this, icon.name)}
                onClick={this.handleClick.bind(this)}
              />
            </li>
          )}
        </ul>
      </div>
    );
  }
}
