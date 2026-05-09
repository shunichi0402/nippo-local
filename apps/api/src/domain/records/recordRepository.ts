import type {
  AudioAttachment,
  NewAudioAttachment,
  NewRecord,
  RecordItem,
  TranscriptUpdate
} from './record.js';

export type RecordSearchQuery = {
  keyword?: string;
  targetDate?: string;
  kind?: string;
  tag?: string;
};

export interface RecordRepository {
  create(record: NewRecord): RecordItem;
  list(query?: RecordSearchQuery): RecordItem[];
  findById(id: string): RecordItem | null;
  createAudioAttachment(attachment: NewAudioAttachment): AudioAttachment;
  updateTranscript(input: TranscriptUpdate): AudioAttachment;
}
