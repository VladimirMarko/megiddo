import type { ContractRouterClient } from '@orpc/contract'
import { oc } from '@orpc/contract'
import { z } from 'zod'

export const GatewayStatusResourceSchemaV1 = z.object({
  service: z.literal('api-gateway'),
  message: z.literal('frontend is connected'),
})

export const TodoResourceSchemaV1 = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  completed: z.boolean(),
})

export const UserReferenceResourceSchemaV1 = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).optional(),
})

export const IdentityTokenSchemaV1 = z.string().min(1)
export const BrowserSessionIdSchemaV1 = z.string().min(1)

export const OperationalHealthResourceSchemaV1 = z.discriminatedUnion('status', [
  z.object({ service: z.string().min(1), status: z.literal('ready') }).strict(),
  z
    .object({
      reasons: z.array(z.string().min(1)).nonempty(),
      service: z.string().min(1),
      status: z.union([z.literal('starting'), z.literal('degraded'), z.literal('broken')]),
    })
    .strict(),
])

export const AuthSessionResourceSchemaV1 = z.discriminatedUnion('state', [
  z.object({ state: z.literal('logged-out') }),
  z.object({ state: z.literal('expired') }),
  z.object({
    state: z.literal('logged-in'),
    user: UserReferenceResourceSchemaV1,
  }),
])

export const BrowserSessionResourceSchemaV1 = z.object({
  id: BrowserSessionIdSchemaV1,
})

export const IdentityTokenAudienceSchemaV1 = z.object({
  service: z.string().min(1),
})

export const IdentityTokenClaimsSchemaV1 = z.object({
  subject: z.string().min(1),
  audience: IdentityTokenAudienceSchemaV1,
  contractVersion: z.string().min(1).optional(),
  issuedAt: z.number().int().nonnegative(),
})

export const IdentityTokenIssueInputSchemaV1 = z.object({
  subject: z.string().min(1).optional(),
  audience: IdentityTokenAudienceSchemaV1,
  contractVersion: z.string().min(1).optional(),
})

export const IdentityTokenIssueOutputSchemaV1 = z.object({
  identityToken: IdentityTokenSchemaV1,
  user: UserReferenceResourceSchemaV1,
})

export const BrowserSessionIssueOutputSchemaV1 = z.object({
  browserSession: BrowserSessionResourceSchemaV1,
  user: UserReferenceResourceSchemaV1,
})

export const DummyAuthAccountResourceSchemaV1 = z.object({
  displayName: z.string().min(1),
  principalId: z.string().min(1),
})

export const AuthCapabilitiesResourceSchemaV1 = z.object({
  dummy: z
    .object({
      accounts: z.array(DummyAuthAccountResourceSchemaV1),
      signIn: z.literal('available').optional(),
      signUp: z.literal('available'),
    })
    .optional(),
  signInMethods: z.array(z.literal('dummy')),
  signUpMethods: z.array(z.literal('dummy')),
})

export const AuthSignInInputSchemaV1 = z.object({
  method: z.literal('dummy'),
  principalId: z.string().min(1),
})

export const AuthSignUpInputSchemaV1 = z.object({
  displayName: z.string().trim().min(1),
  method: z.literal('dummy'),
})

export const BrowserSessionInputSchemaV1 = z.object({ sessionId: BrowserSessionIdSchemaV1 })

