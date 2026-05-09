import { ForbiddenError, NotFoundError } from '../errors.js';
import type { RecordRepository } from '../../domain/records/recordRepository.js';

export class DeleteRecordUseCase {
  constructor(private readonly records: RecordRepository) {}

  execute(id: string, authUserId: string): void {
    const current = this.records.findById(id);

    if (!current) {
      throw new NotFoundError('record_not_found');
    }

    if (current.ownerUserId !== authUserId) {
      throw new ForbiddenError('record_owner_mismatch');
    }

    const deleted = this.records.delete(id);

    if (!deleted) {
      throw new NotFoundError('record_not_found');
    }
  }
}
