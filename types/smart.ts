import type { Database, Json } from './supabase-live';
export type SmartConnection = {
  id:string; organization_id:string; vendor:string; enabled:boolean; issuer:string;
  authorization_endpoint:string; token_endpoint:string; oidc_issuer:string; jwks_uri:string;
  client_id:string; client_auth_method:'none'|'client_secret_basic'|'client_secret_post'; scopes:string[];
  created_at:string; updated_at:string;
};
export type SmartLaunch = {
  id:string; organization_id:string; connection_id:string; state_hash:string; browser_hash:string;
  encrypted_payload:string; connection_version:string; expires_at:string; consumed_at:string|null; created_at:string; updated_at:string;
};
export type SmartSession = {
  id:string; organization_id:string; connection_id:string; launch_id:string; session_hash:string;
  encrypted_payload:string; expires_at:string; revoked_at:string|null; created_at:string; updated_at:string;
};
type Table<Row,Insert>={Row:Row;Insert:Insert;Update:Partial<Row>;Relationships:[]};
type LaunchInsert=Omit<SmartLaunch,'consumed_at'|'updated_at'>;
export type SmartDatabase = { public: Omit<Database['public'],'Tables'|'Functions'> & {
  Tables: Database['public']['Tables'] & {
    smart_connections:Table<SmartConnection,Omit<SmartConnection,'id'|'created_at'|'updated_at'>&{id?:string}>;
    smart_launch_sessions:Table<SmartLaunch,LaunchInsert>;
    smart_sessions:Table<SmartSession,Omit<SmartSession,'id'|'created_at'|'updated_at'|'revoked_at'>>;
  };
  Functions:Database['public']['Functions'] & {
    smart_claim_launch:{Args:{p_state_hash:string;p_browser_hash:string};Returns:Json};
    smart_complete_callback:{Args:{p_launch_id:string;p_session_hash:string;p_encrypted_payload:string;p_expires_at:string};Returns:string};
  };
} };
