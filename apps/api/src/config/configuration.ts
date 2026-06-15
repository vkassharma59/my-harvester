export interface MysqlConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  mysql: MysqlConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  bootstrapAdmin: {
    email?: string;
    password?: string;
    name?: string;
  };
  /** The platform operator seeded on a fresh DB; logs into the web console. */
  superAdmin: {
    email?: string;
    password?: string;
    name?: string;
  };
  subscription: {
    /** Free-trial length granted to a newly onboarded owner. */
    trialDays: number;
  };
  /** Outbound email (owner welcome credentials). Disabled until host+auth set. */
  mail: {
    host?: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  mysql: {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
    username: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'myharvester_prod',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  bootstrapAdmin: {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    name: process.env.BOOTSTRAP_ADMIN_NAME,
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    name: process.env.SUPER_ADMIN_NAME,
  },
  subscription: {
    trialDays: parseInt(process.env.SUBSCRIPTION_TRIAL_DAYS ?? '365', 10),
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'Wheat Harvester <no-reply@wheat-harvester.app>',
  },
});
