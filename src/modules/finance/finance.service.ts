import { Injectable } from '@nestjs/common';

@Injectable()
export class FinanceService {
  private ledger = [
    {
      id: 'TRX-5001',
      accountCode: '1010-CASH',
      type: 'CREDIT',
      amount: 12495.0,
      reference: 'INV-2026-001',
      transactionDate: new Date().toISOString(),
    },
  ];

  async getLedgerEntries() {
    return this.ledger;
  }
}
