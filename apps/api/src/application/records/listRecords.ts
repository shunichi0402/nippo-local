import type { RecordItem } from '../../domain/records/record.js';
import type { RecordRepository, RecordSearchQuery } from '../../domain/records/recordRepository.js';

export class ListRecordsUseCase {
  constructor(private readonly records: RecordRepository) {}

  execute(query: RecordSearchQuery): RecordItem[] {
    return this.records.list(query);
  }
}

