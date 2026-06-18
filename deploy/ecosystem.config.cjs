// PM2 process definition for the Wheat Harvester API.
//
// Start (from the repo root):  pm2 start deploy/ecosystem.config.cjs
// Reload after a deploy:       pm2 startOrReload deploy/ecosystem.config.cjs --update-env
//
// `cwd` is the API package dir so NestJS loads apps/api/.env and serves its
// ./uploads folder from there. Relative paths resolve from the repo root, so
// always invoke pm2 from the repo root (the deploy script does).
module.exports = {
  apps: [
    {
      name: 'myharvester-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      // Logs go to ~/.pm2/logs/myharvester-api-{out,error}.log by default.
    },
  ],
};
