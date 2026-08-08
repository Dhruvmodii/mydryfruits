module.exports = {
  apps: [
    {
      name: "mydryfruits-api",
      cwd: __dirname,
      script: "apps/api/dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      out_file: "logs/api-out.log",
      error_file: "logs/api-error.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "mydryfruits-web",
      cwd: __dirname + "/apps/web",
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_memory_restart: "512M",
      out_file: "../../logs/web-out.log",
      error_file: "../../logs/web-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};

