module.exports = {
  apps: [
    {
      name: 'whatsapp-bot',
      script: 'src/server/whatsapp.ts',
      interpreter: 'node',
      interpreter_args: '--require tsx/cjs',
      cwd: 'C:/Users/prash/.gemini/antigravity/scratch/atul-residency',

      // --- Restart policy ---
      watch: ['src/server/whatsapp.ts', 'src/lib/whatsapp/'],
      ignore_watch: ['node_modules', '.next', 'logs', 'backups', '.wwebjs_cache', '.wwebjs_auth', 'public', 'dev.db', 'package-lock.json', 'package.json', 'app-config.json', 'watch-and-deploy.ps1'],
      autorestart: true,             // Restart automatically on crash
      max_restarts: 20,              // Max restarts before giving up
      min_uptime: '10s',             // Must stay alive 10s to count as successful start
      restart_delay: 5000,           // Wait 5s before restarting after crash

      // --- Environment ---
      env: {
        NODE_ENV: 'production',
      },

      // --- Logging ---
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: 'logs/whatsapp-bot-out.log',
      error_file: 'logs/whatsapp-bot-err.log',
      merge_logs: true,
      log_type: 'json',

      // --- Windows-specific: don't use cluster mode ---
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
