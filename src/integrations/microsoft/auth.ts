import {
  BrowserCacheLocation,
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser';
import { microsoftScopes, validateAuthConfig } from './config';
import type { Microsoft365Config, MicrosoftAccount } from './types';

export interface AccessTokenProvider {
  getAccessToken(scopes?: string[]): Promise<string>;
}

export class MicrosoftAuth implements AccessTokenProvider {
  private app?: PublicClientApplication;
  private account?: AccountInfo;

  constructor(private readonly config: Microsoft365Config) {}

  private async client() {
    const errors = validateAuthConfig(this.config);
    if (errors.length) throw new Error(errors.join(' '));
    if (!this.app) {
      this.app = new PublicClientApplication({
        auth: {
          clientId: this.config.clientId,
          authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
          redirectUri: this.config.redirectUri,
          postLogoutRedirectUri: this.config.redirectUri,
        },
        cache: { cacheLocation: BrowserCacheLocation.SessionStorage },
        system: { allowPlatformBroker: false },
      });
      await this.app.initialize();
      const redirect = await this.app.handleRedirectPromise();
      this.account = redirect?.account ?? this.app.getAllAccounts()[0];
    }
    return this.app;
  }

  async signIn(): Promise<MicrosoftAccount> {
    const client = await this.client();
    const result = await client.loginPopup({ scopes: microsoftScopes, prompt: 'select_account' });
    this.account = result.account;
    return toAccount(result.account);
  }

  async currentAccount(): Promise<MicrosoftAccount | undefined> {
    const client = await this.client();
    this.account ??= client.getAllAccounts()[0];
    return this.account ? toAccount(this.account) : undefined;
  }

  async getAccessToken(scopes = microsoftScopes) {
    const client = await this.client();
    this.account ??= client.getAllAccounts()[0];
    if (!this.account) throw new Error('Die Microsoft-Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
    try {
      return (await client.acquireTokenSilent({ account: this.account, scopes })).accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError)
        throw new Error('Die Microsoft-Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
      throw error;
    }
  }

  async signOut() {
    const client = await this.client();
    const account = this.account ?? client.getAllAccounts()[0];
    if (account) await client.logoutPopup({ account, postLogoutRedirectUri: this.config.redirectUri });
    this.account = undefined;
  }
}

function toAccount(account: AccountInfo): MicrosoftAccount {
  return {
    id: account.homeAccountId,
    name: account.name || account.username,
    username: account.username,
    tenantId: account.tenantId,
  };
}
