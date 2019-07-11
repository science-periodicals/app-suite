import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';

const DEFAULT_FONT_SIZE = 12; // TODO @halmost pick up right value

class SoftwareSourceCodeObject extends Component {
  static propTypes = {
    id: PropTypes.string,
    resource: PropTypes.object,
    content: PropTypes.object,

    // print props
    preventPrintRescaling: PropTypes.bool,
    isPrinting: PropTypes.bool,
    availableWidth: PropTypes.number,
    availableHeight: PropTypes.number
  };

  static defaultProps = {
    resource: {},
    content: {}
  };

  constructor(props) {
    super(props);

    this.state = {
      fontSize: DEFAULT_FONT_SIZE
    };

    this.code = React.createRef();
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize, true);
    this.setFontSize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, true);
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.isPrinting &&
      (prevProps.resource !== this.props.resource ||
        prevProps.content !== this.props.content ||
        prevProps.isPrinting !== this.props.isPrinting ||
        prevProps.availableWidth !== this.props.availableWidth ||
        prevProps.availableHeight !== this.props.availableHeight)
    ) {
      this.setFontSize();
    }
  }

  handleResize = () => {
    this.setFontSize();
  };

  setFontSize = () => {
    const { availableHeight, isPrinting, preventPrintRescaling } = this.props;
    if (!isPrinting || preventPrintRescaling) return;

    const { fontSize } = this.state;
    const $el = this.code.current;

    if ($el) {
      // we rescale the fontsize of the caption and the branding area independantly

      const prevFontSizeStyle = $el.style.fontSize;

      // adapt font
      let nextFontSize = DEFAULT_FONT_SIZE; // we always start from the default so that if the window is expanded the text is increased
      $el.style.fontSize = `${nextFontSize}px`;
      let rect = $el.getBoundingClientRect();

      while (rect.height > availableHeight && nextFontSize > 1) {
        nextFontSize = Math.round(Math.max(nextFontSize - 0.1, 1) * 10) / 10;
        $el.style.fontSize = `${nextFontSize}px`;
        rect = $el.getBoundingClientRect();
      }
      $el.style.fontSize = prevFontSizeStyle; // restore

      if (nextFontSize !== fontSize) {
        this.setState({ fontSize: nextFontSize });
      }
    }
  };

  render() {
    const {
      isPrinting,
      content: { programmingLanguage, value }
    } = this.props;
    const { fontSize } = this.state;
    const style = {};
    if (isPrinting) {
      style.fontSize = fontSize;
    }

    let parsedCode = wrapCodelines(value);

    return (
      <pre
        className={classNames('software-source-code-object', {
          'software-source-code-object--print': isPrinting
        })}
        id={this.props.id}
      >
        <code
          style={style}
          className={'hljs ' + programmingLanguage}
          dangerouslySetInnerHTML={{ __html: parsedCode }}
          ref={this.code}
        />
      </pre>
    );
  }
}

function wrapCodelines(value) {
  if (value && typeof value == 'string') {
    const lines = value.split(/\r?\n/);
    const wrappedLines = lines.map(line => {
      return `<li class="software-source-code-object__line"><span class="software-source-code-object__line__code">${line}</span></li>`;
    });
    const unwrappedLines = `<ol class="software-source-code-object__lines">\n${wrappedLines.join(
      `\n`
    )}</ol>`;
    //debugger;

    return unwrappedLines;
  }
  return value;
}

export default connect(
  createSelector(
    (state, props) => {
      if (props.resource && props.resource.encoding) {
        for (let encoding of props.resource.encoding) {
          const encodingId = getId(encoding);
          if (
            encodingId in state.contentMap &&
            state.contentMap[encodingId].value
          ) {
            return state.contentMap[encodingId];
          }
        }
      }
    },
    content => {
      return { content };
    }
  )
)(SoftwareSourceCodeObject);
