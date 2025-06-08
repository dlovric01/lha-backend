module.exports = {
  apps: [
    {
      name: 'lha-server',          // a name for your app in PM2
      script: './src/index.js',    // entry point to your app
      watch: true,                 // restart if files change (optional)
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
