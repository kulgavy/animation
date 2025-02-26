import { SignatureAlgorithm } from "hono/utils/jwt/jwa"

export const SIGNATURE_ALGORITHM: SignatureAlgorithm='HS512'
export const TOKEN_EXPIRATION_DAYS: number = 1;