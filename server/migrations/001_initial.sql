CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, name text NOT NULL,
 password_hash text NOT NULL, role text NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','manager','member','observer','guest')),
 mfa_enabled boolean NOT NULL DEFAULT false, totp_secret text, totp_last_step bigint NOT NULL DEFAULT -1,
 recovery_hashes jsonb NOT NULL DEFAULT '[]', disabled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE settings (key text PRIMARY KEY, value jsonb NOT NULL);
INSERT INTO settings VALUES ('organization','{"name":"Forgeboard","require_mfa":false}');
CREATE TABLE sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text UNIQUE NOT NULL, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, mfa_verified boolean NOT NULL DEFAULT false, user_agent text, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE auth_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text UNIQUE NOT NULL, kind text NOT NULL, email text NOT NULL, role text NOT NULL DEFAULT 'member', project_id uuid, expires_at timestamptz NOT NULL, used_at timestamptz);
CREATE TABLE projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, key text UNIQUE NOT NULL CHECK(key ~ '^[A-Z][A-Z0-9]{1,9}$'), description text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#7c6cf2', owner_id uuid NOT NULL REFERENCES users(id), parent_id uuid REFERENCES projects(id), next_number integer NOT NULL DEFAULT 1, archived boolean NOT NULL DEFAULT false, settings jsonb NOT NULL DEFAULT '{}', budget numeric(14,2), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE project_members (project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'member', PRIMARY KEY(project_id,user_id));
CREATE TABLE sprints (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES projects(id),name text NOT NULL,state text NOT NULL DEFAULT 'planned' CHECK(state IN ('planned','active','closed')), start_date date,end_date date,goal text NOT NULL DEFAULT '', baseline jsonb NOT NULL DEFAULT '[]', started_at timestamptz,closed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX one_active_sprint ON sprints(project_id) WHERE state='active';
CREATE TABLE tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES projects(id), key text UNIQUE NOT NULL, title text NOT NULL CHECK(length(title)>0), description text NOT NULL DEFAULT '',
 type text NOT NULL DEFAULT 'task' CHECK(type IN ('epic','feature','story','task','bug','subtask')), status text NOT NULL DEFAULT 'backlog', priority text NOT NULL DEFAULT 'medium',
 assignee_id uuid REFERENCES users(id), author_id uuid NOT NULL REFERENCES users(id), sprint_id uuid REFERENCES sprints(id),parent_id uuid REFERENCES tasks(id),
 labels jsonb NOT NULL DEFAULT '[]', custom_fields jsonb NOT NULL DEFAULT '{}', story_points numeric(8,2), estimate_minutes integer, start_date date, due_date date, position numeric NOT NULL DEFAULT 0,
 version integer NOT NULL DEFAULT 1, archived boolean NOT NULL DEFAULT false, deleted_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_project_status ON tasks(project_id,status) WHERE deleted_at IS NULL;
CREATE INDEX tasks_sprint ON tasks(sprint_id);
CREATE INDEX tasks_search ON tasks USING gin(to_tsvector('simple',title || ' ' || description));
CREATE TABLE task_links (source_id uuid REFERENCES tasks(id), target_id uuid REFERENCES tasks(id), kind text NOT NULL,PRIMARY KEY(source_id,target_id,kind),CHECK(source_id<>target_id));
CREATE TABLE comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL REFERENCES tasks(id),author_id uuid NOT NULL REFERENCES users(id),body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE events (id bigserial PRIMARY KEY,project_id uuid REFERENCES projects(id),task_id uuid REFERENCES tasks(id),sprint_id uuid REFERENCES sprints(id),actor_id uuid REFERENCES users(id),kind text NOT NULL,data jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX events_project_time ON events(project_id,created_at);
CREATE TABLE audit (id bigserial PRIMARY KEY,actor_id uuid REFERENCES users(id),action text NOT NULL,object_id text,data jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE pages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES projects(id),parent_id uuid REFERENCES pages(id),title text NOT NULL,body text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1,author_id uuid NOT NULL REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE page_versions (page_id uuid REFERENCES pages(id),version integer NOT NULL,title text NOT NULL,body text NOT NULL,author_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(page_id,version));
CREATE TABLE time_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES projects(id),task_id uuid REFERENCES tasks(id),user_id uuid NOT NULL REFERENCES users(id),minutes integer NOT NULL CHECK(minutes>0 AND minutes<=1440),entry_date date NOT NULL,description text NOT NULL DEFAULT '',approved boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE integrations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES projects(id),kind text NOT NULL DEFAULT 'gitlab',name text NOT NULL,base_url text NOT NULL,secret_encrypted text NOT NULL,webhook_secret_hash text,config jsonb NOT NULL DEFAULT '{}',status text NOT NULL DEFAULT 'unconfigured',last_error text,last_sync_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE development_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),integration_id uuid NOT NULL REFERENCES integrations(id),task_id uuid REFERENCES tasks(id),external_id text NOT NULL,kind text NOT NULL,title text NOT NULL DEFAULT '',url text NOT NULL DEFAULT '',state text,external_updated_at timestamptz,data jsonb NOT NULL DEFAULT '{}',UNIQUE(integration_id,kind,external_id));
CREATE TABLE webhook_receipts (integration_id uuid NOT NULL REFERENCES integrations(id),delivery_id text NOT NULL,payload_hash text NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(integration_id,delivery_id));
CREATE TABLE jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL,payload jsonb NOT NULL,attempts integer NOT NULL DEFAULT 0,state text NOT NULL DEFAULT 'pending',run_at timestamptz NOT NULL DEFAULT now(),locked_at timestamptz,last_error text,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX jobs_due ON jobs(run_at) WHERE state='pending';
CREATE TABLE automation_rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES projects(id),name text NOT NULL,event text NOT NULL,conditions jsonb NOT NULL DEFAULT '{}',actions jsonb NOT NULL DEFAULT '[]',enabled boolean NOT NULL DEFAULT false);
CREATE TABLE automation_runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),rule_id uuid REFERENCES automation_rules(id),event_id bigint REFERENCES events(id),dry_run boolean NOT NULL DEFAULT false,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(rule_id,event_id));
