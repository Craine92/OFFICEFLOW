import { create } from 'zustand';
import { DemoDataProvider } from '../../data/provider';
import { configureDataProvider, useOfficeStore } from '../../store/useOfficeStore';
import { MicrosoftAuth } from './auth';
import { readMicrosoftConfig, saveMicrosoftConfig, validateAuthConfig, validateDataConfig } from './config';
import { GraphClient, SharePointGraphGateway } from './graph';
import { MicrosoftGraphDataProvider } from './provider';
import type {
  GraphConnectionReport,
  Microsoft365Config,
  MicrosoftAccount,
  MicrosoftConnectionStatus,
} from './types';

interface MicrosoftIntegrationState {
  mode: 'demo' | 'microsoft-graph';
  status: MicrosoftConnectionStatus;
  config: Microsoft365Config;
  account?: MicrosoftAccount;
  report?: GraphConnectionReport;
  error?: string;
  setConfig: (config: Microsoft365Config) => void;
  signIn: () => Promise<void>;
  activate: () => Promise<void>;
  useDemo: (signOut?: boolean) => Promise<void>;
}

let auth: MicrosoftAuth | undefined;

export const useMicrosoftIntegration = create<MicrosoftIntegrationState>((set, get) => {
  const config = readMicrosoftConfig();
  return {
    mode: 'demo',
    status: validateAuthConfig(config).length ? 'unconfigured' : 'disconnected',
    config,
    setConfig: (next) => {
      saveMicrosoftConfig(next);
      const current = get().config;
      const authenticationChanged =
        current.tenantId !== next.tenantId ||
        current.clientId !== next.clientId ||
        current.redirectUri !== next.redirectUri;
      if (authenticationChanged) {
        auth = undefined;
        set({
          config: next,
          status: validateAuthConfig(next).length ? 'unconfigured' : 'disconnected',
          account: undefined,
          report: undefined,
          error: undefined,
        });
      } else set({ config: next, error: undefined });
    },
    signIn: async () => {
      const errors = validateAuthConfig(get().config);
      if (errors.length) {
        set({ status: 'unconfigured', error: errors.join(' ') });
        throw new Error(errors.join(' '));
      }
      set({ status: 'authenticating', error: undefined });
      try {
        auth = new MicrosoftAuth(get().config);
        const account = await auth.signIn();
        set({ account, status: 'connected' });
      } catch (error) {
        const message = humanizeAuthError(error);
        set({ status: message.includes('abgelaufen') ? 'expired' : 'error', error: message });
        throw new Error(message);
      }
    },
    activate: async () => {
      const errors = validateDataConfig(get().config);
      if (errors.length) {
        set({ status: 'unconfigured', error: errors.join(' ') });
        throw new Error(errors.join(' '));
      }
      try {
        if (!get().account) await get().signIn();
        if (!auth) throw new Error('Bitte melden Sie sich erneut bei Microsoft an.');
        set({ status: 'loading', error: undefined });
        const gateway = new SharePointGraphGateway(new GraphClient(auth), get().config);
        const snapshot = await gateway.loadWorkspace();
        const provider = new MicrosoftGraphDataProvider(gateway);
        provider.prime(snapshot);
        configureDataProvider(provider);
        await useOfficeStore.getState().initialize();
        if (useOfficeStore.getState().error) throw new Error(useOfficeStore.getState().error!);
        set({ mode: 'microsoft-graph', status: 'ready', report: snapshot.report });
      } catch (error) {
        const message = (error as Error).message;
        configureDataProvider(new DemoDataProvider());
        await useOfficeStore.getState().initialize();
        set({ mode: 'demo', status: message.includes('abgelaufen') ? 'expired' : 'error', error: message });
        throw new Error(message);
      }
    },
    useDemo: async (signOut = false) => {
      if (signOut && auth) {
        try {
          await auth.signOut();
        } catch {
          // Der lokale Modus darf auch bei einem fehlgeschlagenen Remote-Logout erreichbar bleiben.
        }
      }
      auth = undefined;
      configureDataProvider(new DemoDataProvider());
      await useOfficeStore.getState().initialize();
      set({
        mode: 'demo',
        status: validateAuthConfig(get().config).length ? 'unconfigured' : 'disconnected',
        account: undefined,
        report: undefined,
        error: undefined,
      });
    },
  };
});

function humanizeAuthError(error: unknown) {
  const value = error as { errorCode?: string; message?: string };
  if (value.errorCode === 'user_cancelled') return 'Die Microsoft-Anmeldung wurde abgebrochen.';
  if (value.errorCode === 'popup_window_error')
    return 'Das Anmeldefenster konnte nicht geöffnet werden. Bitte erlauben Sie Pop-ups für OFFICEFLOW.';
  return value.message || 'Die Microsoft-Anmeldung ist fehlgeschlagen.';
}
