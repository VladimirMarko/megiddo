import { z } from 'zod'

export const enabledEnvFlagSchema = z.enum(['enabled'])
export const identityTokenCodecEnvSchema = z.enum(['dummy', 'jwt-jws'])
export const localDummyAuthProfileEnvSchema = z.enum(['local-dummy'])
export const tcpPortEnvSchema = z.coerce.number().int().min(1).max(65535)
