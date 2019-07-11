import { getId } from '@scipe/jsonld';
import socketIoClient from 'socket.io-client';

import {
  WORKER_DATA,
  ABORT_WORKER_ACTION,
  RETRY_WORKER_ACTION,
  JOIN_ROOM,
  LEAVE_ROOM
} from '../actions/worker-action-creators';

export default function createSocketIoMiddleware() {
  const registeredTypes = new Set([ABORT_WORKER_ACTION, RETRY_WORKER_ACTION]);
  registeredTypes.add(JOIN_ROOM);
  registeredTypes.add(LEAVE_ROOM);

  return function(store) {
    const ws = new Ws(store);

    return function(next) {
      return function(action) {
        const { type } = action;
        if (registeredTypes.has(type)) {
          // special case for join and leave room as it needs to be queued
          switch (type) {
            case JOIN_ROOM:
              ws.join(action.payload);
              break;
            case LEAVE_ROOM:
              ws.leave(action.payload);
              break;
            default:
              ws.emit(action.payload);
              break;
          }
        }

        return next(action);
      };
    };
  };
}

class Ws {
  constructor(store) {
    this.store = store;
    this.eventName = WORKER_DATA;

    this.isLoggedIn = !!getId(store.getState().user);
    if (!this.isLoggedIn) return;

    this.ws = socketIoClient(window.location.origin);
    this.queuedJoin = undefined;
    this.queuedLeave = [];

    this.ws.on('connect', this.emitQueued.bind(this));

    this.ws.on('reconnect', this.emitQueued.bind(this)); // Fired upon a successful reconnection.
    this.ws.on(this.eventName, data => {
      // turn schema.org Action / Event into Redux actions
      store.dispatch({
        type: this.eventName,
        payload: JSON.parse(data) // typically a webify action or a progress event
      });
    });

    this.ws.on('error', err => {
      console.error(err);
    });
  }

  emitQueued() {
    if (!this.isLoggedIn) return;
    if (this.queuedJoin) {
      this.ws.emit('join', this.queuedJoin);
    }

    while (this.queuedLeave.length > 0) {
      this.ws.emit('leave', this.queuedLeave.shift());
    }
  }

  join(room) {
    if (!this.isLoggedIn) return;
    if (this.ws.connected) {
      this.ws.emit('join', room);
    }
    this.queuedLeave = this.queuedLeave.filter(r => r !== room);
    // we keep track of the joined room so that we can rejoin after disconnection
    this.queuedJoin = room;
  }

  leave(room) {
    if (!this.isLoggedIn) return;
    if (this.ws.connected) {
      this.ws.emit('leave', room);
    } else {
      this.queuedLeave.push(room);
    }
    if (room === this.queuedJoin) {
      this.queuedJoin = undefined;
    }
  }

  // TODO queue too
  emit(action) {
    if (!this.isLoggedIn) return;
    this.ws.emit(this.eventName, action);
  }
}
