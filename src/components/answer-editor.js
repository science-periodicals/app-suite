import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getId, arrayify, getValue } from '@scipe/jsonld';
import { RichTextarea, PaperSelect } from '@scipe/ui';

export default class AnswerEditor extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    question: PropTypes.object.isRequired,
    answer: PropTypes.object.isRequired,
    onAction: PropTypes.func.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    className: PropTypes.string,
    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    ),
    suggestionMapper: PropTypes.func
  };

  handleSubmit = e => {
    e.preventDefault();
    const { question, answer, onAction } = this.props;

    const replyAction = {
      '@type': 'ReplyAction',
      startTime: new Date().toISOString(),
      actionStatus: 'CompletedActionStatus',
      object: getId(question),
      resultComment: Object.assign({ '@type': 'Answer' }, answer, {
        text:
          !e.target.value || e.target.value === 'tmp:null'
            ? ''
            : e.target.value,
        parentItem: getId(question)
      })
    };

    onAction(replyAction);
  };

  render() {
    const {
      id,
      question,
      answer,
      readOnly,
      disabled,
      className,
      locationOptions,
      suggestionMapper
    } = this.props;

    if (question.suggestedAnswer) {
      const suggestedAnswers = arrayify(question.suggestedAnswer).filter(
        suggestedAnswer => suggestedAnswer.text
      );

      return (
        <PaperSelect
          id={id}
          label="answer"
          name="answer"
          readOnly={readOnly}
          disabled={disabled}
          value={getValue(answer.text) || 'tmp:null'}
          onChange={this.handleSubmit}
          portal={true}
          className={className}
        >
          <option value="tmp:null">No Response</option>
          {suggestedAnswers.map(suggestedAnswer => (
            <option
              key={suggestedAnswer['@id'] || suggestedAnswer.text}
              value={suggestedAnswer.text}
            >
              {suggestedAnswer.text}
            </option>
          ))}
        </PaperSelect>
      );
    } else {
      return (
        <RichTextarea
          id={id}
          defaultValue={answer.text}
          name="answer"
          label="answer"
          readOnly={readOnly}
          disabled={disabled}
          onSubmit={this.handleSubmit}
          className={className}
          options={locationOptions}
          suggestionMapper={suggestionMapper}
        />
      );
    }
  }
}
