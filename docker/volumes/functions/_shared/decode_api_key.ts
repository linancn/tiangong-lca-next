export interface Credentials {
  email: string;
  password: string;
}

function decodeApiKey(apiKey: string): Credentials | null {
  if (!apiKey) return null;

  try {
    const jsonString = atob(apiKey);
    const credentials = JSON.parse(jsonString) as Credentials;

    if (!credentials.email || !credentials.password) {
      return null;
    }

    return credentials as Credentials;
  } catch (_error) {
    return null;
  }
}

export default decodeApiKey;
