import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import {
  ProductQueryDto,
  CreateProductDto,
  UpdateProductDto,
  ReceiveStockDto,
  DispatchStockDto,
  ProductStatus,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly db: DatabaseService) {}

  private calculateStatus(stock: number, minReorder: number): ProductStatus {
    if (stock <= 0) return ProductStatus.OUT_OF_STOCK;
    if (stock <= minReorder) return ProductStatus.LOW_STOCK;
    return ProductStatus.IN_STOCK;
  }

  /* ---------------- PRODUCTS ---------------- */

  async getProducts(query: ProductQueryDto) {
    const { search, category, warehouse, status, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ['is_deleted = false'];
    const params: any[] = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (warehouse) {
      params.push(warehouse);
      conditions.push(`warehouse = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(name ILIKE $${params.length} OR sku ILIKE $${params.length} OR category ILIKE $${params.length})`,
      );
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM inventory_products WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await this.db.query(
      `SELECT id, name, sku, category, warehouse, stock,
              min_reorder as "minReorder", unit_price as "unitPrice",
              unit, status, created_at as "createdAt"
       FROM inventory_products
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const formattedData = res.rows.map((row) => ({
      ...row,
      unitPrice: Number(row.unitPrice || 0),
    }));

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  async getProductById(id: string) {
    const res = await this.db.query(
      `SELECT id, name, sku, category, warehouse, stock,
              min_reorder as "minReorder", unit_price as "unitPrice",
              unit, status, created_at as "createdAt"
       FROM inventory_products
       WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Product with ID ${id} not found` });
    }

    const row = res.rows[0];
    return {
      ...row,
      unitPrice: Number(row.unitPrice || 0),
    };
  }

  async createProduct(dto: CreateProductDto) {
    const stock = dto.stock || 0;
    const minReorder = dto.minReorder || 10;
    const computedStatus = dto.status || this.calculateStatus(stock, minReorder);

    const res = await this.db.query(
      `INSERT INTO inventory_products (
        name, sku, category, warehouse, stock, min_reorder, unit_price, unit, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, sku, category, warehouse, stock,
                 min_reorder as "minReorder", unit_price as "unitPrice",
                 unit, status, created_at as "createdAt"`,
      [
        dto.name,
        dto.sku,
        dto.category,
        dto.warehouse || 'Suraj Main Factory Warehouse (Bay A)',
        stock,
        minReorder,
        dto.unitPrice || 0,
        dto.unit || 'Units',
        computedStatus,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      unitPrice: Number(row.unitPrice || 0),
    };
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.getProductById(id);

    const name = dto.name ?? existing.name;
    const sku = dto.sku ?? existing.sku;
    const category = dto.category ?? existing.category;
    const warehouse = dto.warehouse ?? existing.warehouse;
    const stock = dto.stock ?? existing.stock;
    const minReorder = dto.minReorder ?? existing.minReorder;
    const unitPrice = dto.unitPrice ?? existing.unitPrice;
    const unit = dto.unit ?? existing.unit;
    const status = dto.status ?? this.calculateStatus(stock, minReorder);

    const res = await this.db.query(
      `UPDATE inventory_products
       SET name = $1, sku = $2, category = $3, warehouse = $4, stock = $5,
           min_reorder = $6, unit_price = $7, unit = $8, status = $9, updated_at = NOW()
       WHERE id = $10 AND is_deleted = false
       RETURNING id, name, sku, category, warehouse, stock,
                 min_reorder as "minReorder", unit_price as "unitPrice",
                 unit, status, created_at as "createdAt"`,
      [name, sku, category, warehouse, stock, minReorder, unitPrice, unit, status, id],
    );

    const row = res.rows[0];
    return {
      ...row,
      unitPrice: Number(row.unitPrice || 0),
    };
  }

  /* ---------------- STOCK MOVEMENTS AUDIT LOGS ---------------- */

  async getMovements() {
    const res = await this.db.query(
      `SELECT id, product_id as "productId", product_name as "productName",
              sku, type, quantity, numeric_quantity as "numericQuantity",
              reference_no as "referenceNo", date_time as "dateTime",
              created_by_user as "user"
       FROM inventory_movements
       ORDER BY date_time DESC
       LIMIT 100`,
    );

    return res.rows;
  }

  async receiveStock(dto: ReceiveStockDto, userName?: string) {
    const product = await this.getProductById(dto.productId);
    const newStock = product.stock + dto.numericQuantity;
    const newStatus = this.calculateStatus(newStock, product.minReorder);

    // Update product stock
    await this.db.query(
      `UPDATE inventory_products SET stock = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newStock, newStatus, dto.productId],
    );

    // Create movement log
    const qtyStr = `+${dto.numericQuantity} ${product.unit}`;
    const logRes = await this.db.query(
      `INSERT INTO inventory_movements (
        product_id, product_name, sku, type, quantity, numeric_quantity, reference_no, created_by_user
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, product_id as "productId", product_name as "productName",
                 sku, type, quantity, numeric_quantity as "numericQuantity",
                 reference_no as "referenceNo", date_time as "dateTime",
                 created_by_user as "user"`,
      [
        product.id,
        product.name,
        product.sku,
        'STOCK IN',
        qtyStr,
        dto.numericQuantity,
        dto.referenceNo || 'INCOMING',
        userName || 'System',
      ],
    );

    return {
      message: `Successfully received +${dto.numericQuantity} ${product.unit} for ${product.name}`,
      product: { ...product, stock: newStock, status: newStatus },
      movement: logRes.rows[0],
    };
  }

  async dispatchStock(dto: DispatchStockDto, userName?: string) {
    const product = await this.getProductById(dto.productId);

    if (product.stock < dto.numericQuantity) {
      throw new BadRequestException({
        message: `Insufficient stock count for ${product.name}. Current stock: ${product.stock}, requested: ${dto.numericQuantity}`,
      });
    }

    const newStock = product.stock - dto.numericQuantity;
    const newStatus = this.calculateStatus(newStock, product.minReorder);

    // Update product stock
    await this.db.query(
      `UPDATE inventory_products SET stock = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newStock, newStatus, dto.productId],
    );

    // Create movement log
    const qtyStr = `-${dto.numericQuantity} ${product.unit}`;
    const logRes = await this.db.query(
      `INSERT INTO inventory_movements (
        product_id, product_name, sku, type, quantity, numeric_quantity, reference_no, created_by_user
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, product_id as "productId", product_name as "productName",
                 sku, type, quantity, numeric_quantity as "numericQuantity",
                 reference_no as "referenceNo", date_time as "dateTime",
                 created_by_user as "user"`,
      [
        product.id,
        product.name,
        product.sku,
        'STOCK OUT',
        qtyStr,
        dto.numericQuantity,
        dto.referenceNo || 'DISPATCH',
        userName || 'System',
      ],
    );

    return {
      message: `Successfully dispatched -${dto.numericQuantity} ${product.unit} for ${product.name}`,
      product: { ...product, stock: newStock, status: newStatus },
      movement: logRes.rows[0],
    };
  }
}
