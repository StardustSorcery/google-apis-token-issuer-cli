export interface Config {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  accessType: string;
  includeGrantedScopes: boolean;
  port: number;
}
