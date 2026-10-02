const { CallStatus, CallDirection } = require('@prisma/client');

const validTransitions = {
  [CallStatus.INITIATING]: [CallStatus.RINGING, CallStatus.FAILED],
  [CallStatus.RINGING]: [
    CallStatus.CONNECTED,
    CallStatus.MISSED,
    CallStatus.DECLINED,
    CallStatus.NO_ANSWER,
    CallStatus.BUSY,
    CallStatus.FAILED
  ],
  [CallStatus.CONNECTED]: [CallStatus.ON_HOLD, CallStatus.COMPLETED, CallStatus.DROPPED],
  [CallStatus.ON_HOLD]: [CallStatus.CONNECTED, CallStatus.DROPPED],
  [CallStatus.COMPLETED]: [],
  [CallStatus.MISSED]: [],
  [CallStatus.DECLINED]: [],
  [CallStatus.FAILED]: [],
  [CallStatus.DROPPED]: [],
  [CallStatus.NO_ANSWER]: [],
  [CallStatus.BUSY]: []
};

const terminalStates = [
  CallStatus.COMPLETED,
  CallStatus.MISSED,
  CallStatus.DECLINED,
  CallStatus.FAILED,
  CallStatus.DROPPED,
  CallStatus.NO_ANSWER,
  CallStatus.BUSY
];

const directionConstraints = {
  [CallStatus.MISSED]: [CallDirection.INBOUND],
  [CallStatus.DECLINED]: [CallDirection.INBOUND],
  [CallStatus.NO_ANSWER]: [CallDirection.OUTBOUND],
  [CallStatus.BUSY]: [CallDirection.OUTBOUND],
};

const isValidTransition = (currentState, nextState, direction) => {
  const allowedNextStates = validTransitions[currentState] || [];
  if (!allowedNextStates.includes(nextState)) return false;

  const requiredDirections = directionConstraints[nextState];
  if (requiredDirections && !requiredDirections.includes(direction)) return false;

  return true;
};

const isTerminal = (state) => terminalStates.includes(state);

module.exports = {
  isValidTransition,
  isTerminal
};
