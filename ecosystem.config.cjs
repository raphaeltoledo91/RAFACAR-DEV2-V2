module.exports = {
  apps: [
    {
      name: 'traccar-pro-frontend',
      script: 'server.js',
      cwd: '/opt/traccar-pro-frontend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    }
  ]
};
