import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { arrayify, getId, unprefix } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import {
  Value,
  Span,
  RdfaCaptionMetadata,
  Logo,
  Label,
  Divider,
  getIconNameFromSchema,
  API_LABELS,
  Div
} from '@scipe/ui';

const DEFAULT_CAPTION_FONT_SIZE = 10; // TODO @halmost pick up right value
const DEFAULT_BRANDING_FONT_SIZE = 10; // TODO @halmost pick up right value

// TODO compact theme for RdfaCaptionMetadata -> no padding + list is inline

export default class PrintableResourceCaption extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    journal: PropTypes.object,
    issue: PropTypes.object,
    mainEntity: PropTypes.object,
    graphId: PropTypes.string.isRequired,
    graph: PropTypes.object,
    resource: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,
    onMeasured: PropTypes.func,
    maxHeight: PropTypes.number.isRequired,
    preventPrintRescaling: PropTypes.bool,
    isPrinting: PropTypes.bool // we inject that prop although the component is always rendered in print mode so that the component is re-rendered when the `beforeprint` event is fired.
  };

  static defaultProps = {
    onMeasured: noop,
    journal: {},
    mainEntity: {}
  };

  constructor(props) {
    super(props);

    this.state = {
      captionFontSize: DEFAULT_CAPTION_FONT_SIZE,
      brandingFontSize: DEFAULT_BRANDING_FONT_SIZE
    };

    this.root = React.createRef();
    this.caption = React.createRef();
    this.branding = React.createRef();

    this.height = 0;
    this.width = 0;
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize, true);
    this.measure();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, true);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.resource !== this.props.resource ||
      prevProps.isPrinting !== this.props.isPrinting ||
      prevProps.maxHeight !== this.props.maxHeight ||
      prevProps.journal !== this.props.journal
    ) {
      this.measure();
    }
  }

  handleResize = () => {
    this.measure();
  };

  measure() {
    const { onMeasured, maxHeight, preventPrintRescaling } = this.props;
    if (preventPrintRescaling) {
      return;
    }

    const { captionFontSize, brandingFontSize } = this.state;
    const $el = this.root.current;

    // account for padding
    const paddedMaxHeight = maxHeight - 32;

    if ($el) {
      // we rescale the fontsize of the caption and the branding area independantly
      const $caption = this.caption.current;

      if ($caption) {
        const prevFontSizeStyle = $caption.style.fontSize;

        // adapt font
        let nextFontSize = DEFAULT_CAPTION_FONT_SIZE; // we always start from the default so that if the window is expanded the text is increased
        $caption.style.fontSize = `${nextFontSize}px`;
        let rect = $caption.getBoundingClientRect();

        while (rect.height > paddedMaxHeight && nextFontSize > 1) {
          nextFontSize = Math.round(Math.max(nextFontSize - 0.1, 1) * 10) / 10;
          $caption.style.fontSize = `${nextFontSize}px`;
          rect = $caption.getBoundingClientRect();
        }
        $caption.style.fontSize = prevFontSizeStyle; // restore

        if (nextFontSize !== captionFontSize) {
          this.setState({ captionFontSize: nextFontSize });
        }
      }

      const $branding = this.branding.current;
      if ($branding) {
        const prevFontSizeStyle = $branding.style.fontSize;

        // adapt font
        let nextFontSize = DEFAULT_BRANDING_FONT_SIZE; // we always start from the default so that if the window is expanded the text is increased
        $branding.style.fontSize = `${nextFontSize}px`;
        let rect = $branding.getBoundingClientRect();

        while (rect.height > maxHeight && nextFontSize > 1) {
          nextFontSize = Math.round(Math.max(nextFontSize - 0.1, 1) * 10) / 10;
          $branding.style.fontSize = `${nextFontSize}px`;
          rect = $branding.getBoundingClientRect();
        }
        $branding.style.fontSize = prevFontSizeStyle; // restore

        if (nextFontSize !== brandingFontSize) {
          this.setState({ brandingFontSize: nextFontSize });
        }
      }

      const rect = $el.getBoundingClientRect();
      if (this.height !== rect.height || this.width !== rect.width) {
        this.height = rect.height;
        this.width = rect.width;
        onMeasured({ width: this.width, height: this.height });
      }
    }
  }

  handleLogoLoad = () => {
    this.measure();
  };

  render() {
    const {
      resource,
      graphId,
      blindingData,
      journal,
      issue,
      mainEntity
    } = this.props;

    const { captionFontSize, brandingFontSize } = this.state;

    const { logo } = journal;
    const title = mainEntity.name;

    let parts;

    // Only keep parts with a caption
    if (resource['@type'] === 'Image' && arrayify(resource.hasPart).length) {
      parts = arrayify(resource.hasPart).filter(
        part => part.alternateName || part.caption
      );
    }

    return (
      <div ref={this.root} className="printable-resource-caption">
        {/* The left part */}
        <div
          className="printable-resource-caption__body"
          style={{ fontSize: `${captionFontSize}px` }}
          ref={this.caption}
        >
          {/* Main Caption */}
          {!!resource.name && (
            <div className="printable-resource-caption__title">
              <Value>{resource.name}</Value>
            </div>
          )}
          {!!resource.caption && (
            <div className="printable-resource-caption__content">
              <Value>{resource.caption}</Value>
            </div>
          )}

          {/* If resource is a multi part figure, we also display captions for each parts */}
          {!!parts && (
            <ul className="printable-resource-caption__parts">
              {parts.map(part => (
                <li
                  key={getId(part)}
                  className="printable-resource-caption__body__metadata"
                >
                  {!!part.alternateName && <Label>{part.alternateName}</Label>}
                  {!!part.name && (
                    <div className="printable-resource-caption__title">
                      <Value>{part.name}</Value>
                    </div>
                  )}
                  {!!part.caption && (
                    <div className="printable-resource-caption__content">
                      <Value>{part.caption}</Value>
                    </div>
                  )}

                  <div className="printable-resource-caption__metadata">
                    <RdfaCaptionMetadata
                      object={part}
                      mainEntity={mainEntity}
                      graphId={graphId}
                      isBlinded={!blindingData.visibleRoleNames.has('author')}
                      displayParts={false}
                      blindingData={blindingData}
                      theme="print-inline"
                      isPrinting={true}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* TODO footnotes */}
        </div>

        {/* The right part (journal logo and article title) */}
        <div
          className="printable-resource-caption__sidebar"
          style={{ fontSize: `${brandingFontSize}px` }}
          ref={this.branding}
        >
          {logo ? (
            <Logo
              className="printable-resource-caption__sidebar__logo"
              logo={journal.logo}
              onLoad={this.handleLogoLoad}
            />
          ) : (
            <Div className="printable-resource-caption__sidebar__text-logo">
              {journal.alternateName || journal.name || getId(journal)}
            </Div>
          )}

          {!!issue && (
            <div className="printable-resource-caption__sidebar__issue-info">
              <div className="printable-resource-caption__sidebar__issue-title">
                {issue['@type'] === 'PublicationIssue' ? (
                  <Fragment>
                    <span>
                      Issue
                      {` `}
                      {issue.issueNumber}
                    </span>
                    {(issue.alternateName || issue.name) && (
                      <Fragment>
                        {` - `}
                        <Span>{issue.alternateName || issue.name}</Span>
                      </Fragment>
                    )}
                  </Fragment>
                ) : (
                  <Span>
                    {issue.alternateName ||
                      issue.name ||
                      (unprefix(getId(issue)) || '').split('/', 2)[1]}
                  </Span>
                )}
              </div>
            </div>
          )}

          <div className="printable-resource-caption__sidebar__article-info">
            {!!title && (
              <Value className="printable-resource-caption__sidebar__article-title">
                {title}
              </Value>
            )}
          </div>
          <Divider size="2px" marginBottom="1.6em" />
          <div className="printable-resource-caption__sidebar__figure-info">
            <div className="printable-resource-caption__sidebar__figure-title">
              <Iconoclass
                iconName={getIconNameFromSchema(resource)}
                size="1.2em"
              />
              <Label>
                {`${resource.alternateName ||
                  `Unnamed ${API_LABELS[resource['@type']] || 'resource'}`}`}
              </Label>
            </div>
          </div>
          <div className="printable-resource-caption__sidebar__metadata">
            <RdfaCaptionMetadata
              object={resource}
              mainEntity={mainEntity}
              graphId={graphId}
              isBlinded={!blindingData.visibleRoleNames.has('author')}
              displayParts={false}
              blindingData={blindingData}
              theme="print-list"
              isPrinting={true}
            />
          </div>
        </div>
      </div>
    );
  }
}
