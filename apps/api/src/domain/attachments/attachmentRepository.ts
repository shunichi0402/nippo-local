import type { NewRecord, RecordItem } from '../records/record.js';
import type { NewPhotoAttachment, PhotoAttachment } from './attachment.js';

export interface AttachmentRepository {
  createPhotoAttachment(input: NewPhotoAttachment): PhotoAttachment;
  createPhotoRecord(record: NewRecord, attachment: Omit<NewPhotoAttachment, 'recordId'>): {
    record: RecordItem;
    attachment: PhotoAttachment;
  };
  findPhotoAttachmentById(id: string): PhotoAttachment | null;
  listPhotoAttachmentsByRecordIds(recordIds: string[]): Map<string, PhotoAttachment[]>;
  updatePhotoCaption(id: string, caption: string): PhotoAttachment | null;
  detachPhotoAttachment(id: string): PhotoAttachment | null;
  deletePhotoAttachmentMetadata(id: string): PhotoAttachment | null;
  countPhotoReferences(relativePath: string): number;
}
