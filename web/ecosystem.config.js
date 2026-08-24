// PM2 process file — aaPanel'in PM2 yöneticisi veya doğrudan `pm2 start
// ecosystem.config.js` ile kullanılır. Uygulamayı production modunda,
// çökerse yeniden başlatarak ve log tutarak çalıştırır.
module.exports = {
  apps: [
    {
      name: "sobso",
      script: "service/run.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1", // yalnızca Nginx üzerinden erişilsin
        PORT: "3000",
      },
    },
  ],
};
