import moment from 'moment';
import { inferStartTime } from '@scipe/librarian';

export function getDueDateTime(action = {}, stage = {}) {
  const startTime = inferStartTime(action, stage);

  return startTime
    ? action.expectedDuration
      ? moment(startTime)
          .add(moment.duration(action.expectedDuration))
          .toDate()
      : new Date(startTime)
    : new Date();
}

export function getCompletedDate(action = {}) {
  return moment(action.endTime).format('dddd, MMMM Do YYYY, h:mm a');
}

export function getEndorsedDate(action = {}) {
  return moment(action.endorsedTime).format('dddd, MMMM Do YYYY, h:mm a');
}

export function getStagedDate(action = {}) {
  return moment(action.stagedTime).format('dddd, MMMM Do YYYY, h:mm a');
}
