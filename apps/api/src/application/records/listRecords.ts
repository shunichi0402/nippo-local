import type { RecordRepository, RecordSearchQuery, RecordSearchResult } from '../../domain/records/recordRepository.js';

export class ListRecordsUseCase {
  constructor(private readonly records: RecordRepository) {}

  execute(query: RecordSearchQuery): RecordSearchResult {
    return this.records.list(query);
  }
}
