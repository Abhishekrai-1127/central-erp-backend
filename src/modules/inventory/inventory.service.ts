import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryService {
  private items = [
    {
      id: 'inv-101',
      sku: 'ERP-ITEM-001',
      name: 'Industrial Widget A',
      quantity: 500,
      unitPrice: 24.99,
      warehouse: 'Main Warehouse North',
    },
  ];

  async getInventoryList() {
    return this.items;
  }
}
