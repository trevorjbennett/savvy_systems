export interface Package {
  name: string;
  id: string;
  version: string;
  description: string;
  source: 'chocolatey' | 'winget';
  installed: boolean;
  category: string;
  hasUpdate?: boolean;
  dependencies?: string[];
}
