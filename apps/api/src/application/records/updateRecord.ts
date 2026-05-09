import { ForbiddenError, NotFoundError } from '../errors.js';
import type { RecordItem, UpdateRecord } from '../../domain/records/record.js';
import type { RecordRepository } from '../../domain/records/recordRepository.js';

export class UpdateRecordUseCase {
  constructor(private readonly records: RecordRepository) {}

  execute(id: string, input: UpdateRecord, authUserId: string): RecordItem {
    const current = this.records.findById(id);

    if (!current) {
      throw new NotFoundError('record_not_found');
    }

    if (current.ownerUserId !== authUserId) {
      throw new ForbiddenError('record_owner_mismatch');
    }

    const updated = this.records.update(id, input);

    if (!updated) {
      throw new NotFoundError('record_not_found');
    }

    return updated;
  }
}
