import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  ProductQueryDto,
  CreateProductDto,
  UpdateProductDto,
  ReceiveStockDto,
  DispatchStockDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  @Roles(
    UserRole.ADMIN,
    UserRole.WAREHOUSE_MANAGER,
    UserRole.SALES_REP,
    UserRole.PURCHASE_OFFICER,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List inventory items (?search=Gear&category=Mechanical)' })
  @ApiResponse({ status: 200, description: 'Returns inventory products list.' })
  getProducts(@Query() query: ProductQueryDto) {
    return this.inventoryService.getProducts(query);
  }

  @Get('products/:id')
  @Roles(
    UserRole.ADMIN,
    UserRole.WAREHOUSE_MANAGER,
    UserRole.SALES_REP,
    UserRole.PURCHASE_OFFICER,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get product details by ID' })
  @ApiResponse({ status: 200, description: 'Product details.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  getProductById(@Param('id') id: string) {
    return this.inventoryService.getProductById(id);
  }

  @Post('products')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Add new inventory item / raw material' })
  @ApiResponse({ status: 201, description: 'Product successfully created.' })
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.inventoryService.createProduct(createProductDto);
  }

  @Put('products/:id')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update item stock, price, or storage bay' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.inventoryService.updateProduct(id, updateProductDto);
  }

  @Get('movements')
  @Roles(
    UserRole.ADMIN,
    UserRole.WAREHOUSE_MANAGER,
    UserRole.SALES_REP,
    UserRole.PURCHASE_OFFICER,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Fetch stock movement audit history' })
  @ApiResponse({ status: 200, description: 'Returns stock movement audit log.' })
  getMovements() {
    return this.inventoryService.getMovements();
  }

  @Post('receive-stock')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Post incoming stock (Increments item stock count & logs audit)' })
  @ApiResponse({ status: 200, description: 'Stock received and audited.' })
  receiveStock(
    @Body() receiveStockDto: ReceiveStockDto,
    @CurrentUser('name') userName: string,
  ) {
    return this.inventoryService.receiveStock(receiveStockDto, userName);
  }

  @Post('dispatch-stock')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Post outgoing stock (Decrements item stock count & logs audit)' })
  @ApiResponse({ status: 200, description: 'Stock dispatched and audited.' })
  @ApiResponse({ status: 400, description: 'Insufficient stock count for dispatch.' })
  dispatchStock(
    @Body() dispatchStockDto: DispatchStockDto,
    @CurrentUser('name') userName: string,
  ) {
    return this.inventoryService.dispatchStock(dispatchStockDto, userName);
  }
}
