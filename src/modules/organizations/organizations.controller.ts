import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all ERP organization branches' })
  findAll() {
    return this.orgsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new ERP organization branch' })
  create(@Body() createOrgDto: CreateOrganizationDto) {
    return this.orgsService.create(createOrgDto);
  }
}
