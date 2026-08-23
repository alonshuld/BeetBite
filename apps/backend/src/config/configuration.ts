// Signing keys that have appeared in this repo's own manifests or are common
// copy-paste defaults. A JWT signed with any of these is forgeable by anyone
// who has read the source, and JwtStrategy accepts a valid signature without
// re-checking the subject against the database — so a weak secret is a full
// authentication bypass, not a hardening nit.
const PLACEHOLDER_JWT_SECRETS = new Set([
  'changeme',
  'changeme-in-production',
  'change-me',
  'secret',
  'jwtsecret',
  'jwt-secret',
  'your-secret-key',
]);

const MIN_PRODUCTION_JWT_SECRET_LENGTH = 32;

export default () => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const nodeEnv = process.env.NODE_ENV || 'development';

  // Fail closed in production rather than boot on a value someone published.
  // Left permissive outside production so dev and test setups stay frictionless.
  if (nodeEnv === 'production') {
    if (PLACEHOLDER_JWT_SECRETS.has(jwtSecret.trim().toLowerCase())) {
      throw new Error(
        'JWT_SECRET is a known placeholder value — set a real secret in production',
      );
    }

    if (jwtSecret.length < MIN_PRODUCTION_JWT_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_PRODUCTION_JWT_SECRET_LENGTH} characters in production`,
      );
    }
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv,
    database: {
      url: process.env.DATABASE_URL,
    },
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
      ],
    },
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
  };
};
