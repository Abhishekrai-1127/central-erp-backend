import { Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';

export interface OrganizationItem {
  id: string;
  name: string;
  code: string;
  address?: string;
  status: string;
  createdAt: string;
}

@Injectable()
export class OrganizationsService {
  private orgs: OrganizationItem[] = [
    {
      id: 'org-1',
      name: 'Central Headquarters',
      code: 'HQ-MAIN',
      address: '100 Central HQ Plaza',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
  ];

  async findAll(): Promise<OrganizationItem[]> {
    return this.orgs;
  }

  async create(createOrgDto: CreateOrganizationDto): Promise<OrganizationItem> {
    const newOrg: OrganizationItem = {
      id: `org-${this.orgs.length + 1}`,
      ...createOrgDto,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.orgs.push(newOrg);
    return newOrg;
  }
}
