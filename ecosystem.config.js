module.exports = {
  apps: [
    {
      name: 'whatsapp-bot',
      script: 'src/server/whatsapp.ts',
      interpreter: 'node',
      interpreter_args: '--require tsx/cjs',
      cwd: 'C:/Users/prash/.gemini/antigravity/scratch/atul-residency',
      watch: false,
      autorestart: true,
      max_restarts: 20,
      min_uptime: '15s',
      restart_delay: 10000,
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: 'logs/whatsapp-bot-out.log',
      error_file: 'logs/whatsapp-bot-err.log',
      merge_logs: true,
      log_type: 'json',
      instances: 1,
      exec_mode: 'fork',
    }
  ],
};
