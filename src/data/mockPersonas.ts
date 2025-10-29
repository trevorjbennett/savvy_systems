import type { Persona, PersonaCollection } from '../types/persona';

// Mock personas - in production these would come from Firebase Auth + Firestore
export const MOCK_PERSONAS: Persona[] = [
  {
    id: 'local-user',
    displayName: 'You',
    email: 'local@savvy.app',
    createdAt: new Date('2024-01-01'),
    isLocal: true,
  },
  {
    id: 'dev-persona',
    displayName: 'Dev Setup',
    email: 'dev@savvy.app',
    createdAt: new Date('2024-01-15'),
    isLocal: false,
  },
  {
    id: 'designer-persona',
    displayName: 'Designer Setup',
    email: 'designer@savvy.app',
    createdAt: new Date('2024-02-01'),
    isLocal: false,
  },
];

// Mock collections for each persona
export const MOCK_PERSONA_COLLECTIONS: PersonaCollection[] = [
  {
    id: 'collection-1',
    personaId: 'local-user',
    name: 'My Dev Tools',
    description: 'Essential development tools',
    packageIds: ['vscode', 'git', 'docker', 'python312'],
    isPublic: false,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'collection-2',
    personaId: 'dev-persona',
    name: 'Full Stack Essentials',
    description: 'Everything needed for full stack development',
    packageIds: ['vscode', 'git', 'docker', 'python312', 'postman', 'notepadplusplus'],
    isPublic: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    sharedWith: ['local-user'],
  },
  {
    id: 'collection-3',
    personaId: 'designer-persona',
    name: 'Creative Suite',
    description: 'Design and creative tools',
    packageIds: ['google.chrome', 'vlc', 'discord'],
    isPublic: true,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
  },
];
