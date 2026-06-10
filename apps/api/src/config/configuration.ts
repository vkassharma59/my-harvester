export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  mongoUri: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  bootstrapAdmin: {
    email?: string;
    password?: string;
    name?: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/wheat_harvester',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  bootstrapAdmin: {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    name: process.env.BOOTSTRAP_ADMIN_NAME,
  },
});
