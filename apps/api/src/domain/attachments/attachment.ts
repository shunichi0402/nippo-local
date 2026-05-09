export const photoDeleteModes = ['detach_only', 'delete_file'] as const;

export type PhotoDeleteMode = (typeof photoDeleteModes)[number];

export type PhotoAttachment = {
  id: string;
  recordId: string | null;
  relativePath: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string;
  previewUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type NewPhotoAttachment = {
  id: string;
  recordId: string;
  relativePath: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
};