export const GatewayAuthSessionInputSchemaV1 = z.undefined()
export const GatewayAuthCapabilitiesInputSchemaV1 = z.undefined()
export const GatewayAuthSignInInputSchemaV1 = z.object({
  method: z.literal('dummy'),
  principalId: z.string().min(1),
})
export const GatewayAuthSignUpInputSchemaV1 = z.object({
  displayName: z.string().trim().min(1),
  method: z.literal('dummy'),
})
export const GatewayAuthSignOutInputSchemaV1 = z.undefined()
export const GatewayStatusInputSchemaV1 = z.undefined()
export const OperationalHealthInputSchemaV1 = z.undefined()
export const GatewayTodoListInputSchemaV1 = z.undefined()
export const GatewayTodoCreateInputSchemaV1 = z.object({ title: z.string().min(1) })
export const GatewayTodoByIdInputSchemaV1 = z.object({ id: z.string().min(1) })
export const GatewayTodoRenameInputSchemaV1 = GatewayTodoByIdInputSchemaV1.extend({ title: z.string().min(1) })
export const AuthenticatedTodoInputSchemaV1 = z.object({ identityToken: IdentityTokenSchemaV1 })
export const TodoListInputSchemaV1 = AuthenticatedTodoInputSchemaV1
export const TodoCreateInputSchemaV1 = AuthenticatedTodoInputSchemaV1.extend({ title: z.string().min(1) })
export const TodoByIdInputSchemaV1 = AuthenticatedTodoInputSchemaV1.extend({ id: z.string().min(1) })
export const TodoRenameInputSchemaV1 = TodoByIdInputSchemaV1.extend({ title: z.string().min(1) })

export type GatewayStatus = z.infer<typeof GatewayStatusResourceSchemaV1>
export type OperationalHealthResourceV1 = z.infer<typeof OperationalHealthResourceSchemaV1>
export type TodoResourceV1 = z.infer<typeof TodoResourceSchemaV1>
export type UserReferenceResourceV1 = z.infer<typeof UserReferenceResourceSchemaV1>
export type AuthSessionResourceV1 = z.infer<typeof AuthSessionResourceSchemaV1>
export type AuthCapabilitiesResourceV1 = z.infer<typeof AuthCapabilitiesResourceSchemaV1>
export type AuthSignInInputV1 = z.infer<typeof AuthSignInInputSchemaV1>
export type AuthSignUpInputV1 = z.infer<typeof AuthSignUpInputSchemaV1>
export type BrowserSessionIssueOutputV1 = z.infer<typeof BrowserSessionIssueOutputSchemaV1>
export type BrowserSessionInputV1 = z.infer<typeof BrowserSessionInputSchemaV1>
export type DummyAuthAccountResourceV1 = z.infer<typeof DummyAuthAccountResourceSchemaV1>
export type IdentityTokenAudienceV1 = z.infer<typeof IdentityTokenAudienceSchemaV1>
export type IdentityTokenClaimsV1 = z.infer<typeof IdentityTokenClaimsSchemaV1>
export type IdentityTokenIssueInputV1 = z.infer<typeof IdentityTokenIssueInputSchemaV1>
export type IdentityTokenIssueOutputV1 = z.infer<typeof IdentityTokenIssueOutputSchemaV1>
export type AuthenticatedTodoInputV1 = z.infer<typeof AuthenticatedTodoInputSchemaV1>
export type GatewayAuthSignInInputV1 = z.infer<typeof GatewayAuthSignInInputSchemaV1>
export type GatewayAuthSignUpInputV1 = z.infer<typeof GatewayAuthSignUpInputSchemaV1>
export type GatewayTodoCreateInputV1 = z.infer<typeof GatewayTodoCreateInputSchemaV1>
export type GatewayTodoByIdInputV1 = z.infer<typeof GatewayTodoByIdInputSchemaV1>
export type GatewayTodoRenameInputV1 = z.infer<typeof GatewayTodoRenameInputSchemaV1>
export type TodoCreateInputV1 = z.infer<typeof TodoCreateInputSchemaV1>
export type TodoByIdInputV1 = z.infer<typeof TodoByIdInputSchemaV1>
export type TodoRenameInputV1 = z.infer<typeof TodoRenameInputSchemaV1>

export const todoServiceAudienceV1 = IdentityTokenAudienceSchemaV1.parse({ service: 'todo' })
export const apiGatewayAudienceV1 = IdentityTokenAudienceSchemaV1.parse({ service: 'api-gateway' })

export const gatewayStatus = GatewayStatusResourceSchemaV1.parse({
  service: 'api-gateway',
  message: 'frontend is connected',
})

