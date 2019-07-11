export const JOIN_ROOM = 'JOIN_ROOM';
export const LEAVE_ROOM = 'LEAVE_ROOM';
export const ABORT_WORKER_ACTION = 'ABORT_WORKER_ACTION';
export const RETRY_WORKER_ACTION = 'RETRY_WORKER_ACTION';

export const WORKER_DATA = 'WORKER_DATA'; // this type is emitted by the worker themselves in the websocket

export function joinRoom(room) {
  return {
    type: JOIN_ROOM,
    payload: room
  };
}

export function leaveRoom(room) {
  return {
    type: LEAVE_ROOM,
    payload: room
  };
}
