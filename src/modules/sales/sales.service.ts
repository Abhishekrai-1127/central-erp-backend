import { Injectable } from '@nestjs/common';

@Injectable()
export class SalesService {
  private orders = [
    {
      id: 'SO-9001',
      customerName: 'Acme Enterprise',
      totalAmount: 12495.0,
      status: 'CONFIRMED',
      orderDate: new Date().toISOString(),
    },
  ];

  async getSalesOrders() {
    return this.orders;
  }
}
