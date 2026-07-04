import type { IdentityTokenIssueInputV1, IdentityTokenIssueOutputV1, UserReferenceResourceV1 } from '@megiddo/contracts'
import type { IdentityTokenSigner } from '@megiddo/platform'

export interface AuthProviderAdapter {
  resolveDevelopmentUser(subject?: string): Promise<UserReferenceResourceV1>
}

export interface IdentityUseCases {
  issueDevelopmentIdentityToken(input: IdentityTokenIssueInputV1): Promise<IdentityTokenIssueOutputV1>
}

export const createDevelopmentAuthProviderAdapter = (): AuthProviderAdapter => ({
  async resolveDevelopmentUser(subject = 'dev:viewer') {
    return { id: subject }
  },
})

export const createIdentityUseCases = ({
  authProvider,
  tokenSigner,
}: {
  authProvider: AuthProviderAdapter
  tokenSigner: IdentityTokenSigner
}): IdentityUseCases => ({
  async issueDevelopmentIdentityToken(input) {
    const user = await authProvider.resolveDevelopmentUser(input.subject)
    const identityToken = await tokenSigner.issueIdentityToken({
      audience: input.audience,
      contractVersion: input.contractVersion,
      subject: user.id,
    })

    return { identityToken, user }
  },
})
