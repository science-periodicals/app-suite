import pluralize from 'pluralize';
import { getId, getNodeMap, arrayify } from '@scipe/jsonld';
import { createId, getObject, getResult } from '@scipe/librarian';

export function getEventTree(
  eventMap = {} // All the events associated with a given Action (see reducers/log-reducers.js)
) {
  const roots = [];

  // we mutate events => we clone them first
  const events = Object.values(eventMap).map(event => Object.assign({}, event));
  // update eventMap with cloned events
  eventMap = getNodeMap(events);

  events.forEach(event => {
    const parentId = getId(event.superEvent);
    if (parentId) {
      const parent = eventMap[parentId];
      if (parent) {
        if (event.progress) {
          parent.progress = event.progress;
        } else {
          if (!parent.subEvent) {
            parent.subEvent = [];
          }
          parent.subEvent.push(event);
        }
      }
    } else {
      roots.push(event);
    }
  });

  Object.values(eventMap).forEach(event => {
    if (event.subEvent) {
      event.subEvent.sort((a, b) => {
        return (
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
      });
    }
  });

  roots.sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  return roots.length ? roots : undefined;
}

/**
 * This must be called if `getEventTree` returned `undefined`
 */
export function getDefaultEvents(action = {}) {
  const events = [];

  switch (action['@type']) {
    case 'UploadAction': {
      const result = getResult(action);
      const object = getObject(action);
      const encodingName =
        (result && result.name) || (object && object.name) || 'file';

      events.push(
        Object.assign(
          {
            '@id': createId('blank')['@id'],
            '@type': 'ProgressEvent',
            about: getId(action),
            startDate: action.startTime,
            description: `uploading ${encodingName}`
          },
          action.actionStatus === 'CompletedActionStatus' ||
            action.actionStatus === 'CanceledActionStatus'
            ? { endDate: action.endTime }
            : undefined
        )
      );
      break;
    }

    case 'DocumentProcessingAction':
    case 'AudioVideoProcessingAction':
    case 'ImageProcessingAction':
    case 'TypesettingAction': {
      const encoding = getObject(action);
      events.push(
        Object.assign(
          {
            '@id': createId('blank')['@id'],
            '@type': 'ProgressEvent',
            about: getId(action),
            startDate: action.startTime,
            description: `processing ${encoding ? encoding.name : 'file'}`
          },
          action.actionStatus === 'CompletedActionStatus' ||
            action.actionStatus === 'CanceledActionStatus'
            ? { endDate: action.endTime }
            : undefined
        )
      );
      break;
    }

    case 'UpdateAction':
      {
        const nNodes =
          action.object && action.object['@graph']
            ? arrayify(action.object['@graph']).length
            : 1;

        events.push(
          Object.assign(
            {
              '@id': createId('blank')['@id'],
              '@type': 'ProgressEvent',
              about: getId(action),
              startDate: new Date().toISOString(),
              description: `updating ${nNodes} ${pluralize('node', nNodes)}`
            },
            action.actionStatus === 'CompletedActionStatus' ||
              action.actionStatus === 'CanceledActionStatus'
              ? { endDate: action.endTime }
              : undefined
          )
        );
      }
      break;

    default:
      break;
  }

  return events.length ? events : undefined;
}