export const operationalHealthContractFragmentV1 = {
  health: oc.input(OperationalHealthInputSchemaV1).output(OperationalHealthResourceSchemaV1),
}

export const apiGatewayOperationalHealthV1 = OperationalHealthResourceSchemaV1.parse({
  service: 'api-gateway',
  status: 'ready',
})

export const todoOperationalHealthV1 = OperationalHealthResourceSchemaV1.parse({ service: 'todo', status: 'ready' })

export const identityOperationalHealthV1 = OperationalHealthResourceSchemaV1.parse({
  service: 'identity',
  status: 'ready',
})

export const apiGatewayContractV1 = {
  v1: {
    gateway: {
      status: oc.input(GatewayStatusInputSchemaV1).output(GatewayStatusResourceSchemaV1),
    },
    operational: operationalHealthContractFragmentV1,
    viewer: {
      session: {
        capabilities: oc.input(GatewayAuthCapabilitiesInputSchemaV1).output(AuthCapabilitiesResourceSchemaV1),
        current: oc.input(GatewayAuthSessionInputSchemaV1).output(AuthSessionResourceSchemaV1),
        signIn: oc.input(GatewayAuthSignInInputSchemaV1).output(AuthSessionResourceSchemaV1),
        signUp: oc.input(GatewayAuthSignUpInputSchemaV1).output(AuthSessionResourceSchemaV1),
        signOut: oc.input(GatewayAuthSignOutInputSchemaV1).output(AuthSessionResourceSchemaV1),
      },
      todos: {
        list: oc.input(GatewayTodoListInputSchemaV1).output(z.array(TodoResourceSchemaV1)),
        create: oc.input(GatewayTodoCreateInputSchemaV1).output(TodoResourceSchemaV1),
        complete: oc.input(GatewayTodoByIdInputSchemaV1).output(TodoResourceSchemaV1),
        reopen: oc.input(GatewayTodoByIdInputSchemaV1).output(TodoResourceSchemaV1),
        rename: oc.input(GatewayTodoRenameInputSchemaV1).output(TodoResourceSchemaV1),
      },
    },
  },
}

export type ApiGatewayContractV1 = typeof apiGatewayContractV1
export type ApiGatewayContractClientV1 = ContractRouterClient<ApiGatewayContractV1>

export const identityContractV1 = {
  v1: {
    development: {
      identityTokens: {
        issue: oc.input(IdentityTokenIssueInputSchemaV1).output(IdentityTokenIssueOutputSchemaV1),
      },
    },
    auth: {
      capabilities: oc.input(GatewayAuthCapabilitiesInputSchemaV1).output(AuthCapabilitiesResourceSchemaV1),
      current: oc.input(BrowserSessionInputSchemaV1).output(AuthSessionResourceSchemaV1),
      signIn: oc.input(AuthSignInInputSchemaV1).output(BrowserSessionIssueOutputSchemaV1),
      signUp: oc.input(AuthSignUpInputSchemaV1).output(BrowserSessionIssueOutputSchemaV1),
      signOut: oc.input(BrowserSessionInputSchemaV1).output(AuthSessionResourceSchemaV1),
    },
    operational: operationalHealthContractFragmentV1,
  },
}

export type IdentityContractV1 = typeof identityContractV1
export type IdentityContractClientV1 = ContractRouterClient<IdentityContractV1>

export const todoContractV1 = {
  v1: {
    operational: operationalHealthContractFragmentV1,
    todos: {
      list: oc.input(TodoListInputSchemaV1).output(z.array(TodoResourceSchemaV1)),
      create: oc.input(TodoCreateInputSchemaV1).output(TodoResourceSchemaV1),
      complete: oc.input(TodoByIdInputSchemaV1).output(TodoResourceSchemaV1),
      reopen: oc.input(TodoByIdInputSchemaV1).output(TodoResourceSchemaV1),
      rename: oc.input(TodoRenameInputSchemaV1).output(TodoResourceSchemaV1),
    },
  },
}

export type TodoContractV1 = typeof todoContractV1
export type TodoContractClientV1 = ContractRouterClient<TodoContractV1>
