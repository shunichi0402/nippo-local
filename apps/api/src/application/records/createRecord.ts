import type { NewRecord, RecordItem } from '../../domain/records/record.js';
import type { RecordRepository } from '../../domain/records/recordRepository.js';

export class CreateRecordUseCase {
  constructor(private readonly records: RecordRepository) {}

  execute(input: NewRecord): RecordItem {
    return this.records.create(input);
  }
}

