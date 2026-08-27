export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'ggi',
    password: process.env.DB_PASSWORD ?? 'ggi',
    name: process.env.DB_NAME ?? 'ggi_backend_test',
  },
  admin: {
    // Seeds a demo admin user on boot. Unlike regular users (picked with no
    // password), the admin account is seeded WITH a password so switching
    // into it in the picker requires that password.
    email: process.env.ADMIN_EMAIL ?? 'admin@ggi.test',
    name: process.env.ADMIN_NAME ?? 'Admin',
    password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
  },
});
