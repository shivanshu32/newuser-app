/**
 * Simple store to manage pending consultations
 * This allows us to track consultations that have been accepted but not yet joined
 */

// Store for pending consultations
const pendingConsultations = [];

// Add a consultation to the store
export const addPendingConsultation = (consultation) => {
  // Check if this consultation already exists
  const exists = pendingConsultations.some(c => c.booking._id === consultation.booking._id);
  
  if (!exists) {
    console.log('Adding pending consultation to store:', consultation.booking._id);
    pendingConsultations.push(consultation);
    return true;
  }
  return false;
};

// Remove a consultation from the store
export const removePendingConsultation = (bookingId) => {
  const initialLength = pendingConsultations.length;
  const index = pendingConsultations.findIndex(c => c.booking._id === bookingId);
  
  if (index !== -1) {
    pendingConsultations.splice(index, 1);
    console.log('Removed pending consultation from store:', bookingId);
    return true;
  }
  return false;
};

// Get all pending consultations
export const getPendingConsultations = () => {
  return [...pendingConsultations];
};

// Check if there are any pending consultations
export const hasPendingConsultations = () => {
  return pendingConsultations.length > 0;
};

// Get count of pending consultations
export const getPendingConsultationsCount = () => {
  return pendingConsultations.length;
};
