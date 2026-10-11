module.exports = {
  apps: [
    {
      name: "slmms-server",
      cwd: "/var/www/slmms-v2/server",
      script: "index.js",
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
