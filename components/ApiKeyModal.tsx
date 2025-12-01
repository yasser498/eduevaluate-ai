import React from 'react';

// This component is deprecated/removed to comply with security guidelines regarding API Key handling.
// API Key must be provided via process.env.API_KEY

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  return null;
};
