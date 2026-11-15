export type FileLanguage = 'html' | 'css' | 'javascript' | 'json' | 'markdown';

export interface GeneratedFile {
  path: string;
  language: FileLanguage;
  content: string;
}

export interface ProjectVersion {
  id: string;
  versionNumber: number;
  prompt: string;
  summary: string;
  files: GeneratedFile[];
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  versionId?: string;
  versionNumber?: number;
  updatedFiles?: string[];
  suggestions?: string[];
  isError?: boolean;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  versions: ProjectVersion[];
  activeVersionId: string | null;
}

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
export type RightPaneMode = 'preview' | 'code';

export interface GenerationPayload {
  projectTitle: string;
  summary: string;
  files: GeneratedFile[];
  followUpSuggestions: string[];
}
