// Firebase-ready structure
// In production, these would be stored in Firestore with user authentication

export interface Persona {
  id: string; // Firebase document ID
  displayName: string;
  email: string;
  avatar?: string; // Optional avatar URL
  createdAt: Date;
  isLocal: boolean; // True for local personas, false for Firebase
}

export interface PersonaCollection {
  id: string; // Firebase document ID
  personaId: string; // Owner persona ID
  name: string;
  description?: string;
  packageIds: string[]; // Only store IDs, not full package data
  isPublic: boolean; // Can other personas see/import this?
  createdAt: Date;
  updatedAt: Date;
  sharedWith?: string[]; // Array of persona IDs who can access
}

// For sharing collections
export interface SharedCollection {
  collectionId: string;
  ownerPersonaId: string;
  ownerDisplayName: string;
  sharedAt: Date;
}
