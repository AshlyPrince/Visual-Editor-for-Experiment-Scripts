const Joi = require('joi');

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3001),
    DB_HOST: Joi.string().description('Database host'),
    DB_PORT: Joi.number().description('Database port'),
    DB_USER: Joi.string().description('Database username'),
    DB_PASS: Joi.string().allow('').description('Database password'),
    DB_NAME: Joi.string().description('Database name'),
    FRONTEND_URL: Joi.string().description('Frontend URL'),
    SESSION_SECRET: Joi.string().description('Session secret'),
    KC_REALM: Joi.string().description('Keycloak realm'),
    KC_AUTH_SERVER_URL: Joi.string().description('Keycloak auth server url'),
    KC_CLIENT_ID: Joi.string().description('Keycloak client id'),
    KC_REALM_PUBLIC_KEY: Joi.string().description('Keycloak public key'),
    PROTECT_ROUTES: Joi.string().valid('keycloak', 'none').description('Route protection mode'),
    ADMIN_ROLE: Joi.string().default('admin').description('Admin role name'),
    TEACHER_ROLE: Joi.string().default('teacher').description('Teacher role name'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  frontend: {
    url: envVars.FRONTEND_URL,
  },
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    user: envVars.DB_USER,
    password: envVars.DB_PASS,
    database: envVars.DB_NAME,
  },
  session: {
    secret: envVars.SESSION_SECRET,
  },
  keycloak: {
    realm: envVars.KC_REALM,
    authServerUrl: envVars.KC_AUTH_SERVER_URL,
    clientId: envVars.KC_CLIENT_ID,
    realmPublicKey: envVars.KC_REALM_PUBLIC_KEY,
  },
  admin: {
    role: envVars.ADMIN_ROLE,
  },
  teacher: {
    role: envVars.TEACHER_ROLE,
  },
  protection: {
    enabled: envVars.PROTECT_ROUTES === 'keycloak',
  },
};
