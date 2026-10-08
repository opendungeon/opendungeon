import { getConfiguration, updateConfiguration } from "#lib/server/database/configuration.js";

class Configuration {
  private _isUserCreationEnabled: boolean;

  constructor() {
    this._isUserCreationEnabled = true;
  }

  async init() {
    const stored = await getConfiguration();
    this._isUserCreationEnabled = stored.is_user_creation_enabled;
  }

  get isUserCreationEnabled(): boolean {
    return this._isUserCreationEnabled;
  }

  set isUserCreationEnabled(value: boolean) {
    this._isUserCreationEnabled = value;
    updateConfiguration({ is_user_creation_enabled: value });
  }

  serialize() {
    return { isUserCreationEnabled: this._isUserCreationEnabled };
  }
}

export const configuration = new Configuration();
