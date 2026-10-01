// Interaction-level group membership arrays
const PROCESSED_INTERACTIONS = ['interacted', 'not_interested', 'not_interacted', 'wrong_number'];
const INTERACTED_INTERACTIONS = ['interacted', 'not_interested'];
const NB_GENERAL = 'payment_completed_nb';

function isProcessed(interactionName)  {
   return PROCESSED_INTERACTIONS.includes(interactionName); 
}

function isInteracted(interactionName) { 
  return INTERACTED_INTERACTIONS.includes(interactionName); 
}

function isNb(generalName)             { 
  return generalName === NB_GENERAL; 
}

module.exports = {
  PROCESSED_INTERACTIONS, INTERACTED_INTERACTIONS, NB_GENERAL,
  isProcessed, isInteracted, isNb,
};
