import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { ShareMenu } from '@scipe/ui';
import Counter from '../utils/counter';
import { prettifyLocation } from '../utils/annotations';

export default class Permalink extends PureComponent {
  static propTypes = {
    first: PropTypes.bool,
    counter: PropTypes.instanceOf(Counter), // for now only used in publisher
    href: PropTypes.string, // required if counter is not provided (for now this is used for reader)
    social: PropTypes.bool,
    icon: PropTypes.any,
    title: PropTypes.string, // title of the menu

    // social props
    name: PropTypes.string, // social text to share (for <ShareMenu>), typically the title of the article
    description: PropTypes.string,
    text: PropTypes.string,

    children: PropTypes.any, // typically additional MenuItem

    // display props
    isHighlighted: PropTypes.bool,
    hasError: PropTypes.bool,
    hasWarning: PropTypes.bool,
    hasComment: PropTypes.bool,
    hasReviewerComment: PropTypes.bool,
    hasEndorserComment: PropTypes.bool,
    hasRevisionRequestComment: PropTypes.bool,

    onClick: PropTypes.func,
    onHoverChange: PropTypes.func
  };

  static defaultProps = {
    social: false,
    icon: 'none',
    onHoverChange: noop,
    onClick: noop
  };

  handleMouseOver = e => {
    this.props.onHoverChange(true);
  };

  handleMouseOut = e => {
    this.props.onHoverChange(false);
  };

  handleClick = e => {
    this.props.onClick(e);
  };

  render() {
    const {
      first,
      icon,
      title,
      social,
      text,
      name,
      description,
      href,
      counter,
      children,
      isHighlighted,
      hasError,
      hasWarning,
      hasComment,
      hasReviewerComment,
      hasEndorserComment,
      hasRevisionRequestComment
    } = this.props;

    const url = href || (counter && counter.getUrl().href);

    let id, prefix, suffix;
    if (counter) {
      counter.counts.slice(2).join('.');

      const hash = counter.getUrl().hash;
      id = hash.substring(1);
      [prefix, suffix] = id.split(':');
    }

    // TODO handle endorser comments

    return (
      <div
        onClick={this.handleClick}
        className={classNames('permalink', {
          'permalink--first': first,
          'permalink--highlighted': isHighlighted,
          'permalink--with-error': hasError,
          'permalink--with-warning': hasWarning,
          'permalink--with-comment': hasComment,
          'permalink--with-endorser-comment': hasEndorserComment,
          'permalink--with-reviewer-comment': hasReviewerComment,
          'permalink--with-revision-request-comment': hasRevisionRequestComment
        })}
      >
        {counter ? (
          <div
            onMouseOverCapture={this.handleMouseOver}
            onMouseOutCapture={this.handleMouseOut}
            className="permalink__counter"
            id={
              id /* NOTE ^^ !! the class "permalink__counter" is used in javascript in publisher to grab the `id` query string parameter */
            }
          >
            <span className="permalink__counter__prefix">{prefix}</span>
            <span className="permalink__counter__annotation">
              ⋮{prettifyLocation(suffix)}
            </span>
            <ShareMenu
              className="permalink__menu"
              portal={true}
              portalProps={{ parentID: 'resource-view__portal-context' }}
              icon={icon}
              align="right"
              social={social}
              title={title}
              url={url}
              text={text}
              name={name}
              description={description}
            >
              {children}
            </ShareMenu>
          </div>
        ) : (
          <ShareMenu
            className="permalink__menu"
            portal={true}
            icon={icon}
            align="right"
            social={social}
            title={title}
            url={url}
            text={text}
            name={name}
            description={description}
          >
            {children}
          </ShareMenu>
        )}
      </div>
    );
  }
}
