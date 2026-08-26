export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-erp-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  database: {
    url: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || '100.99.17.37',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'crm_user',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'crm',
  },
});
