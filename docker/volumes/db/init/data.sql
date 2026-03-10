--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Debian 17.9-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: pgmq; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA pgmq;


ALTER SCHEMA pgmq OWNER TO postgres;

--
-- Name: pgroonga; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgroonga WITH SCHEMA extensions;


--
-- Name: EXTENSION pgroonga; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgroonga IS 'Super fast and all languages supported full text search index based on Groonga';


--
-- Name: pgsodium; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA pgsodium;


ALTER SCHEMA pgsodium OWNER TO supabase_admin;

--
-- Name: pgsodium; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA pgsodium;


--
-- Name: EXTENSION pgsodium; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgsodium IS 'Pgsodium is a modern cryptography library for Postgres.';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: supabase_functions; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA supabase_functions;


ALTER SCHEMA supabase_functions OWNER TO supabase_admin;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: util; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA util;


ALTER SCHEMA util OWNER TO postgres;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA extensions;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


--
-- Name: http; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;


--
-- Name: EXTENSION http; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION http IS 'HTTP client for PostgreSQL, allows web page retrieval inside the database.';


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: pgmq; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgmq WITH SCHEMA pgmq;


--
-- Name: EXTENSION pgmq; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgmq IS 'A lightweight message queue. Like AWS SQS and RSMQ but on Postgres.';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: filtered_row; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.filtered_row AS (
	id uuid,
	embedding extensions.vector(1536)
);


ALTER TYPE public.filtered_row OWNER TO postgres;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: postgres
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO postgres;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: postgres
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: postgres
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO postgres;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: postgres
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: _navicat_temp_stored_proc(text, extensions.vector, text, double precision, integer, numeric, numeric, numeric, integer, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding extensions.vector, filter_condition text DEFAULT ''::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20, full_text_weight numeric DEFAULT 0.3, extracted_text_weight numeric DEFAULT 0.2, semantic_weight numeric DEFAULT 0.5, rrf_k integer DEFAULT 10, data_source text DEFAULT 'tg'::text, this_user_id text DEFAULT ''::text, page_size integer DEFAULT 10, page_current integer DEFAULT 1) RETURNS TABLE(id uuid, "json" jsonb)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$ BEGIN
		RETURN QUERY WITH 
		full_text AS (
			SELECT
				ps.RANK AS ps_rank,
				ps.ID AS ps_id,
				ps.JSON AS ps_json 
			FROM
				pgroonga_search_processes ( query_text, filter_condition, 20, -- page_size: 获取足够多候选
					1, -- page_current: 第1页
				data_source, this_user_id ) ps 
		),
		ex_text AS (
    SELECT
      ex.rank AS ex_rank,
      ex.id   AS ex_id,
      p.json  AS ex_json
    FROM pgroonga_search_processes_text(
           query_text,
           20,          -- page_size
           1,      -- page_current
           data_source,
           this_user_id
         ) ex
    JOIN public.processes p ON p.id = ex.id
  ),
		semantic AS (
			SELECT
				ss.RANK AS ss_rank,
				ss.ID AS ss_id,
				ss.JSON AS ss_json 
			FROM
				semantic_search_processes ( query_embedding, filter_condition, match_threshold, match_count, data_source, this_user_id ) ss 
		) SELECT COALESCE
		( full_text.ps_id, semantic.ss_id, ex_text.ex_id ) AS ID,
		COALESCE ( full_text.ps_json, semantic.ss_json, ex_text.ex_json) AS JSON, 
		COALESCE(1.0 / (rrf_k + full_text.ps_rank), 0.0) * full_text_weight
      + COALESCE(1.0 / (rrf_k + ex_text.ex_rank), 0.0) * text_weight
      + COALESCE(1.0 / (rrf_k + semantic.ss_rank), 0.0) * semantic_weight
      AS score
		FROM
			full_text
			FULL OUTER JOIN semantic ON full_text.ps_id = semantic.ss_id
			FULL OUTER JOIN ex_text ON ex_text.ex_id = COALESCE(full_text.ps_id, semantic.ss_id) 
		ORDER BY
			score DESC 
			LIMIT page_size OFFSET ( page_current - 1 ) * page_size;
		
	END;
$$;


ALTER FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding extensions.vector, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer) OWNER TO postgres;

--
-- Name: _navicat_temp_stored_proc(text, text, text, double precision, integer, numeric, numeric, numeric, integer, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding text, filter_condition text DEFAULT ''::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20, full_text_weight numeric DEFAULT 0.3, extracted_text_weight numeric DEFAULT 0.2, semantic_weight numeric DEFAULT 0.5, rrf_k integer DEFAULT 10, data_source text DEFAULT 'tg'::text, this_user_id text DEFAULT ''::text, page_size integer DEFAULT 10, page_current integer DEFAULT 1) RETURNS TABLE(id uuid, "json" jsonb)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$ BEGIN
		RETURN QUERY WITH 
		full_text AS (
			SELECT
				ps.RANK AS ps_rank,
				ps.ID AS ps_id,
				ps.JSON AS ps_json 
			FROM
				pgroonga_search_processes ( query_text, filter_condition, 20, -- page_size: 获取足够多候选
					1, -- page_current: 第1页
				data_source, this_user_id ) ps 
		),
		ex_text AS (
    SELECT
      ex.rank AS ex_rank,
      ex.id   AS ex_id,
      p.json  AS ex_json
    FROM pgroonga_search_processes_text(
           query_text,
           20,          -- page_size
           1,      -- page_current
           data_source,
           this_user_id
         ) ex
    JOIN public.processes p ON p.id = ex.id
  ),
		semantic AS (
			SELECT
				ss.RANK AS ss_rank,
				ss.ID AS ss_id,
				ss.JSON AS ss_json 
			FROM
				semantic_search_processes ( query_embedding, filter_condition, match_threshold, match_count, data_source, this_user_id ) ss 
		) SELECT COALESCE
		( full_text.ps_id, semantic.ss_id, ex_text.ex_id ) AS ID,
		COALESCE ( full_text.ps_json, semantic.ss_json, ex_text.ex_json) AS JSON, 
		COALESCE(1.0 / (rrf_k + full_text.ps_rank), 0.0) * full_text_weight
      + COALESCE(1.0 / (rrf_k + ex_text.ex_rank), 0.0) * text_weight
      + COALESCE(1.0 / (rrf_k + semantic.ss_rank), 0.0) * semantic_weight
      AS score
		FROM
			full_text
			FULL OUTER JOIN semantic ON full_text.ps_id = semantic.ss_id
			FULL OUTER JOIN ex_text ON ex_text.ex_id = COALESCE(full_text.ps_id, semantic.ss_id) 
		ORDER BY
			score DESC 
			LIMIT page_size OFFSET ( page_current - 1 ) * page_size;
		
	END;
$$;


ALTER FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer) OWNER TO postgres;

--
-- Name: contacts_sync_jsonb_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.contacts_sync_jsonb_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version := COALESCE(
            NEW.json->'contactDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion', 
            ''
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.contacts_sync_jsonb_version() OWNER TO postgres;

--
-- Name: flowproperties_sync_jsonb_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.flowproperties_sync_jsonb_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version := COALESCE( NEW.json->'flowPropertyDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion',
					''
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.flowproperties_sync_jsonb_version() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: flows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flows (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    json_ordered json,
    user_id uuid DEFAULT auth.uid(),
    state_code integer DEFAULT 0,
    version character(9) NOT NULL,
    modified_at timestamp with time zone DEFAULT now(),
    embedding extensions.halfvec(384),
    embedding_at timestamp(6) with time zone DEFAULT NULL::timestamp with time zone,
    extracted_text text,
    team_id uuid,
    review_id uuid,
    rule_verification boolean,
    reviews jsonb,
    embedding_flag smallint,
    embedding_ft_at timestamp with time zone,
    extracted_md text,
    embedding_ft extensions.vector(1024)
);


ALTER TABLE public.flows OWNER TO postgres;

--
-- Name: flows_embedding_ft_input(public.flows); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.flows_embedding_ft_input(proc public.flows) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
begin
  return proc.extracted_md;
end;
$$;


ALTER FUNCTION public.flows_embedding_ft_input(proc public.flows) OWNER TO postgres;

--
-- Name: flows_embedding_input(public.flows); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.flows_embedding_input(flow public.flows) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
begin
  return flow.extracted_text;
end;
$$;


ALTER FUNCTION public.flows_embedding_input(flow public.flows) OWNER TO postgres;

--
-- Name: flows_sync_jsonb_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.flows_sync_jsonb_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
		NEW.version := COALESCE( NEW.json->'flowDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion',
					''
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.flows_sync_jsonb_version() OWNER TO postgres;

--
-- Name: generate_flow_embedding(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_flow_embedding() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  SELECT embedding, extracted_text INTO NEW.embedding, NEW.extracted_text
  FROM supabase_functions.http_request(
    'https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/flow_embedding',
    'POST',
    '{"Content-Type":"application/json","x_key":"edge-functions-key","x-region":"us-east-1"}',
    to_json(NEW.json_ordered)::text,
    '1000'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_flow_embedding() OWNER TO postgres;

--
-- Name: hybrid_search_flows(text, text, text, double precision, integer, double precision, double precision, double precision, integer, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.hybrid_search_flows(query_text text, query_embedding text, filter_condition text DEFAULT ''::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20, full_text_weight double precision DEFAULT 0.3, extracted_text_weight double precision DEFAULT 0.2, semantic_weight double precision DEFAULT 0.5, rrf_k integer DEFAULT 10, data_source text DEFAULT 'tg'::text, page_size integer DEFAULT 10, page_current integer DEFAULT 1) RETURNS TABLE(id uuid, "json" jsonb, version character, modified_at timestamp with time zone)
    LANGUAGE plpgsql
    SET statement_timeout TO '60s'
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
 BEGIN
		RETURN QUERY WITH full_text AS (
			SELECT
				ps.RANK AS ps_rank,
				ps.ID AS ps_id,
				ps.JSON AS ps_json 
			FROM
				pgroonga_search_flows_v1 ( query_text, filter_condition, '', 20, -- page_size: 获取足够多候选
					1, -- page_current: 第1页
				data_source ) ps 
		),
		ex_text AS (
			SELECT
				ex.RANK AS ex_rank,
				ex.ID AS ex_id,
				P.JSON AS ex_json 
			FROM
				pgroonga_search_flows_text_v1 ( query_text, 20, -- page_size
					1, -- page_current
				data_source ) ex
				JOIN PUBLIC.flows P ON P.ID = ex.ID 
		),
		semantic AS (
			SELECT
				ss.RANK AS ss_rank,
				ss.ID AS ss_id,
				ss.JSON AS ss_json 
			FROM
				semantic_search_flows_v1 ( query_embedding, filter_condition, match_threshold, match_count, data_source ) ss 
		), 
		fused_raw as (
		SELECT 
			COALESCE ( full_text.ps_id, semantic.ss_id, ex_text.ex_id ) AS ID,
			COALESCE ( full_text.ps_json, semantic.ss_json, ex_text.ex_json ) AS JSON,
			COALESCE ( 1.0 / ( rrf_k + full_text.ps_rank ), 0.0 ) * full_text_weight
			+ COALESCE ( 1.0 / ( rrf_k + ex_text.ex_rank ), 0.0 ) * extracted_text_weight
			+ COALESCE ( 1.0 / ( rrf_k + semantic.ss_rank ), 0.0 ) * semantic_weight AS score 
		FROM
			full_text
			FULL OUTER JOIN semantic ON full_text.ps_id = semantic.ss_id
			FULL OUTER JOIN ex_text ON ex_text.ex_id = COALESCE ( full_text.ps_id, semantic.ss_id ) 
		),
		fused AS (
			SELECT
				fr.id AS fid,
				SUM(fr.score) AS score
			FROM fused_raw fr
			WHERE fr.id IS NOT NULL
			GROUP BY fr.id
		)
		SELECT
			f.fid AS id,
			fl.json,
			fl.version,
			fl.modified_at
		FROM fused f
		JOIN LATERAL (
			SELECT fl.json, fl.version, fl.modified_at
			FROM public.flows fl
			WHERE fl.id = f.fid
			ORDER BY fl.modified_at DESC
			LIMIT 1
		) fl ON true
		ORDER BY f.score DESC
		LIMIT page_size OFFSET ( page_current - 1 ) * page_size;
		
	END;
$$;


ALTER FUNCTION public.hybrid_search_flows(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) OWNER TO postgres;

--
-- Name: hybrid_search_lifecyclemodels(text, text, text, double precision, integer, double precision, double precision, double precision, integer, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.hybrid_search_lifecyclemodels(query_text text, query_embedding text, filter_condition text DEFAULT ''::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20, full_text_weight double precision DEFAULT 0.3, extracted_text_weight double precision DEFAULT 0.2, semantic_weight double precision DEFAULT 0.5, rrf_k integer DEFAULT 10, data_source text DEFAULT 'tg'::text, page_size integer DEFAULT 10, page_current integer DEFAULT 1) RETURNS TABLE(id uuid, "json" jsonb, version character, modified_at timestamp with time zone)
    LANGUAGE plpgsql
    SET statement_timeout TO '60s'
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
 BEGIN
		RETURN QUERY WITH full_text AS (
			SELECT
				ps.RANK AS ps_rank,
				ps.ID AS ps_id,
				ps.JSON AS ps_json
			FROM
			 	-- page_size: 获取足够多候选， page_current: 第1页
				pgroonga_search_lifecyclemodels_v1 ( query_text, filter_condition, '', 20, 1, data_source ) ps 
		),
		ex_text AS (
			SELECT
				ex.RANK AS ex_rank,
				ex.ID AS ex_id,
				P.JSON AS ex_json
			FROM
				pgroonga_search_lifecyclemodels_text_v1( query_text, 20, 1, data_source ) ex
				JOIN PUBLIC.lifecyclemodels P ON P.ID = ex.ID 
		),
		semantic AS (
			SELECT
				ss.RANK AS ss_rank,
				ss.ID AS ss_id,
				ss.JSON AS ss_json
			FROM
				semantic_search_lifecyclemodels_v1 ( query_embedding, filter_condition, match_threshold, match_count, data_source ) ss 
		), 
		fused_raw as (
		SELECT 
			COALESCE ( full_text.ps_id, semantic.ss_id, ex_text.ex_id ) AS ID,
			COALESCE ( full_text.ps_json, semantic.ss_json, ex_text.ex_json ) AS JSON,
			COALESCE ( 1.0 / ( rrf_k + full_text.ps_rank ), 0.0 ) * full_text_weight + COALESCE ( 1.0 / ( rrf_k + ex_text.ex_rank ), 0.0 ) * extracted_text_weight + COALESCE ( 1.0 / ( rrf_k + semantic.ss_rank ), 0.0 ) * semantic_weight AS score 
		FROM
			full_text
			FULL OUTER JOIN semantic ON full_text.ps_id = semantic.ss_id
			FULL OUTER JOIN ex_text ON ex_text.ex_id = COALESCE ( full_text.ps_id, semantic.ss_id ) 
		),
		fused AS (
			SELECT
				fr.id AS pid,
				SUM(fr.score) AS score
				-- 如果你不希望“多路径叠加加分”，把 SUM 改成 MAX
			FROM fused_raw fr
			WHERE fr.id IS NOT NULL
			GROUP BY fr.id
		)
		SELECT
			f.pid AS id,
			p.json,
			p.version,
			p.modified_at
		FROM fused f
		JOIN LATERAL (
			SELECT p.json, p.version, p.modified_at
			FROM public.lifecyclemodels p
			WHERE p.id = f.pid
			ORDER BY p.modified_at DESC
			LIMIT 1
		) p ON true
		ORDER BY f.score DESC
		LIMIT page_size OFFSET ( page_current - 1 ) * page_size;
		
	END;
$$;


ALTER FUNCTION public.hybrid_search_lifecyclemodels(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) OWNER TO postgres;

--
-- Name: hybrid_search_processes(text, text, text, double precision, integer, double precision, double precision, double precision, integer, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.hybrid_search_processes(query_text text, query_embedding text, filter_condition text DEFAULT ''::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20, full_text_weight double precision DEFAULT 0.3, extracted_text_weight double precision DEFAULT 0.2, semantic_weight double precision DEFAULT 0.5, rrf_k integer DEFAULT 10, data_source text DEFAULT 'tg'::text, page_size integer DEFAULT 10, page_current integer DEFAULT 1) RETURNS TABLE(id uuid, "json" jsonb, version character, modified_at timestamp with time zone, model_id uuid)
    LANGUAGE plpgsql
    SET statement_timeout TO '60s'
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
 BEGIN
		RETURN QUERY WITH full_text AS (
			SELECT
				ps.RANK AS ps_rank,
				ps.ID AS ps_id,
				ps.JSON AS ps_json
			FROM
			 	-- page_size: 获取足够多候选， page_current: 第1页
				pgroonga_search_processes_v1 ( query_text, filter_condition, '', 20, 1, data_source ) ps 
		),
		ex_text AS (
			SELECT
				ex.RANK AS ex_rank,
				ex.ID AS ex_id,
				P.JSON AS ex_json
			FROM
				pgroonga_search_processes_text_v1( query_text, 20, 1, data_source ) ex
				JOIN PUBLIC.processes P ON P.ID = ex.ID 
		),
		semantic AS (
			SELECT
				ss.RANK AS ss_rank,
				ss.ID AS ss_id,
				ss.JSON AS ss_json
			FROM
				semantic_search_processes_v1 ( query_embedding, filter_condition, match_threshold, match_count, data_source ) ss 
		), 
		fused_raw as (
		SELECT 
			COALESCE ( full_text.ps_id, semantic.ss_id, ex_text.ex_id ) AS ID,
			COALESCE ( full_text.ps_json, semantic.ss_json, ex_text.ex_json ) AS JSON,
			COALESCE ( 1.0 / ( rrf_k + full_text.ps_rank ), 0.0 ) * full_text_weight + COALESCE ( 1.0 / ( rrf_k + ex_text.ex_rank ), 0.0 ) * extracted_text_weight + COALESCE ( 1.0 / ( rrf_k + semantic.ss_rank ), 0.0 ) * semantic_weight AS score 
		FROM
			full_text
			FULL OUTER JOIN semantic ON full_text.ps_id = semantic.ss_id
			FULL OUTER JOIN ex_text ON ex_text.ex_id = COALESCE ( full_text.ps_id, semantic.ss_id ) 
		),
		fused AS (
			SELECT
				fr.id AS pid,
				SUM(fr.score) AS score
				-- 如果你不希望“多路径叠加加分”，把 SUM 改成 MAX
			FROM fused_raw fr
			WHERE fr.id IS NOT NULL
			GROUP BY fr.id
		)
		SELECT
			f.pid AS id,
			p.json,
			p.version,
			p.modified_at,
			p.model_id
		FROM fused f
		JOIN LATERAL (
			SELECT p.json, p.version, p.modified_at, p.model_id
			FROM public.processes p
			WHERE p.id = f.pid
			ORDER BY p.modified_at DESC
			LIMIT 1
		) p ON true
		ORDER BY f.score DESC
		LIMIT page_size OFFSET ( page_current - 1 ) * page_size;
		
	END;
$$;


ALTER FUNCTION public.hybrid_search_processes(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) OWNER TO postgres;

--
-- Name: ilcd_classification_get(text, text, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ilcd_classification_get(this_file_name text, category_type text, get_values text[]) RETURNS SETOF jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT cgs2.cg
  FROM (
  select 
		cgs1.file_name,
	  cgs1.cg->>'@dataType' as cg_type,
      jsonb_array_elements(cgs1.cg -> 'category') AS cg
from
(
    SELECT
      ilcd.file_name,
      jsonb_array_elements(ilcd.json -> 'CategorySystem' -> 'categories') AS cg
    FROM
      ilcd
    WHERE ilcd.file_name = this_file_name
	) as cgs1
	where cgs1.cg->>'@dataType' = category_type
	  ) as cgs2
	  WHERE cgs2.cg->>'@name' = ANY(get_values) or cgs2.cg->>'@id' = ANY(get_values) or 'all' = ANY(get_values)
	;
END;
$$;


ALTER FUNCTION public.ilcd_classification_get(this_file_name text, category_type text, get_values text[]) OWNER TO postgres;

--
-- Name: ilcd_flow_categorization_get(text, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ilcd_flow_categorization_get(this_file_name text, get_values text[]) RETURNS SETOF jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT cg
  FROM (
    SELECT
      ilcd.file_name,
      jsonb_array_elements(ilcd.json -> 'CategorySystem' -> 'categories' -> 'category') AS cg
    FROM
      ilcd
    WHERE ilcd.file_name = this_file_name
  ) AS cgs
  WHERE cgs.cg->>'@name' = ANY(get_values)  or cgs.cg->>'@id' = ANY(get_values) or 'all' = ANY(get_values);
END;
$$;


ALTER FUNCTION public.ilcd_flow_categorization_get(this_file_name text, get_values text[]) OWNER TO postgres;

--
-- Name: ilcd_location_get(text, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ilcd_location_get(this_file_name text, get_values text[]) RETURNS SETOF jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT lc
  FROM (
    SELECT
      ilcd.file_name,
      jsonb_array_elements(ilcd.json -> 'ILCDLocations' -> 'location') AS lc
    FROM
      ilcd
    WHERE ilcd.file_name = this_file_name
  ) AS lcs
  WHERE lcs.lc->>'@value' = ANY(get_values);
END;
$$;


ALTER FUNCTION public.ilcd_location_get(this_file_name text, get_values text[]) OWNER TO postgres;

--
-- Name: lca_enqueue_job(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lca_enqueue_job(p_queue_name text, p_message jsonb) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pgmq'
    AS $$
DECLARE
    v_msg_id bigint;
BEGIN
    IF p_queue_name IS NULL OR btrim(p_queue_name) = '' THEN
        RAISE EXCEPTION 'queue name is required';
    END IF;

    SELECT pgmq.send(p_queue_name, p_message)
      INTO v_msg_id;

    RETURN v_msg_id;
END;
$$;


ALTER FUNCTION public.lca_enqueue_job(p_queue_name text, p_message jsonb) OWNER TO postgres;

--
-- Name: lciamethods_sync_jsonb_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lciamethods_sync_jsonb_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version := NEW.json->'LCIAMethodDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.lciamethods_sync_jsonb_version() OWNER TO postgres;

--
-- Name: lifecyclemodels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lifecyclemodels (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp(6) with time zone DEFAULT now(),
    json_ordered json,
    user_id uuid DEFAULT auth.uid(),
    state_code integer DEFAULT 0,
    version character(9) NOT NULL,
    json_tg jsonb,
    modified_at timestamp with time zone DEFAULT now(),
    team_id uuid,
    rule_verification boolean,
    reviews jsonb,
    extracted_text text,
    embedding extensions.halfvec(384),
    embedding_at timestamp with time zone,
    embedding_flag smallint,
    extracted_md text,
    embedding_ft_at timestamp with time zone,
    embedding_ft extensions.vector(1024)
);


ALTER TABLE public.lifecyclemodels OWNER TO postgres;

--
-- Name: lifecyclemodels_embedding_ft_input(public.lifecyclemodels); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lifecyclemodels_embedding_ft_input(proc public.lifecyclemodels) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
begin
  return proc.extracted_md;
end;
$$;


ALTER FUNCTION public.lifecyclemodels_embedding_ft_input(proc public.lifecyclemodels) OWNER TO postgres;

--
-- Name: lifecyclemodels_embedding_input(public.lifecyclemodels); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lifecyclemodels_embedding_input(models public.lifecyclemodels) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
begin
  return models.extracted_text;
end;
$$;


ALTER FUNCTION public.lifecyclemodels_embedding_input(models public.lifecyclemodels) OWNER TO postgres;

--
-- Name: lifecyclemodels_sync_jsonb_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lifecyclemodels_sync_jsonb_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version := NEW.json->'lifeCycleModelDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.lifecyclemodels_sync_jsonb_version() OWNER TO postgres;

--
-- Name: pgroonga_search(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search(query_text text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
BEGIN
  RETURN QUERY
		SELECT 
			RANK () OVER (ORDER BY pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
			f.id, 
			f.json
		FROM flows f
		WHERE f.extracted_text &@~ query_text
		ORDER BY pgroonga_score(tableoid, ctid) DESC;
END;$$;


ALTER FUNCTION public.pgroonga_search(query_text text) OWNER TO postgres;

--
-- Name: pgroonga_search_contacts(text, text, bigint, bigint, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_contacts(query_text text, filter_condition text DEFAULT ''::text, page_size bigint DEFAULT 10, page_current bigint DEFAULT 1, data_source text DEFAULT 'tg'::text, this_user_id text DEFAULT ''::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    filter_condition_jsonb JSONB;
BEGIN
	filter_condition_jsonb := filter_condition::JSONB;
  RETURN QUERY
		SELECT 
			RANK () OVER (ORDER BY pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
			f.id, 
			f.json,
			f.version,
			f.modified_at,
			COUNT(*) OVER() AS total_count
		FROM contacts f
		WHERE f.json @> filter_condition_jsonb AND f.json &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'my' AND user_id::text = this_user_id))
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION public.pgroonga_search_contacts(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) OWNER TO postgres;

--
-- Name: pgroonga_search_flowproperties(text, text, bigint, bigint, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_flowproperties(query_text text, filter_condition text DEFAULT ''::text, page_size bigint DEFAULT 10, page_current bigint DEFAULT 1, data_source text DEFAULT 'tg'::text, this_user_id text DEFAULT ''::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    filter_condition_jsonb JSONB;
BEGIN
	filter_condition_jsonb := filter_condition::JSONB;
  RETURN QUERY
		SELECT 
			RANK () OVER (ORDER BY pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
			f.id, 
			f.json,
			f.version,
			f.modified_at,
			COUNT(*) OVER() AS total_count
		FROM flowproperties f
		WHERE f.json @> filter_condition_jsonb AND f.json &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'my' AND user_id::text = this_user_id))
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION public.pgroonga_search_flowproperties(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) OWNER TO postgres;

--
-- Name: pgroonga_search_flows_text_v1(text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_flows_text_v1(query_text text, page_size integer DEFAULT 10, page_current integer DEFAULT 1, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, extracted_text text, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
		SELECT 
			RANK () OVER (ORDER BY pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
			f.id, 
			f.extracted_text,
			f.version,
			f.modified_at,
			COUNT(*) OVER() AS total_count
		FROM public.flows AS f
		WHERE f.extracted_text &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'co' AND state_code = 200) or (data_source = 'my' AND user_id = auth.uid())
																			  or (data_source = 'te' and
		EXISTS ( 
						SELECT 1
						FROM roles r
						WHERE r.user_id = auth.uid() and r.team_id =  f.team_id
						AND r.role::text IN ('admin', 'member', 'owner') 
				)
			)
		)
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION public.pgroonga_search_flows_text_v1(query_text text, page_size integer, page_current integer, data_source text) OWNER TO postgres;

--
-- Name: pgroonga_search_flows_v1(text, text, text, bigint, bigint, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_flows_v1(query_text text, filter_condition text DEFAULT ''::text, order_by text DEFAULT ''::text, page_size bigint DEFAULT 10, page_current bigint DEFAULT 1, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $_$
 
DECLARE 
	filter_condition_jsonb JSONB;
	flowType TEXT;
	flowTypeArray TEXT[];
	asInput BOOLEAN;
	use_base_name_order boolean := false;
	use_common_category_order boolean := false;
	use_zh_icu_order boolean := false;
	order_by_jsonb jsonb;
	order_key text;
	order_lang text;
	order_dir text;
	order_lang_norm text;
BEGIN
	-- order_by 输入格式（标准 JSON）：{"key":"baseName","lang":"zh","order":"asc"} 或 {"key":"common:category","order":"asc"}

	filter_condition_jsonb := COALESCE(NULLIF(btrim(filter_condition), ''), '{}')::JSONB;

	flowType := NULLIF(btrim(filter_condition_jsonb->>'flowType'), '');
	IF flowType IS NOT NULL THEN
		flowTypeArray := string_to_array(flowType, ',');
	ELSE
		flowTypeArray := NULL;
	END IF;
	filter_condition_jsonb := filter_condition_jsonb - 'flowType';

	IF filter_condition_jsonb ? 'asInput' THEN
		asInput := NULLIF(btrim(filter_condition_jsonb->>'asInput'), '')::BOOLEAN;
	ELSE
		asInput := NULL;
	END IF;
	filter_condition_jsonb := filter_condition_jsonb - 'asInput';

	-- order_by 解析
	IF order_by IS NOT NULL AND btrim(order_by) <> '' THEN
		order_by_jsonb := order_by::jsonb;

		order_key := lower(COALESCE(NULLIF(btrim(order_by_jsonb->>'key'), ''), ''));
		order_lang := COALESCE(NULLIF(btrim(order_by_jsonb->>'lang'), ''), 'en');
		order_dir := lower(COALESCE(NULLIF(btrim(order_by_jsonb->>'order'), ''), 'asc'));
		IF order_dir NOT IN ('asc', 'desc') THEN
			order_dir := 'asc';
		END IF;

		use_base_name_order := (order_key = 'basename');
		use_common_category_order := (order_key = 'common:category');
	ELSE
		use_base_name_order := false;
		use_common_category_order := false;
		order_lang := 'en';
		order_dir := 'asc';
	END IF;

	order_lang_norm := lower(COALESCE(NULLIF(btrim(order_lang), ''), 'en'));
	use_zh_icu_order := (order_lang_norm LIKE 'zh%');

	RETURN QUERY
		WITH filtered AS (
			SELECT
				f.id,
				f.json,
				f.version,
				f.modified_at,
				pgroonga_score(f.tableoid, f.ctid) AS score,
				bn.base_name,
				cat.category_name,
				CASE
					WHEN use_base_name_order THEN bn.base_name
					WHEN use_common_category_order THEN cat.category_name
				END AS order_value
			FROM flows f
			CROSS JOIN LATERAL (
				SELECT
					CASE
						WHEN use_base_name_order THEN COALESCE(
							(
								SELECT bn_item->>'#text'
								FROM jsonb_array_elements(
									CASE jsonb_typeof(
										f.json
											-> 'flowDataSet'
											-> 'flowInformation'
											-> 'dataSetInformation'
											-> 'name'
											-> 'baseName'
									)
										WHEN 'array' THEN (
											f.json
												-> 'flowDataSet'
												-> 'flowInformation'
												-> 'dataSetInformation'
												-> 'name'
												-> 'baseName'
										)
										WHEN 'object' THEN jsonb_build_array(
											f.json
												-> 'flowDataSet'
												-> 'flowInformation'
												-> 'dataSetInformation'
												-> 'name'
												-> 'baseName'
										)
										ELSE '[]'::jsonb
									END
								) AS bn_item
								WHERE bn_item->>'@xml:lang' = order_lang
								LIMIT 1
							),
							(
								SELECT bn_item->>'#text'
								FROM jsonb_array_elements(
									CASE jsonb_typeof(
										f.json
											-> 'flowDataSet'
											-> 'flowInformation'
											-> 'dataSetInformation'
											-> 'name'
											-> 'baseName'
									)
										WHEN 'array' THEN (
											f.json
												-> 'flowDataSet'
												-> 'flowInformation'
												-> 'dataSetInformation'
												-> 'name'
												-> 'baseName'
										)
										WHEN 'object' THEN jsonb_build_array(
											f.json
												-> 'flowDataSet'
												-> 'flowInformation'
												-> 'dataSetInformation'
												-> 'name'
												-> 'baseName'
										)
										ELSE '[]'::jsonb
									END
								) AS bn_item
								WHERE bn_item->>'@xml:lang' = 'en'
								LIMIT 1
							),
							COALESCE(
								f.json #>> '{flowDataSet,flowInformation,dataSetInformation,name,baseName,0,#text}',
								f.json #>> '{flowDataSet,flowInformation,dataSetInformation,name,baseName,#text}'
							),
							''
						)
					END AS base_name
			) bn
			CROSS JOIN LATERAL (
				SELECT
					CASE
						WHEN use_common_category_order THEN COALESCE(
							(
								SELECT string_agg(cat_item->>'#text', ' / ' ORDER BY cat_level ASC)
								FROM (
									SELECT
										cat_item,
										CASE
											WHEN (cat_item->>'@level') ~ '^\\d+$' THEN (cat_item->>'@level')::int
											ELSE 2147483647
										END AS cat_level
									FROM jsonb_array_elements(
										CASE jsonb_typeof(
											f.json
												-> 'flowDataSet'
												-> 'flowInformation'
												-> 'dataSetInformation'
												-> 'classificationInformation'
												-> 'common:elementaryFlowCategorization'
												-> 'common:category'
										)
											WHEN 'array' THEN (
												f.json
													-> 'flowDataSet'
													-> 'flowInformation'
													-> 'dataSetInformation'
													-> 'classificationInformation'
													-> 'common:elementaryFlowCategorization'
													-> 'common:category'
										)
											WHEN 'object' THEN jsonb_build_array(
												f.json
													-> 'flowDataSet'
													-> 'flowInformation'
													-> 'dataSetInformation'
													-> 'classificationInformation'
													-> 'common:elementaryFlowCategorization'
													-> 'common:category'
										)
											ELSE '[]'::jsonb
										END
									) AS cat_item
								) ordered_cat
							),
							''
						)
					END AS category_name
			) cat
			WHERE f.json @> filter_condition_jsonb
				AND f.json &@~ query_text
				AND (
					(data_source = 'tg' AND state_code = 100)
					OR (data_source = 'co' AND state_code = 200)
					OR (data_source = 'my' AND user_id = auth.uid())
					OR (
						data_source = 'te'
						AND EXISTS (
							SELECT 1
							FROM roles r
							WHERE r.user_id = auth.uid()
								AND r.team_id = f.team_id
								AND r.role::text IN ('admin', 'member', 'owner')
						)
					)
				)
				AND (
					flowType IS NULL
					OR flowType = ''
					OR (f.json->'flowDataSet'->'modellingAndValidation'->'LCIMethod'->>'typeOfDataSet') = ANY(flowTypeArray)
				)
				AND (
					asInput IS NULL
					OR asInput = false
					OR NOT(
						f.json @> '{"flowDataSet":{"flowInformation":{"dataSetInformation":{"classificationInformation":{"common:elementaryFlowCategorization":{"common:category":[{"#text": "Emissions", "@level": "0"}]}}}}}}'
					)
				)
		)
		SELECT
			ROW_NUMBER() OVER (
				ORDER BY
					(CASE WHEN (use_base_name_order OR use_common_category_order) AND use_zh_icu_order AND order_dir = 'asc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" ASC NULLS LAST,
					(CASE WHEN (use_base_name_order OR use_common_category_order) AND use_zh_icu_order AND order_dir = 'desc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" DESC NULLS LAST,
					CASE WHEN (use_base_name_order OR use_common_category_order) AND NOT use_zh_icu_order AND order_dir = 'asc' THEN lower(f2.order_value) END ASC NULLS LAST,
					CASE WHEN (use_base_name_order OR use_common_category_order) AND NOT use_zh_icu_order AND order_dir = 'desc' THEN lower(f2.order_value) END DESC NULLS LAST,
					f2.score DESC,
					f2.modified_at DESC,
					f2.id
			) AS rank,
			f2.id,
			f2.json,
			f2.version,
			f2.modified_at,
			COUNT(*) OVER() AS total_count
		FROM filtered f2
		ORDER BY
			(CASE WHEN (use_base_name_order OR use_common_category_order) AND use_zh_icu_order AND order_dir = 'asc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" ASC NULLS LAST,
			(CASE WHEN (use_base_name_order OR use_common_category_order) AND use_zh_icu_order AND order_dir = 'desc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" DESC NULLS LAST,
			CASE WHEN (use_base_name_order OR use_common_category_order) AND NOT use_zh_icu_order AND order_dir = 'asc' THEN lower(f2.order_value) END ASC NULLS LAST,
			CASE WHEN (use_base_name_order OR use_common_category_order) AND NOT use_zh_icu_order AND order_dir = 'desc' THEN lower(f2.order_value) END DESC NULLS LAST,
			f2.score DESC,
			f2.modified_at DESC,
			f2.id
		LIMIT page_size
		OFFSET (page_current - 1) * page_size;
	END; 
	
$_$;


ALTER FUNCTION public.pgroonga_search_flows_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) OWNER TO postgres;

--
-- Name: pgroonga_search_lifecyclemodels_text_v1(text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_lifecyclemodels_text_v1(query_text text, page_size integer DEFAULT 10, page_current integer DEFAULT 1, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, extracted_text text, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
		SELECT 
			RANK () OVER (ORDER BY pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
			f.id, 
			f.extracted_text,
			f.version,
			f.modified_at,
			COUNT(*) OVER() AS total_count
		FROM public.lifecyclemodels AS f
		WHERE f.extracted_text &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'co' AND state_code = 200) or (data_source = 'my' AND user_id = auth.uid())
																			  or (data_source = 'te' and
		EXISTS ( 
						SELECT 1
						FROM roles r
						WHERE r.user_id = auth.uid() and r.team_id =  f.team_id
						AND r.role::text IN ('admin', 'member', 'owner') 
				)
			)
		)
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION public.pgroonga_search_lifecyclemodels_text_v1(query_text text, page_size integer, page_current integer, data_source text) OWNER TO postgres;

--
-- Name: pgroonga_search_lifecyclemodels_v1(text, text, text, bigint, bigint, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_lifecyclemodels_v1(query_text text, filter_condition text DEFAULT ''::text, order_by text DEFAULT ''::text, page_size bigint DEFAULT 10, page_current bigint DEFAULT 1, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $_$
DECLARE
  filter_condition_jsonb JSONB;
  use_base_name_order boolean := false;
  use_common_class_order boolean := false;
  use_zh_icu_order boolean := false;
  order_by_jsonb jsonb;
  order_key text;
  order_lang text;
  order_dir text;
  order_lang_norm text;
BEGIN
  -- order_by 输入格式（标准 JSON）：{"key":"baseName","lang":"zh","order":"asc"} 或 {"key":"common:class","order":"asc"}

  filter_condition_jsonb := COALESCE(NULLIF(btrim(filter_condition), ''), '{}')::JSONB;

  IF order_by IS NOT NULL AND btrim(order_by) <> '' THEN
    order_by_jsonb := order_by::jsonb;

    order_key := lower(COALESCE(NULLIF(btrim(order_by_jsonb->>'key'), ''), ''));
    order_lang := COALESCE(NULLIF(btrim(order_by_jsonb->>'lang'), ''), 'en');
    order_dir := lower(COALESCE(NULLIF(btrim(order_by_jsonb->>'order'), ''), 'asc'));
    IF order_dir NOT IN ('asc', 'desc') THEN
      order_dir := 'asc';
    END IF;

    use_base_name_order := (order_key = 'basename');
    use_common_class_order := (order_key = 'common:class');
  ELSE
    use_base_name_order := false;
    use_common_class_order := false;
    order_lang := 'en';
    order_dir := 'asc';
  END IF;

  order_lang_norm := lower(COALESCE(NULLIF(btrim(order_lang), ''), 'en'));
  use_zh_icu_order := (order_lang_norm LIKE 'zh%');

  RETURN QUERY
    WITH filtered AS (
      SELECT
        f.id,
        f.json,
        f.version,
        f.modified_at,
        pgroonga_score(f.tableoid, f.ctid) AS score,
        bn.base_name,
        cls.class_name,
        CASE
          WHEN use_base_name_order THEN bn.base_name
          WHEN use_common_class_order THEN cls.class_name
        END AS order_value
      FROM lifecyclemodels f
      CROSS JOIN LATERAL (
        SELECT
          CASE
            WHEN use_base_name_order THEN COALESCE(
              (
                SELECT bn_item->>'#text'
                FROM jsonb_array_elements(
                  CASE jsonb_typeof(
                    f.json
                      -> 'lifeCycleModelDataSet'
                      -> 'lifeCycleModelInformation'
                      -> 'dataSetInformation'
                      -> 'name'
                      -> 'baseName'
                  )
                    WHEN 'array' THEN (
                      f.json
                        -> 'lifeCycleModelDataSet'
                        -> 'lifeCycleModelInformation'
                        -> 'dataSetInformation'
                        -> 'name'
                        -> 'baseName'
                    )
                    WHEN 'object' THEN jsonb_build_array(
                      f.json
                        -> 'lifeCycleModelDataSet'
                        -> 'lifeCycleModelInformation'
                        -> 'dataSetInformation'
                        -> 'name'
                        -> 'baseName'
                    )
                    ELSE '[]'::jsonb
                  END
                ) AS bn_item
                WHERE bn_item->>'@xml:lang' = order_lang
                LIMIT 1
              ),
              (
                SELECT bn_item->>'#text'
                FROM jsonb_array_elements(
                  CASE jsonb_typeof(
                    f.json
                      -> 'lifeCycleModelDataSet'
                      -> 'lifeCycleModelInformation'
                      -> 'dataSetInformation'
                      -> 'name'
                      -> 'baseName'
                  )
                    WHEN 'array' THEN (
                      f.json
                        -> 'lifeCycleModelDataSet'
                        -> 'lifeCycleModelInformation'
                        -> 'dataSetInformation'
                        -> 'name'
                        -> 'baseName'
                    )
                    WHEN 'object' THEN jsonb_build_array(
                      f.json
                        -> 'lifeCycleModelDataSet'
                        -> 'lifeCycleModelInformation'
                        -> 'dataSetInformation'
                        -> 'name'
                        -> 'baseName'
                    )
                    ELSE '[]'::jsonb
                  END
                ) AS bn_item
                WHERE bn_item->>'@xml:lang' = 'en'
                LIMIT 1
              ),
              COALESCE(
                f.json #>> '{lifeCycleModelDataSet,lifeCycleModelInformation,dataSetInformation,name,baseName,0,#text}',
                f.json #>> '{lifeCycleModelDataSet,lifeCycleModelInformation,dataSetInformation,name,baseName,#text}'
              ),
              ''
            )
          END AS base_name
      ) bn
      CROSS JOIN LATERAL (
        SELECT
          CASE
            WHEN use_common_class_order THEN COALESCE(
              (
                SELECT string_agg(cls_item->>'#text', ' / ' ORDER BY cls_level ASC)
                FROM (
                  SELECT
                    cls_item,
                    CASE
                      WHEN (cls_item->>'@level') ~ '^\\d+$' THEN (cls_item->>'@level')::int
                      ELSE 2147483647
                    END AS cls_level
                  FROM jsonb_array_elements(
                    CASE jsonb_typeof(
                      f.json
                        -> 'lifeCycleModelDataSet'
                        -> 'lifeCycleModelInformation'
                        -> 'dataSetInformation'
                        -> 'classificationInformation'
                        -> 'common:classification'
                        -> 'common:class'
                    )
                      WHEN 'array' THEN (
                        f.json
                          -> 'lifeCycleModelDataSet'
                          -> 'lifeCycleModelInformation'
                          -> 'dataSetInformation'
                          -> 'classificationInformation'
                          -> 'common:classification'
                          -> 'common:class'
                    )
                      WHEN 'object' THEN jsonb_build_array(
                        f.json
                          -> 'lifeCycleModelDataSet'
                          -> 'lifeCycleModelInformation'
                          -> 'dataSetInformation'
                          -> 'classificationInformation'
                          -> 'common:classification'
                          -> 'common:class'
                    )
                      ELSE '[]'::jsonb
                    END
                  ) AS cls_item
                ) ordered_cls
              ),
              ''
            )
          END AS class_name
      ) cls
      WHERE f.json @> filter_condition_jsonb
        AND f.json &@~ query_text
        AND (
          (data_source = 'tg' AND state_code = 100)
          OR (data_source = 'co' AND state_code = 200)
          OR (data_source = 'my' AND user_id = auth.uid())
          OR (
            data_source = 'te'
            AND EXISTS (
              SELECT 1
              FROM roles r
              WHERE r.user_id = auth.uid()
                AND r.team_id = f.team_id
                AND r.role::text IN ('admin', 'member', 'owner')
            )
          )
        )
    )
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY
          (CASE WHEN (use_base_name_order OR use_common_class_order) AND use_zh_icu_order AND order_dir = 'asc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" ASC NULLS LAST,
          (CASE WHEN (use_base_name_order OR use_common_class_order) AND use_zh_icu_order AND order_dir = 'desc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" DESC NULLS LAST,
          CASE WHEN (use_base_name_order OR use_common_class_order) AND NOT use_zh_icu_order AND order_dir = 'asc' THEN lower(f2.order_value) END ASC NULLS LAST,
          CASE WHEN (use_base_name_order OR use_common_class_order) AND NOT use_zh_icu_order AND order_dir = 'desc' THEN lower(f2.order_value) END DESC NULLS LAST,
          f2.score DESC,
          f2.modified_at DESC,
          f2.id
      ) AS rank,
      f2.id,
      f2.json,
      f2.version,
      f2.modified_at,
      COUNT(*) OVER() AS total_count
    FROM filtered f2
    ORDER BY
      (CASE WHEN (use_base_name_order OR use_common_class_order) AND use_zh_icu_order AND order_dir = 'asc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" ASC NULLS LAST,
      (CASE WHEN (use_base_name_order OR use_common_class_order) AND use_zh_icu_order AND order_dir = 'desc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" DESC NULLS LAST,
      CASE WHEN (use_base_name_order OR use_common_class_order) AND NOT use_zh_icu_order AND order_dir = 'asc' THEN lower(f2.order_value) END ASC NULLS LAST,
      CASE WHEN (use_base_name_order OR use_common_class_order) AND NOT use_zh_icu_order AND order_dir = 'desc' THEN lower(f2.order_value) END DESC NULLS LAST,
      f2.score DESC,
      f2.modified_at DESC,
      f2.id
    LIMIT page_size
    OFFSET (page_current - 1) * page_size;
END;
$_$;


ALTER FUNCTION public.pgroonga_search_lifecyclemodels_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) OWNER TO postgres;

--
-- Name: pgroonga_search_processes_text_v1(text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_processes_text_v1(query_text text, page_size integer DEFAULT 10, page_current integer DEFAULT 1, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, extracted_text text, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
		SELECT 
			RANK () OVER (ORDER BY pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
			f.id, 
			f.extracted_text,
			f.version,
			f.modified_at,
			COUNT(*) OVER() AS total_count
		FROM public.processes AS f
		WHERE f.extracted_text &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'co' AND state_code = 200) or (data_source = 'my' AND user_id = auth.uid() )
																			  or (data_source = 'te' and
		EXISTS ( 
						SELECT 1
						FROM roles r
						WHERE r.user_id = auth.uid()  and r.team_id =  f.team_id
						AND r.role::text IN ('admin', 'member', 'owner') 
				)
			)
		)
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION public.pgroonga_search_processes_text_v1(query_text text, page_size integer, page_current integer, data_source text) OWNER TO postgres;

--
-- Name: pgroonga_search_processes_v1(text, text, text, bigint, bigint, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_processes_v1(query_text text, filter_condition text DEFAULT ''::text, order_by text DEFAULT ''::text, page_size bigint DEFAULT 10, page_current bigint DEFAULT 1, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, model_id uuid, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $_$
DECLARE
    filter_condition_jsonb JSONB;
    use_base_name_order boolean := false;
	use_common_class_order boolean := false;
	use_zh_icu_order boolean := false;
    order_by_jsonb jsonb;
    order_key text;
    order_lang text;
    order_dir text;
	order_lang_norm text;
BEGIN
	filter_condition_jsonb := COALESCE(NULLIF(btrim(filter_condition), ''), '{}')::JSONB;

	-- order_by 输入格式（标准 JSON）：{"key":"baseName","lang":"zh","order":"asc"} 或 {"key":"common:class","order":"asc"}
	IF order_by IS NOT NULL AND btrim(order_by) <> '' THEN
		order_by_jsonb := order_by::jsonb;

		order_key := lower(COALESCE(NULLIF(btrim(order_by_jsonb->>'key'), ''), ''));
		order_lang := COALESCE(NULLIF(btrim(order_by_jsonb->>'lang'), ''), 'en');
		order_dir := lower(COALESCE(NULLIF(btrim(order_by_jsonb->>'order'), ''), 'asc'));
		IF order_dir NOT IN ('asc', 'desc') THEN
			order_dir := 'asc';
		END IF;

		use_base_name_order := (order_key = 'basename');
		use_common_class_order := (order_key = 'common:class');
	ELSE
		use_base_name_order := false;
		use_common_class_order := false;
		order_lang := 'en';
		order_dir := 'asc';
	END IF;

	order_lang_norm := lower(COALESCE(NULLIF(btrim(order_lang), ''), 'en'));
	use_zh_icu_order := (order_lang_norm LIKE 'zh%');

  RETURN QUERY
		WITH filtered AS (
			SELECT
				f.id,
				f.json,
				f.version,
				f.modified_at,
				f.model_id,
				pgroonga_score(f.tableoid, f.ctid) AS score,
				bn.base_name,
				cls.class_name,
				CASE
					WHEN use_base_name_order THEN bn.base_name
					WHEN use_common_class_order THEN cls.class_name
				END AS order_value
			FROM processes f
			CROSS JOIN LATERAL (
				SELECT
					CASE
						WHEN use_base_name_order THEN COALESCE(
							(
								SELECT bn_item->>'#text'
								FROM jsonb_array_elements(
									CASE jsonb_typeof(
										f.json
											-> 'processDataSet'
											-> 'processInformation'
											-> 'dataSetInformation'
											-> 'name'
											-> 'baseName'
									)
										WHEN 'array' THEN (
											f.json
												-> 'processDataSet'
												-> 'processInformation'
												-> 'dataSetInformation'
												-> 'name'
												-> 'baseName'
										)
										WHEN 'object' THEN jsonb_build_array(
											f.json
												-> 'processDataSet'
												-> 'processInformation'
												-> 'dataSetInformation'
												-> 'name'
												-> 'baseName'
										)
										ELSE '[]'::jsonb
									END
								) AS bn_item
								WHERE bn_item->>'@xml:lang' = order_lang
								LIMIT 1
							),
							(
								SELECT bn_item->>'#text'
								FROM jsonb_array_elements(
									CASE jsonb_typeof(
										f.json
											-> 'processDataSet'
											-> 'processInformation'
											-> 'dataSetInformation'
											-> 'name'
											-> 'baseName'
									)
										WHEN 'array' THEN (
											f.json
												-> 'processDataSet'
												-> 'processInformation'
												-> 'dataSetInformation'
												-> 'name'
												-> 'baseName'
										)
										WHEN 'object' THEN jsonb_build_array(
											f.json
												-> 'processDataSet'
												-> 'processInformation'
												-> 'dataSetInformation'
												-> 'name'
												-> 'baseName'
										)
										ELSE '[]'::jsonb
									END
								) AS bn_item
								WHERE bn_item->>'@xml:lang' = 'en'
								LIMIT 1
							),
							COALESCE(
								f.json #>> '{processDataSet,processInformation,dataSetInformation,name,baseName,0,#text}',
								f.json #>> '{processDataSet,processInformation,dataSetInformation,name,baseName,#text}'
							),
							''
						)
					END AS base_name
			) bn
			CROSS JOIN LATERAL (
				SELECT
					CASE
						WHEN use_common_class_order THEN COALESCE(
							(
								SELECT string_agg(cls_item->>'#text', ' / ' ORDER BY cls_level ASC)
								FROM (
									SELECT
										cls_item,
										CASE
											WHEN (cls_item->>'@level') ~ '^\\d+$' THEN (cls_item->>'@level')::int
											ELSE 2147483647
										END AS cls_level
									FROM jsonb_array_elements(
										CASE jsonb_typeof(
											f.json
												-> 'processDataSet'
												-> 'processInformation'
												-> 'dataSetInformation'
												-> 'classificationInformation'
												-> 'common:classification'
												-> 'common:class'
										)
											WHEN 'array' THEN (
												f.json
													-> 'processDataSet'
													-> 'processInformation'
													-> 'dataSetInformation'
													-> 'classificationInformation'
													-> 'common:classification'
													-> 'common:class'
											)
											WHEN 'object' THEN jsonb_build_array(
												f.json
													-> 'processDataSet'
													-> 'processInformation'
													-> 'dataSetInformation'
													-> 'classificationInformation'
													-> 'common:classification'
													-> 'common:class'
											)
											ELSE '[]'::jsonb
										END
									) AS cls_item
								) ordered_cls
							),
							''
						)
					END AS class_name
			) cls
			WHERE f.json @> filter_condition_jsonb
				AND f.json &@~ query_text
				AND (
					(data_source = 'tg' AND state_code = 100)
					OR (data_source = 'co' AND state_code = 200)
					OR (data_source = 'my' AND user_id = auth.uid())
					OR (
						data_source = 'te'
						AND EXISTS (
							SELECT 1
							FROM roles r
							WHERE r.user_id = auth.uid()
								AND r.team_id = f.team_id
								AND r.role::text IN ('admin', 'member', 'owner')
						)
					)
				)
		)
		SELECT
			ROW_NUMBER() OVER (
				ORDER BY
					(CASE WHEN (use_base_name_order OR use_common_class_order) AND use_zh_icu_order AND order_dir = 'asc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" ASC NULLS LAST,
					(CASE WHEN (use_base_name_order OR use_common_class_order) AND use_zh_icu_order AND order_dir = 'desc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" DESC NULLS LAST,
					CASE WHEN (use_base_name_order OR use_common_class_order) AND NOT use_zh_icu_order AND order_dir = 'asc' THEN lower(f2.order_value) END ASC NULLS LAST,
					CASE WHEN (use_base_name_order OR use_common_class_order) AND NOT use_zh_icu_order AND order_dir = 'desc' THEN lower(f2.order_value) END DESC NULLS LAST,
					f2.score DESC,
					f2.modified_at DESC,
					f2.id
			) AS rank,
			f2.id,
			f2.json,
			f2.version,
			f2.modified_at,
			f2.model_id,
			COUNT(*) OVER() AS total_count
		FROM filtered f2
		ORDER BY
			(CASE WHEN (use_base_name_order OR use_common_class_order) AND use_zh_icu_order AND order_dir = 'asc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" ASC NULLS LAST,
			(CASE WHEN (use_base_name_order OR use_common_class_order) AND use_zh_icu_order AND order_dir = 'desc' THEN f2.order_value END) COLLATE "zh-Hans-CN-x-icu" DESC NULLS LAST,
			CASE WHEN (use_base_name_order OR use_common_class_order) AND NOT use_zh_icu_order AND order_dir = 'asc' THEN lower(f2.order_value) END ASC NULLS LAST,
			CASE WHEN (use_base_name_order OR use_common_class_order) AND NOT use_zh_icu_order AND order_dir = 'desc' THEN lower(f2.order_value) END DESC NULLS LAST,
			f2.score DESC,
			f2.modified_at DESC,
			f2.id
		LIMIT page_size
		OFFSET (page_current - 1) * page_size;
END;
$_$;


ALTER FUNCTION public.pgroonga_search_processes_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) OWNER TO postgres;

--
-- Name: pgroonga_search_sources(text, text, bigint, bigint, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_sources(query_text text, filter_condition text DEFAULT ''::text, page_size bigint DEFAULT 10, page_current bigint DEFAULT 1, data_source text DEFAULT 'tg'::text, this_user_id text DEFAULT ''::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    filter_condition_jsonb JSONB;
BEGIN
	filter_condition_jsonb := filter_condition::JSONB;
  RETURN QUERY
		SELECT 
			RANK () OVER (ORDER BY pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
			f.id, 
			f.json,
			f.version,
			f.modified_at,
			COUNT(*) OVER() AS total_count
		FROM sources f
		WHERE f.json @> filter_condition_jsonb AND f.json &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'my' AND user_id::text = this_user_id))
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION public.pgroonga_search_sources(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) OWNER TO postgres;

--
-- Name: pgroonga_search_unitgroups(text, text, bigint, bigint, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pgroonga_search_unitgroups(query_text text, filter_condition text DEFAULT ''::text, page_size bigint DEFAULT 10, page_current bigint DEFAULT 1, data_source text DEFAULT 'tg'::text, this_user_id text DEFAULT ''::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    filter_condition_jsonb JSONB;
BEGIN
 filter_condition_jsonb := filter_condition::JSONB;
  RETURN QUERY
  SELECT 
   RANK () OVER (ORDER BY extensions.pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
   f.id, 
   f.json,
   f.version,
   f.modified_at,
   COUNT(*) OVER() AS total_count
  FROM public.unitgroups f
  WHERE f.json @> filter_condition_jsonb 
    AND f.json &@~ query_text 
    AND (
         (data_source = 'tg' AND f.state_code = 100)
         OR 
         (data_source = 'my' AND f.user_id::text = this_user_id)
        )
  ORDER BY extensions.pgroonga_score(f.tableoid, f.ctid) DESC
  LIMIT page_size
  OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION public.pgroonga_search_unitgroups(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) OWNER TO postgres;

--
-- Name: policy_is_current_user_in_roles(uuid, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.policy_is_current_user_in_roles(p_team_id uuid, p_roles_to_check text[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
	-- 增加空数组判断：空数组直接返回 false
    SELECT CASE 
        WHEN cardinality(p_roles_to_check) = 0 THEN false  -- cardinality() 获取数组长度
		-- 核心逻辑：用 EXISTS 判断是否存在匹配记录，效率更高（无需聚合，找到即返回）
        ELSE EXISTS (
        SELECT 1
        FROM public.roles r
        WHERE r.user_id = auth.uid()                  -- 匹配当前登录用户
          AND r.team_id = p_team_id                   -- 匹配目标团队
          AND r.role <> 'rejected'::text              -- 排除无效的「拒绝」角色
          AND r.role = ANY(p_roles_to_check)          -- 关键：判断用户角色是否在输入的角色数组中（任意一个匹配即可）
     )
	 END;
$$;


ALTER FUNCTION public.policy_is_current_user_in_roles(p_team_id uuid, p_roles_to_check text[]) OWNER TO postgres;

--
-- Name: policy_is_team_id_used(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.policy_is_team_id_used(_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = _team_id);
$$;


ALTER FUNCTION public.policy_is_team_id_used(_team_id uuid) OWNER TO postgres;

--
-- Name: policy_is_team_public(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.policy_is_team_public(_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = _team_id
      AND t.is_public);
$$;


ALTER FUNCTION public.policy_is_team_public(_team_id uuid) OWNER TO postgres;

--
-- Name: policy_roles_delete(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.policy_roles_delete(_user_id uuid, _team_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT (
	-- 验证当前用户是否为团队管理员或拥有者，被删除用户角色不能为owner角色，自己不能删除自己
	(
		_role <> 'owner' AND _user_id <> auth.uid() AND
		EXISTS (
			SELECT 1
			FROM public.roles r
			WHERE r.user_id = auth.uid() AND r.team_id = _team_id AND (r.role = 'admin' OR r.role = 'owner' OR r.role = 'review-admin'))
	)
  );
$$;


ALTER FUNCTION public.policy_roles_delete(_user_id uuid, _team_id uuid, _role text) OWNER TO postgres;

--
-- Name: policy_roles_insert(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.policy_roles_insert(_user_id uuid, _team_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT (
    ((
        -- 验证用户是否已经有团队角色，且角色不为rejected
        EXISTS (
            SELECT 1
            FROM public.roles r
            WHERE r.user_id = _user_id
            AND r.role <> 'rejected'
            and r.team_id <> '00000000-0000-0000-0000-000000000000')
        ) = false

    AND
    (
        -- 验证当前用户创建团队时，是否为自己分配owner角色，且团队ID未被使用
        ((
            (_user_id = auth.uid() AND _role = 'owner' AND 
            EXISTS (
                SELECT 1
                FROM public.roles r
                WHERE r.team_id = _team_id) = false)
        ))

        OR
        -- 验证当前用户是否为团队管理员或拥有者，邀请的用户角色是否为is_invited角色
        ((
            _role = 'is_invited' AND 
            EXISTS (
                SELECT 1
                FROM public.roles r
                WHERE r.user_id = auth.uid() AND r.team_id = _team_id AND (r.role = 'admin' OR r.role = 'owner'))
        ))
    ))

    OR
    (
        -- 验证用户是否已经有审核团队角色
        EXISTS (
            SELECT 1
            FROM public.roles r
            WHERE r.user_id = _user_id
            AND r.role like 'review-%'
            AND r.team_id = '00000000-0000-0000-0000-000000000000') = false

        AND
        -- 验证当前用户是否为审核管理员，邀请的用户角色是否为review-member角色
        (
        _role = 'review-member' AND _team_id = '00000000-0000-0000-0000-000000000000'::uuid AND
        EXISTS (
            SELECT 1
            FROM public.roles r
            WHERE r.user_id = auth.uid() AND r.team_id = _team_id AND r.role = 'review-admin')
        )
    )

    OR
    (
        -- 验证用户是否已经有系统团队角色
        EXISTS (
            SELECT 1
            FROM public.roles r
            WHERE r.user_id = _user_id
            AND (r.role = 'admin' OR r.role = 'member')
            AND r.team_id = '00000000-0000-0000-0000-000000000000') = false

        AND
        -- 验证当前用户是否为系统管理员，邀请的用户角色是否为member角色
        (
        _role = 'member' AND _team_id = '00000000-0000-0000-0000-000000000000'::uuid AND
        EXISTS (
            SELECT 1
            FROM public.roles r
            WHERE r.user_id = auth.uid() AND r.team_id = _team_id AND r.role = 'admin')
        )
    )

    );
$$;


ALTER FUNCTION public.policy_roles_insert(_user_id uuid, _team_id uuid, _role text) OWNER TO postgres;

--
-- Name: policy_roles_select(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.policy_roles_select(_team_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT (
  	-- 验证当前用户是否为团队成员（非拒绝状态）
    EXISTS (
		select 1 from public.roles r0
		where r0.user_id = auth.uid() and r0.team_id = _team_id and r0.role <> 'rejected')

    OR
    -- 验证当前用户是否为审核团队/系统管理团队成员
    (_team_id = '00000000-0000-0000-0000-000000000000'::uuid and
    EXISTS (
		select 1 from public.roles r0
		where r0.user_id = auth.uid() and r0.team_id = _team_id))

    OR
    -- 验证当前团队是否为公开团队的拥有者，用于展示加入团队的联系信息
    _role = 'owner' AND
    EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = _team_id AND t.is_public)
	);
$$;


ALTER FUNCTION public.policy_roles_select(_team_id uuid, _role text) OWNER TO postgres;

--
-- Name: policy_roles_update(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.policy_roles_update(_user_id uuid, _team_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT (
  	-- 验证当前用户是否为团队拥有者或管理员
	(
  	EXISTS (
		select 1 from public.roles r0
		where r0.user_id = auth.uid() and r0.team_id = _team_id and (r0.role ='admin' or r0.role='owner'))
	and
	(
	-- 切换admin和member
	((_role = 'admin' or _role = 'member') and 
	  EXISTS (
		SELECT 1
		FROM public.roles r1
		WHERE r1.user_id = _user_id and r1.team_id = _team_id and (r1.role = 'admin' or r1.role = 'member')))
	or 
	-- 重新邀请已经拒绝的用户
	(_role = 'is_invited' and 
		EXISTS (
			SELECT 1
			FROM public.roles r2
			WHERE r2.user_id = _user_id and r2.team_id = _team_id and r2.role = 'rejected'))
	))
	or
	-- 验证当前用户，接受邀请或拒绝邀请
	((_role = 'member' or _role = 'rejected') and _user_id = auth.uid() and
	EXISTS (
		select 1 from public.roles r3
		where r3.user_id = _user_id and r3.team_id = _team_id and r3.role ='is_invited'))
	);
$$;


ALTER FUNCTION public.policy_roles_update(_user_id uuid, _team_id uuid, _role text) OWNER TO postgres;

--
-- Name: policy_user_has_team(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.policy_user_has_team(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.user_id = _user_id
      AND r.role <> 'rejected'
	  and r.team_id <> '00000000-0000-0000-0000-000000000000');
$$;


ALTER FUNCTION public.policy_user_has_team(_user_id uuid) OWNER TO postgres;

--
-- Name: processes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processes (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    json_ordered json,
    user_id uuid DEFAULT auth.uid(),
    state_code integer DEFAULT 0,
    version character(9) NOT NULL,
    modified_at timestamp with time zone DEFAULT now(),
    team_id uuid,
    extracted_text text,
    embedding extensions.halfvec(384),
    embedding_at timestamp with time zone,
    review_id uuid,
    rule_verification boolean,
    reviews jsonb,
    embedding_flag smallint,
    model_id uuid,
    embedding_ft_at timestamp with time zone,
    embedding_ft extensions.vector(1024),
    extracted_md text
);


ALTER TABLE public.processes OWNER TO postgres;

--
-- Name: processes_embedding_ft_input(public.processes); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.processes_embedding_ft_input(proc public.processes) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
begin
  return proc.extracted_md;
end;
$$;


ALTER FUNCTION public.processes_embedding_ft_input(proc public.processes) OWNER TO postgres;

--
-- Name: processes_embedding_input(public.processes); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.processes_embedding_input(proc public.processes) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
begin
  return proc.extracted_text;
end;
$$;


ALTER FUNCTION public.processes_embedding_input(proc public.processes) OWNER TO postgres;

--
-- Name: processes_sync_jsonb_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.processes_sync_jsonb_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version := COALESCE(NEW.json->'processDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion',
					''
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.processes_sync_jsonb_version() OWNER TO postgres;

--
-- Name: semantic_search(text, double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.semantic_search(query_embedding text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20) RETURNS TABLE(rank bigint, id uuid, "json" jsonb)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    query_embedding_vector vector(384);
BEGIN
    -- Convert the input TEXT to vector(1536) once
    query_embedding_vector := query_embedding::vector(384);

    RETURN QUERY
    SELECT
        RANK () OVER (ORDER BY f.embedding <=> query_embedding_vector) AS rank,
        f.id,
        f.json
    FROM flows f
    WHERE f.embedding <=> query_embedding_vector < 1 - match_threshold
    ORDER BY f.embedding <=> query_embedding_vector
    LIMIT match_count;
END;
$$;


ALTER FUNCTION public.semantic_search(query_embedding text, match_threshold double precision, match_count integer) OWNER TO postgres;

--
-- Name: semantic_search_flows_v1(text, text, double precision, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.semantic_search_flows_v1(query_embedding text, filter_condition text DEFAULT ''::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  query_embedding_vector  vector(1024);
  filter_condition_jsonb  jsonb;
  flowType                text;
  flowTypeArray           text[];
  asInput                 boolean;
  candidate_size          int := GREATEST(match_count * 10, 200);
BEGIN
  -- 1) 向量转 halfvec(384)
  query_embedding_vector := query_embedding::vector(1024);

  -- 2) 解析 filter_condition
  filter_condition_jsonb := filter_condition::jsonb;
  flowType               := filter_condition_jsonb->>'flowType';
  flowTypeArray          := string_to_array(flowType, ',');
  filter_condition_jsonb := filter_condition_jsonb - 'flowType';

  asInput                := (filter_condition_jsonb->'asInput')::boolean;
  filter_condition_jsonb := filter_condition_jsonb - 'asInput';

  -- 3) 两阶段：先 HNSW 候选，再业务过滤
  RETURN QUERY
  WITH cand AS (
    SELECT
      f.id,
      f.json,
      f.version,
      f.modified_at,
      f.embedding_ft,
      f.state_code,
      f.user_id,
      f.team_id
    FROM public.flows f
    ORDER BY f.embedding_ft <=> query_embedding_vector   
    LIMIT candidate_size
  ),
  final AS (
    SELECT
      c.*,
      (c.embedding_ft <=> query_embedding_vector) AS dist
    FROM cand c
    WHERE
      (c.embedding_ft <=> query_embedding_vector) < 1 - match_threshold
      AND c.json @> filter_condition_jsonb
      AND (
           (data_source = 'tg' AND c.state_code = 100)
        OR (data_source = 'my' AND c.user_id = auth.uid())
      )
      AND (
        flowType IS NULL
        OR flowType = ''
        OR (c.json->'flowDataSet'->'modellingAndValidation'->'LCIMethod'->>'typeOfDataSet') = ANY(flowTypeArray)
      )
      AND (
        asInput IS NULL
        OR asInput = false
        OR NOT (
          c.json @> '{"flowDataSet":{"flowInformation":{"dataSetInformation":{"classificationInformation":{"common:elementaryFlowCategorization":{"common:category":[{"#text":"Emissions","@level":"0"}]}}}}}}'
        )
      )
  )
  SELECT
  RANK() OVER (ORDER BY f2.dist) AS "rank",
  f2.id,
  f2.json,
  f2.version,
  f2.modified_at,
  COUNT(*) OVER()               AS total_count
FROM final AS f2
ORDER BY f2.dist
LIMIT match_count;
END;
$$;


ALTER FUNCTION public.semantic_search_flows_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) OWNER TO postgres;

--
-- Name: semantic_search_lifecyclemodels_v1(text, text, double precision, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.semantic_search_lifecyclemodels_v1(query_embedding text, filter_condition text DEFAULT ''::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  query_embedding_vector  vector(1024);   
  filter_condition_jsonb  jsonb;
  candidate_size          int := GREATEST(match_count * 10, 200);
BEGIN
  -- 1) 向量入参 -> vector(384)
  query_embedding_vector := query_embedding::vector(1024);

  -- 2) 解析 filter_condition
  filter_condition_jsonb := filter_condition::jsonb;

  -- 3) 两阶段：先用向量索引取候选，再应用阈值/过滤/权限，最后排序分页
  RETURN QUERY
  WITH cand AS (
    SELECT
      m.id,
      m.json,
      m.version,
      m.modified_at,
      m.embedding_ft,
      m.state_code,
      m.user_id
    FROM public.lifecyclemodels AS m
    ORDER BY m.embedding_ft <=> query_embedding_vector      
    LIMIT candidate_size
  ),
  final AS (
    SELECT
      c.*,
      (c.embedding_ft <=> query_embedding_vector) AS dist
    FROM cand AS c
    WHERE
      -- 向量阈值（在候选集上应用）
      (c.embedding_ft <=> query_embedding_vector) < 1 - match_threshold
      -- JSON 过滤
      AND c.json @> filter_condition_jsonb
      -- data_source 访问控制（与原逻辑一致）
      AND (
           (data_source = 'tg' AND c.state_code = 100)
        OR (data_source = 'my' AND c.user_id = auth.uid())
      )
  )
  SELECT
    RANK() OVER (ORDER BY f2.dist) AS "rank",
    f2.id,
    f2.json,
    f2.version,
    f2.modified_at,
    COUNT(*) OVER()               AS total_count
  FROM final AS f2
  ORDER BY f2.dist
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.semantic_search_lifecyclemodels_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) OWNER TO postgres;

--
-- Name: semantic_search_processes_v1(text, text, double precision, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.semantic_search_processes_v1(query_embedding text, filter_condition text DEFAULT ''::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 20, data_source text DEFAULT 'tg'::text) RETURNS TABLE(rank bigint, id uuid, "json" jsonb, version character, modified_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  query_embedding_vector  vector(1024);   -- 若列为 halfvec(384)，这里改成 halfvec(384)
  filter_condition_jsonb  jsonb;
  candidate_size          int := GREATEST(match_count * 10, 200);
BEGIN
  -- 1) 向量入参转 vector(384)（或 halfvec(384)）
  query_embedding_vector := query_embedding::vector(1024);

  -- 2) 解析 filter_condition
  filter_condition_jsonb := filter_condition::jsonb;

  -- 3) 两阶段：先按相似度取候选（命中向量索引），再在候选上施加全部业务过滤/阈值
  RETURN QUERY
  WITH cand AS (
    SELECT
      p.id,
      p.json,
      p.version,
      p.modified_at,
      p.embedding_ft,
      p.state_code,
      p.user_id
    FROM public.processes AS p
    ORDER BY p.embedding_ft <=> query_embedding_vector      
  ),
  final AS (
    SELECT
      c.*,
      (c.embedding_ft <=> query_embedding_vector) AS dist
    FROM cand AS c
    WHERE
      -- 向量阈值（在候选集上应用）
      (c.embedding_ft <=> query_embedding_vector) < 1 - match_threshold
      -- JSON 过滤
      AND c.json @> filter_condition_jsonb
      -- data_source 访问控制（保持你原逻辑）
      AND (
           (data_source = 'tg' AND c.state_code = 100)
        OR (data_source = 'my' AND c.user_id = auth.uid())
      )
  )
  SELECT
    RANK() OVER (ORDER BY f2.dist) AS "rank",
    f2.id,
    f2.json,
    f2.version,
    f2.modified_at,
    COUNT(*) OVER()               AS total_count
  FROM final AS f2
  ORDER BY f2.dist
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.semantic_search_processes_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) OWNER TO postgres;

--
-- Name: sources_sync_jsonb_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sources_sync_jsonb_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version := COALESCE(NEW.json->'sourceDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion',
					''
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sources_sync_jsonb_version() OWNER TO postgres;

--
-- Name: sync_auth_users_to_public_users(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_auth_users_to_public_users() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- 处理插入操作
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users (id, raw_user_meta_data)
        VALUES (NEW.id, NEW.raw_user_meta_data);
    -- 处理更新操作
    ELSIF TG_OP = 'UPDATE' THEN
		IF NEW.raw_user_meta_data != OLD.raw_user_meta_data THEN
			UPDATE public.users
			SET raw_user_meta_data = NEW.raw_user_meta_data
			WHERE id = NEW.id;
    	END IF;
    -- 处理删除操作
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.users
        WHERE id = OLD.id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_auth_users_to_public_users() OWNER TO postgres;

--
-- Name: sync_json_to_jsonb(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_json_to_jsonb() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb
    THEN
        NEW.json := NEW.json_ordered;
    END IF;
    RETURN NEW;
END;$$;


ALTER FUNCTION public.sync_json_to_jsonb() OWNER TO postgres;

--
-- Name: unitgroups_sync_jsonb_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.unitgroups_sync_jsonb_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version :=  COALESCE(NEW.json->'unitGroupDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion'
		,
					''
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.unitgroups_sync_jsonb_version() OWNER TO postgres;

--
-- Name: update_modified_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
   NEW.modified_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_at() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

--
-- Name: http_request(); Type: FUNCTION; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'supabase_functions'
    AS $$
    DECLARE
      request_id bigint;
      payload jsonb;
      url text := TG_ARGV[0]::text;
      method text := TG_ARGV[1]::text;
      headers jsonb DEFAULT '{}'::jsonb;
      params jsonb DEFAULT '{}'::jsonb;
      timeout_ms integer DEFAULT 1000;
    BEGIN
      IF url IS NULL OR url = 'null' THEN
        RAISE EXCEPTION 'url argument is missing';
      END IF;

      IF method IS NULL OR method = 'null' THEN
        RAISE EXCEPTION 'method argument is missing';
      END IF;

      IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
        headers = '{"Content-Type": "application/json"}'::jsonb;
      ELSE
        headers = TG_ARGV[2]::jsonb;
      END IF;

      IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
        params = '{}'::jsonb;
      ELSE
        params = TG_ARGV[3]::jsonb;
      END IF;

      IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
        timeout_ms = 1000;
      ELSE
        timeout_ms = TG_ARGV[4]::integer;
      END IF;

      CASE
        WHEN method = 'GET' THEN
          SELECT http_get INTO request_id FROM net.http_get(
            url,
            params,
            headers,
            timeout_ms
          );
        WHEN method = 'POST' THEN
          payload = jsonb_build_object(
            'old_record', OLD,
            'record', NEW,
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
          );

          SELECT http_post INTO request_id FROM net.http_post(
            url,
            payload,
            params,
            headers,
            timeout_ms
          );
        ELSE
          RAISE EXCEPTION 'method argument % is invalid', method;
      END CASE;

      INSERT INTO supabase_functions.hooks
        (hook_table_id, hook_name, request_id)
      VALUES
        (TG_RELID, TG_NAME, request_id);

      RETURN NEW;
    END
  $$;


ALTER FUNCTION supabase_functions.http_request() OWNER TO supabase_functions_admin;

--
-- Name: clear_column(); Type: FUNCTION; Schema: util; Owner: postgres
--

CREATE FUNCTION util.clear_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
    clear_column text := TG_ARGV[0];
begin
    NEW := NEW #= public.hstore(clear_column, NULL);
    return NEW;
end;
$$;


ALTER FUNCTION util.clear_column() OWNER TO postgres;

--
-- Name: invoke_edge_function(text, jsonb, integer); Type: FUNCTION; Schema: util; Owner: postgres
--

CREATE FUNCTION util.invoke_edge_function(name text, body jsonb, timeout_milliseconds integer DEFAULT ((5 * 60) * 1000)) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  service_key text;
begin
  select ds.decrypted_secret
    into service_key
  from vault.decrypted_secrets ds
  where ds.name = 'project_secret_key';

  if service_key is null or service_key = '' then
    raise exception 'Missing vault secret: project_secret_key';
  end if;

  perform net.http_post(
    url => util.project_url() || '/functions/v1/' || name,
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_key,
      'x_region', 'us-east-1'
    ),
    body => body,
    timeout_milliseconds => timeout_milliseconds
  );
end;
$$;


ALTER FUNCTION util.invoke_edge_function(name text, body jsonb, timeout_milliseconds integer) OWNER TO postgres;

--
-- Name: process_embeddings(integer, integer, integer); Type: FUNCTION; Schema: util; Owner: postgres
--

CREATE FUNCTION util.process_embeddings(batch_size integer DEFAULT 10, max_requests integer DEFAULT 10, timeout_milliseconds integer DEFAULT ((5 * 60) * 1000)) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  job_batches jsonb[];
  batch jsonb;
	edge_fn text;
begin
  with
    -- First get jobs and assign batch numbers
    numbered_jobs as (
      select
        message || jsonb_build_object('jobId', msg_id) as job_info,
        (row_number() over (order by 1) - 1) / batch_size as batch_num
      from pgmq.read(
        queue_name => 'embedding_jobs',
        vt => timeout_milliseconds / 1000,
        qty => max_requests * batch_size
      )
    ),
    -- Then group jobs into batches
    batched_jobs as (
      select
        jsonb_agg(job_info) as batch_array,
        batch_num
      from numbered_jobs
      group by batch_num, job_info->>'edgeFunction'
    )
  -- Finally aggregate all batches into array
  select array_agg(batch_array)
  from batched_jobs
  into job_batches;
	
	if job_batches is null then
    return;
  end if;

  -- Invoke the embed edge function for each batch
  foreach batch in array job_batches loop
    -- 使用 batch 中第一条 job 的 edgeFunction
    edge_fn := batch->0->>'edgeFunction';

    perform util.invoke_edge_function(
      name => edge_fn,
      body => batch,
      timeout_milliseconds => timeout_milliseconds
    );
  end loop;
end;
$$;


ALTER FUNCTION util.process_embeddings(batch_size integer, max_requests integer, timeout_milliseconds integer) OWNER TO postgres;

--
-- Name: process_webhook_jobs(integer, integer, integer); Type: FUNCTION; Schema: util; Owner: postgres
--

CREATE FUNCTION util.process_webhook_jobs(batch_size integer DEFAULT 3, max_batches integer DEFAULT 10, timeout_milliseconds integer DEFAULT ((5 * 60) * 1000)) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  rec record;

  -- 当前批
  cur_batch jsonb[] := array[]::jsonb[];
  cur_batch_msg_ids bigint[] := array[]::bigint[];
  batch_count int := 0;

  -- flush 用
  payload jsonb;
  msg_id bigint;
  i int;
begin
  -- 一次性从队列读取（最多 max_batches * batch_size 条）
  for rec in
    select *
    from pgmq.read(
      queue_name => 'webhook_jobs',
      vt => timeout_milliseconds / 1000,
      qty => batch_size * max_batches
    )
  loop
    -- 累加当前批
    cur_batch := cur_batch || (rec.message)::jsonb;
    cur_batch_msg_ids := cur_batch_msg_ids || rec.msg_id;

    -- 满一批就 flush
    if array_length(cur_batch, 1) >= batch_size then
      payload := to_jsonb(cur_batch);

      begin
        perform util.invoke_edge_function(
          name => 'webhook_flow_embedding_ft',
          body => payload,
          timeout_milliseconds => timeout_milliseconds
        );
      exception when others then
        -- ===== 重试逻辑（新增）=====
        for i in 1 .. array_length(cur_batch, 1) loop
          if (cur_batch[i]->'meta'->>'retry')::int < (cur_batch[i]->'meta'->>'max_retry')::int then
            perform pgmq.send(
              queue_name => 'webhook_jobs',
              msg => jsonb_set(
                cur_batch[i],
                '{meta,retry}',
                to_jsonb((cur_batch[i]->'meta'->>'retry')::int + 1),
                true
              )
            );
          end if;
        end loop;

        -- 删除原消息（避免无限重试）
        foreach msg_id in array cur_batch_msg_ids loop
          perform pgmq.delete('webhook_jobs', msg_id);
        end loop;

        -- 清空批缓存
        cur_batch := array[]::jsonb[];
        cur_batch_msg_ids := array[]::bigint[];
        batch_count := batch_count + 1;

        if batch_count >= max_batches then
          return;
        end if;

        continue;
      end;

      -- 调用成功：删除本批消息（原逻辑）
      foreach msg_id in array cur_batch_msg_ids loop
        perform pgmq.delete('webhook_jobs', msg_id);
      end loop;

      cur_batch := array[]::jsonb[];
      cur_batch_msg_ids := array[]::bigint[];
      batch_count := batch_count + 1;

      if batch_count >= max_batches then
        return;
      end if;
    end if;
  end loop;

  -- 处理最后不满一批的
  if array_length(cur_batch, 1) is not null then
    payload := to_jsonb(cur_batch);

    begin
      perform util.invoke_edge_function(
        name => 'webhook_flow_embedding_ft',
        body => payload,
        timeout_milliseconds => timeout_milliseconds
      );
    exception when others then
      -- ===== 重试逻辑（TAIL，新增）=====
      for i in 1 .. array_length(cur_batch, 1) loop
        if (cur_batch[i]->'meta'->>'retry')::int < (cur_batch[i]->'meta'->>'max_retry')::int then
          perform pgmq.send(
            queue_name => 'webhook_jobs',
            msg => jsonb_set(
              cur_batch[i],
              '{meta,retry}',
              to_jsonb((cur_batch[i]->'meta'->>'retry')::int + 1),
              true
            )
          );
        end if;
      end loop;

      foreach msg_id in array cur_batch_msg_ids loop
        perform pgmq.delete('webhook_jobs', msg_id);
      end loop;

      return;
    end;

    foreach msg_id in array cur_batch_msg_ids loop
      perform pgmq.delete('webhook_jobs', msg_id);
    end loop;
  end if;
end;
$$;


ALTER FUNCTION util.process_webhook_jobs(batch_size integer, max_batches integer, timeout_milliseconds integer) OWNER TO postgres;

--
-- Name: project_url(); Type: FUNCTION; Schema: util; Owner: postgres
--

CREATE FUNCTION util.project_url() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  secret_value text;
begin
  -- Retrieve the project URL from Vault
  select decrypted_secret into secret_value from vault.decrypted_secrets where name = 'project_url';
  return secret_value;
end;
$$;


ALTER FUNCTION util.project_url() OWNER TO postgres;

--
-- Name: queue_embedding_webhook(); Type: FUNCTION; Schema: util; Owner: postgres
--

CREATE FUNCTION util.queue_embedding_webhook() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  perform pgmq.send(
    queue_name => 'webhook_jobs',
    msg => jsonb_build_object(
			'meta', jsonb_build_object(
        'retry', 0,
        'max_retry', 3,
        'first_seen_at', now(),
        'source', TG_TABLE_NAME
      ),
      'type', TG_OP,                -- 'UPDATE'
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,       -- 'flows'
      'record', jsonb_build_object( -- 只放必要列，避免超大
        'id', NEW.id,
        'version', NEW.version,
        'json_ordered', NEW.json_ordered    
      ),
      'old_record', jsonb_build_object(
        'id', OLD.id,
        'version', OLD.version,
        'json_ordered', OLD.json_ordered
      )
    )
  );
  return NEW;
end;
$$;


ALTER FUNCTION util.queue_embedding_webhook() OWNER TO postgres;

--
-- Name: queue_embeddings(); Type: FUNCTION; Schema: util; Owner: postgres
--

CREATE FUNCTION util.queue_embeddings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  content_function text = TG_ARGV[0];
  embedding_column text = TG_ARGV[1];
	edge_function text := coalesce(TG_ARGV[2], 'embedding');
begin
  perform pgmq.send(
    queue_name => 'embedding_jobs',
    msg => jsonb_build_object(
      'id', NEW.id,
			'version', NEW.version,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'contentFunction', content_function,
      'embeddingColumn', embedding_column,
			'edgeFunction', edge_function
    )
  );
  return NEW;
end;
$$;


ALTER FUNCTION util.queue_embeddings() OWNER TO postgres;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: a_embedding_jobs; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.a_embedding_jobs (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.a_embedding_jobs OWNER TO postgres;

--
-- Name: a_lca_jobs; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.a_lca_jobs (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.a_lca_jobs OWNER TO postgres;

--
-- Name: a_webhook_jobs; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.a_webhook_jobs (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.a_webhook_jobs OWNER TO postgres;

--
-- Name: q_embedding_jobs; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.q_embedding_jobs (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.q_embedding_jobs OWNER TO postgres;

--
-- Name: q_embedding_jobs_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: postgres
--

ALTER TABLE pgmq.q_embedding_jobs ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_embedding_jobs_msg_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: q_lca_jobs; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.q_lca_jobs (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.q_lca_jobs OWNER TO postgres;

--
-- Name: q_lca_jobs_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: postgres
--

ALTER TABLE pgmq.q_lca_jobs ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_lca_jobs_msg_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: q_webhook_jobs; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.q_webhook_jobs (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.q_webhook_jobs OWNER TO postgres;

--
-- Name: q_webhook_jobs_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: postgres
--

ALTER TABLE pgmq.q_webhook_jobs ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_webhook_jobs_msg_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    review_id uuid NOT NULL,
    reviewer_id uuid DEFAULT auth.uid() NOT NULL,
    "json" json,
    created_at timestamp with time zone DEFAULT now(),
    modified_at timestamp with time zone DEFAULT now(),
    state_code integer DEFAULT 0
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    json_ordered json,
    embedding extensions.vector(1536),
    user_id uuid DEFAULT auth.uid(),
    state_code integer DEFAULT 0,
    version character(9) NOT NULL,
    modified_at timestamp with time zone DEFAULT now(),
    team_id uuid,
    review_id uuid,
    rule_verification boolean,
    reviews jsonb
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: flowproperties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flowproperties (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    json_ordered json,
    embedding extensions.vector(1536),
    user_id uuid DEFAULT auth.uid(),
    state_code integer DEFAULT 0,
    version character(9) NOT NULL,
    modified_at timestamp with time zone DEFAULT now(),
    team_id uuid,
    review_id uuid,
    rule_verification boolean,
    reviews jsonb
);


ALTER TABLE public.flowproperties OWNER TO postgres;

--
-- Name: ilcd; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ilcd (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name character varying(255),
    "json" jsonb,
    created_at timestamp(6) with time zone DEFAULT now(),
    json_ordered json,
    user_id uuid DEFAULT auth.uid(),
    modified_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ilcd OWNER TO postgres;

--
-- Name: lca_active_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_active_snapshots (
    scope text NOT NULL,
    snapshot_id uuid NOT NULL,
    source_hash text NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_by uuid,
    note text
);


ALTER TABLE public.lca_active_snapshots OWNER TO postgres;

--
-- Name: lca_factorization_registry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_factorization_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'prod'::text NOT NULL,
    snapshot_id uuid NOT NULL,
    backend text DEFAULT 'umfpack'::text NOT NULL,
    numeric_options_hash text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    owner_worker_id text,
    lease_until timestamp with time zone,
    prepared_job_id uuid,
    diagnostics jsonb DEFAULT '{}'::jsonb NOT NULL,
    prepared_at timestamp with time zone,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_factorization_registry_backend_chk CHECK ((backend = ANY (ARRAY['umfpack'::text, 'cholmod'::text, 'spqr'::text]))),
    CONSTRAINT lca_factorization_registry_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'building'::text, 'ready'::text, 'failed'::text, 'stale'::text])))
);


ALTER TABLE public.lca_factorization_registry OWNER TO postgres;

--
-- Name: lca_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_type text NOT NULL,
    snapshot_id uuid NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    payload jsonb,
    diagnostics jsonb,
    attempt integer DEFAULT 0 NOT NULL,
    max_attempt integer DEFAULT 3 NOT NULL,
    requested_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    request_key text,
    idempotency_key text,
    CONSTRAINT lca_jobs_attempt_chk CHECK (((attempt >= 0) AND (max_attempt >= 0) AND (attempt <= max_attempt))),
    CONSTRAINT lca_jobs_status_chk CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'ready'::text, 'completed'::text, 'failed'::text, 'stale'::text]))),
    CONSTRAINT lca_jobs_type_chk CHECK ((job_type = ANY (ARRAY['prepare_factorization'::text, 'solve_one'::text, 'solve_batch'::text, 'solve_all_unit'::text, 'invalidate_factorization'::text, 'rebuild_factorization'::text, 'build_snapshot'::text])))
);


ALTER TABLE public.lca_jobs OWNER TO postgres;

--
-- Name: lca_latest_all_unit_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_latest_all_unit_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_id uuid NOT NULL,
    job_id uuid NOT NULL,
    result_id uuid NOT NULL,
    query_artifact_url text NOT NULL,
    query_artifact_sha256 text NOT NULL,
    query_artifact_byte_size bigint NOT NULL,
    query_artifact_format text NOT NULL,
    status text DEFAULT 'ready'::text NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_latest_all_unit_results_size_chk CHECK ((query_artifact_byte_size >= 0)),
    CONSTRAINT lca_latest_all_unit_results_status_chk CHECK ((status = ANY (ARRAY['ready'::text, 'stale'::text, 'failed'::text])))
);


ALTER TABLE public.lca_latest_all_unit_results OWNER TO postgres;

--
-- Name: lca_network_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_network_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'full_library'::text NOT NULL,
    process_filter jsonb,
    lcia_method_id uuid,
    lcia_method_version character(9),
    provider_matching_rule text DEFAULT 'strict_unique_provider'::text NOT NULL,
    source_hash text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_network_snapshots_provider_rule_chk CHECK ((provider_matching_rule = ANY (ARRAY['strict_unique_provider'::text, 'equal_split_multi_provider'::text, 'custom_weighted_provider'::text]))),
    CONSTRAINT lca_network_snapshots_scope_chk CHECK ((scope = 'full_library'::text)),
    CONSTRAINT lca_network_snapshots_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'ready'::text, 'stale'::text, 'failed'::text])))
);


ALTER TABLE public.lca_network_snapshots OWNER TO postgres;

--
-- Name: lca_result_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_result_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'prod'::text NOT NULL,
    snapshot_id uuid NOT NULL,
    request_key text NOT NULL,
    request_payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    job_id uuid,
    result_id uuid,
    error_code text,
    error_message text,
    hit_count bigint DEFAULT 0 NOT NULL,
    last_accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_result_cache_hit_count_chk CHECK ((hit_count >= 0)),
    CONSTRAINT lca_result_cache_request_key_chk CHECK ((length(request_key) > 0)),
    CONSTRAINT lca_result_cache_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'ready'::text, 'failed'::text, 'stale'::text])))
);


ALTER TABLE public.lca_result_cache OWNER TO postgres;

--
-- Name: lca_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    snapshot_id uuid NOT NULL,
    payload jsonb,
    diagnostics jsonb,
    artifact_url text,
    artifact_sha256 text,
    artifact_byte_size bigint,
    artifact_format text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_results_artifact_size_chk CHECK (((artifact_byte_size IS NULL) OR (artifact_byte_size >= 0)))
);


ALTER TABLE public.lca_results OWNER TO postgres;

--
-- Name: lca_snapshot_artifacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_snapshot_artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_id uuid NOT NULL,
    artifact_url text NOT NULL,
    artifact_sha256 text NOT NULL,
    artifact_byte_size bigint NOT NULL,
    artifact_format text NOT NULL,
    process_count integer NOT NULL,
    flow_count integer NOT NULL,
    impact_count integer NOT NULL,
    a_nnz bigint NOT NULL,
    b_nnz bigint NOT NULL,
    c_nnz bigint NOT NULL,
    coverage jsonb,
    status text DEFAULT 'ready'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_snapshot_artifacts_counts_chk CHECK (((process_count >= 0) AND (flow_count >= 0) AND (impact_count >= 0) AND (a_nnz >= 0) AND (b_nnz >= 0) AND (c_nnz >= 0))),
    CONSTRAINT lca_snapshot_artifacts_size_chk CHECK ((artifact_byte_size >= 0)),
    CONSTRAINT lca_snapshot_artifacts_status_chk CHECK ((status = ANY (ARRAY['ready'::text, 'stale'::text, 'failed'::text])))
);


ALTER TABLE public.lca_snapshot_artifacts OWNER TO postgres;

--
-- Name: lciamethods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lciamethods (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp(6) with time zone DEFAULT now(),
    json_ordered json,
    user_id uuid DEFAULT auth.uid(),
    state_code integer DEFAULT 0,
    version character(9) NOT NULL,
    modified_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lciamethods OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid NOT NULL,
    data_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    modified_at timestamp with time zone DEFAULT now(),
    state_code integer DEFAULT 0,
    data_version character(9),
    reviewer_id jsonb,
    "json" jsonb,
    deadline timestamp with time zone
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    user_id uuid NOT NULL,
    team_id uuid NOT NULL,
    role character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    modified_at timestamp with time zone
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sources (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    json_ordered json,
    embedding extensions.vector(1536),
    user_id uuid DEFAULT auth.uid(),
    state_code integer DEFAULT 0,
    version character(9) NOT NULL,
    modified_at timestamp with time zone DEFAULT now(),
    team_id uuid,
    review_id uuid,
    rule_verification boolean,
    reviews jsonb
);


ALTER TABLE public.sources OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    modified_at timestamp with time zone,
    rank integer DEFAULT '-1'::integer,
    is_public boolean DEFAULT false
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: unitgroups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unitgroups (
    id uuid NOT NULL,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    json_ordered json,
    embedding extensions.vector(1536),
    user_id uuid DEFAULT auth.uid(),
    state_code integer DEFAULT 0,
    version character(9) NOT NULL,
    modified_at timestamp with time zone DEFAULT now(),
    team_id uuid,
    review_id uuid,
    rule_verification boolean,
    reviews jsonb
);


ALTER TABLE public.unitgroups OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    raw_user_meta_data jsonb,
    contact jsonb
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: hooks; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.hooks (
    id bigint NOT NULL,
    hook_table_id integer NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id bigint
);


ALTER TABLE supabase_functions.hooks OWNER TO supabase_functions_admin;

--
-- Name: TABLE hooks; Type: COMMENT; Schema: supabase_functions; Owner: supabase_functions_admin
--

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';


--
-- Name: hooks_id_seq; Type: SEQUENCE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE SEQUENCE supabase_functions.hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE supabase_functions.hooks_id_seq OWNER TO supabase_functions_admin;

--
-- Name: hooks_id_seq; Type: SEQUENCE OWNED BY; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER SEQUENCE supabase_functions.hooks_id_seq OWNED BY supabase_functions.hooks.id;


--
-- Name: migrations; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE supabase_functions.migrations OWNER TO supabase_functions_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


ALTER TABLE supabase_migrations.seed_files OWNER TO postgres;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: hooks id; Type: DEFAULT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks ALTER COLUMN id SET DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: a_embedding_jobs a_embedding_jobs_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.a_embedding_jobs
    ADD CONSTRAINT a_embedding_jobs_pkey PRIMARY KEY (msg_id);


--
-- Name: a_lca_jobs a_lca_jobs_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.a_lca_jobs
    ADD CONSTRAINT a_lca_jobs_pkey PRIMARY KEY (msg_id);


--
-- Name: a_webhook_jobs a_webhook_jobs_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.a_webhook_jobs
    ADD CONSTRAINT a_webhook_jobs_pkey PRIMARY KEY (msg_id);


--
-- Name: q_embedding_jobs q_embedding_jobs_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.q_embedding_jobs
    ADD CONSTRAINT q_embedding_jobs_pkey PRIMARY KEY (msg_id);


--
-- Name: q_lca_jobs q_lca_jobs_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.q_lca_jobs
    ADD CONSTRAINT q_lca_jobs_pkey PRIMARY KEY (msg_id);


--
-- Name: q_webhook_jobs q_webhook_jobs_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.q_webhook_jobs
    ADD CONSTRAINT q_webhook_jobs_pkey PRIMARY KEY (msg_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (review_id, reviewer_id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id, version);


--
-- Name: flowproperties flowproperties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flowproperties
    ADD CONSTRAINT flowproperties_pkey PRIMARY KEY (id, version);


--
-- Name: flows flows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flows
    ADD CONSTRAINT flows_pkey PRIMARY KEY (id, version);


--
-- Name: ilcd ilcd_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ilcd
    ADD CONSTRAINT ilcd_pkey PRIMARY KEY (id);


--
-- Name: lca_active_snapshots lca_active_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_active_snapshots
    ADD CONSTRAINT lca_active_snapshots_pkey PRIMARY KEY (scope);


--
-- Name: lca_factorization_registry lca_factorization_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_factorization_registry
    ADD CONSTRAINT lca_factorization_registry_pkey PRIMARY KEY (id);


--
-- Name: lca_factorization_registry lca_factorization_registry_scope_snapshot_backend_opts_uk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_factorization_registry
    ADD CONSTRAINT lca_factorization_registry_scope_snapshot_backend_opts_uk UNIQUE (scope, snapshot_id, backend, numeric_options_hash);


--
-- Name: lca_jobs lca_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_jobs
    ADD CONSTRAINT lca_jobs_pkey PRIMARY KEY (id);


--
-- Name: lca_latest_all_unit_results lca_latest_all_unit_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_latest_all_unit_results
    ADD CONSTRAINT lca_latest_all_unit_results_pkey PRIMARY KEY (id);


--
-- Name: lca_latest_all_unit_results lca_latest_all_unit_results_snapshot_uk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_latest_all_unit_results
    ADD CONSTRAINT lca_latest_all_unit_results_snapshot_uk UNIQUE (snapshot_id);


--
-- Name: lca_network_snapshots lca_network_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_network_snapshots
    ADD CONSTRAINT lca_network_snapshots_pkey PRIMARY KEY (id);


--
-- Name: lca_result_cache lca_result_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_result_cache
    ADD CONSTRAINT lca_result_cache_pkey PRIMARY KEY (id);


--
-- Name: lca_result_cache lca_result_cache_scope_snapshot_request_key_uk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_result_cache
    ADD CONSTRAINT lca_result_cache_scope_snapshot_request_key_uk UNIQUE (scope, snapshot_id, request_key);


--
-- Name: lca_results lca_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_results
    ADD CONSTRAINT lca_results_pkey PRIMARY KEY (id);


--
-- Name: lca_snapshot_artifacts lca_snapshot_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_snapshot_artifacts
    ADD CONSTRAINT lca_snapshot_artifacts_pkey PRIMARY KEY (id);


--
-- Name: lciamethods lciamethods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lciamethods
    ADD CONSTRAINT lciamethods_pkey PRIMARY KEY (id, version);


--
-- Name: lifecyclemodels lifecyclemodels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lifecyclemodels
    ADD CONSTRAINT lifecyclemodels_pkey PRIMARY KEY (id, version);


--
-- Name: processes processes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_pkey PRIMARY KEY (id, version);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (user_id, team_id);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id, version);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: unitgroups unitgroups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unitgroups
    ADD CONSTRAINT unitgroups_pkey PRIMARY KEY (id, version);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: hooks hooks_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks
    ADD CONSTRAINT hooks_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: archived_at_idx_embedding_jobs; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_embedding_jobs ON pgmq.a_embedding_jobs USING btree (archived_at);


--
-- Name: archived_at_idx_lca_jobs; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_lca_jobs ON pgmq.a_lca_jobs USING btree (archived_at);


--
-- Name: archived_at_idx_webhook_jobs; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_webhook_jobs ON pgmq.a_webhook_jobs USING btree (archived_at);


--
-- Name: q_embedding_jobs_vt_idx; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX q_embedding_jobs_vt_idx ON pgmq.q_embedding_jobs USING btree (vt);


--
-- Name: q_lca_jobs_vt_idx; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX q_lca_jobs_vt_idx ON pgmq.q_lca_jobs USING btree (vt);


--
-- Name: q_webhook_jobs_vt_idx; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX q_webhook_jobs_vt_idx ON pgmq.q_webhook_jobs USING btree (vt);


--
-- Name: contacts_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_created_at_idx ON public.contacts USING btree (created_at DESC);


--
-- Name: contacts_json_dataversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_json_dataversion ON public.contacts USING btree (((((("json" -> 'contactDataSet'::text) -> 'administrativeInformation'::text) -> 'publicationAndOwnership'::text) ->> 'common:dataSetVersion'::text)));


--
-- Name: contacts_json_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_json_email ON public.contacts USING btree (((((("json" -> 'contactDataSet'::text) -> 'contactInformation'::text) -> 'dataSetInformation'::text) ->> 'email'::text)));


--
-- Name: contacts_json_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_json_idx ON public.contacts USING gin ("json");


--
-- Name: contacts_json_ordered_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_json_ordered_vector ON public.contacts USING hnsw (embedding extensions.vector_cosine_ops);


--
-- Name: contacts_json_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_json_pgroonga ON public.contacts USING pgroonga ("json" extensions.pgroonga_jsonb_full_text_search_ops_v2);


--
-- Name: contacts_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_user_id_created_at_idx ON public.contacts USING btree (user_id, created_at DESC);


--
-- Name: file_name_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX file_name_index ON public.ilcd USING btree (file_name);


--
-- Name: flowproperties_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flowproperties_created_at_idx ON public.flowproperties USING btree (created_at DESC);


--
-- Name: flowproperties_json_dataversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flowproperties_json_dataversion ON public.flowproperties USING btree (((((("json" -> 'flowPropertyDataSet'::text) -> 'administrativeInformation'::text) -> 'publicationAndOwnership'::text) ->> 'common:dataSetVersion'::text)));


--
-- Name: flowproperties_json_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flowproperties_json_idx ON public.flowproperties USING gin ("json");


--
-- Name: flowproperties_json_ordered_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flowproperties_json_ordered_vector ON public.flowproperties USING hnsw (embedding extensions.vector_cosine_ops);


--
-- Name: flowproperties_json_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flowproperties_json_pgroonga ON public.flowproperties USING pgroonga ("json" extensions.pgroonga_jsonb_full_text_search_ops_v2);


--
-- Name: flowproperties_json_refobjectid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flowproperties_json_refobjectid ON public.flowproperties USING btree ((((((("json" -> 'flowPropertyDataSet'::text) -> 'flowPropertiesInformation'::text) -> 'quantitativeReference'::text) -> 'referenceToReferenceUnitGroup'::text) ->> '@refObjectId'::text)));


--
-- Name: flowproperties_modified_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flowproperties_modified_at_idx ON public.flowproperties USING btree (modified_at);


--
-- Name: flowproperties_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flowproperties_user_id_created_at_idx ON public.flowproperties USING btree (user_id, created_at DESC);


--
-- Name: flows_composite_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_composite_idx ON public.flows USING btree (((((("json" -> 'flowDataSet'::text) -> 'modellingAndValidation'::text) -> 'LCIMethod'::text) ->> 'typeOfDataSet'::text)), state_code, modified_at DESC);


--
-- Name: flows_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_created_at_idx ON public.flows USING btree (created_at DESC);


--
-- Name: flows_embedding_ft_hnsw_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_embedding_ft_hnsw_idx ON public.flows USING hnsw (embedding_ft extensions.vector_cosine_ops);


--
-- Name: flows_embedding_hnsw_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_embedding_hnsw_idx ON public.flows USING hnsw (embedding extensions.halfvec_cosine_ops);


--
-- Name: flows_json_casnumber; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_json_casnumber ON public.flows USING btree (((((("json" -> 'flowDataSet'::text) -> 'flowInformation'::text) -> 'dataSetInformation'::text) ->> 'CASNumber'::text)));


--
-- Name: flows_json_dataversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_json_dataversion ON public.flows USING btree (((((("json" -> 'flowDataSet'::text) -> 'administrativeInformation'::text) -> 'publicationAndOwnership'::text) ->> 'common:dataSetVersion'::text)));


--
-- Name: flows_json_locationofsupply; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_json_locationofsupply ON public.flows USING btree (((((("json" -> 'flowDataSet'::text) -> 'flowInformation'::text) -> 'geography'::text) ->> 'locationOfSupply'::text)));


--
-- Name: flows_json_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_json_pgroonga ON public.flows USING pgroonga ("json" extensions.pgroonga_jsonb_full_text_search_ops_v2);


--
-- Name: flows_json_typeofdataset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_json_typeofdataset ON public.flows USING btree (((((("json" -> 'flowDataSet'::text) -> 'modellingAndValidation'::text) -> 'LCIMethod'::text) ->> 'typeOfDataSet'::text)));


--
-- Name: flows_modified_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_modified_at_idx ON public.flows USING btree (modified_at);


--
-- Name: flows_not_emissions_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_not_emissions_idx ON public.flows USING btree (state_code, modified_at DESC) WHERE (NOT ("json" @> '{"flowDataSet": {"flowInformation": {"dataSetInformation": {"classificationInformation": {"common:elementaryFlowCategorization": {"common:category": [{"#text": "Emissions", "@level": "0"}]}}}}}}'::jsonb));


--
-- Name: flows_review_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_review_id_idx ON public.flows USING btree (review_id);


--
-- Name: flows_state_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_state_code_idx ON public.flows USING btree (state_code);


--
-- Name: flows_team_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_team_id_idx ON public.flows USING btree (team_id);


--
-- Name: flows_text_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_text_pgroonga ON public.flows USING pgroonga (extracted_text);


--
-- Name: flows_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flows_user_id_created_at_idx ON public.flows USING btree (user_id, created_at DESC);


--
-- Name: ilcd_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ilcd_created_at_idx ON public.ilcd USING btree (created_at DESC);


--
-- Name: ilcd_json_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ilcd_json_idx ON public.ilcd USING gin ("json");


--
-- Name: ilcd_modified_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ilcd_modified_at_idx ON public.ilcd USING btree (modified_at);


--
-- Name: ilcd_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ilcd_user_id_created_at_idx ON public.ilcd USING btree (user_id, created_at DESC);


--
-- Name: lca_active_snapshots_snapshot_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_active_snapshots_snapshot_idx ON public.lca_active_snapshots USING btree (snapshot_id);


--
-- Name: lca_factorization_registry_snapshot_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_factorization_registry_snapshot_status_idx ON public.lca_factorization_registry USING btree (snapshot_id, status, updated_at DESC);


--
-- Name: lca_factorization_registry_status_lease_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_factorization_registry_status_lease_idx ON public.lca_factorization_registry USING btree (status, lease_until);


--
-- Name: lca_jobs_idempotency_key_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lca_jobs_idempotency_key_uidx ON public.lca_jobs USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: lca_jobs_snapshot_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_jobs_snapshot_created_idx ON public.lca_jobs USING btree (snapshot_id, created_at DESC);


--
-- Name: lca_jobs_snapshot_type_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_jobs_snapshot_type_status_created_idx ON public.lca_jobs USING btree (snapshot_id, job_type, status, created_at DESC);


--
-- Name: lca_jobs_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_jobs_status_created_idx ON public.lca_jobs USING btree (status, created_at);


--
-- Name: lca_latest_all_unit_results_computed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_latest_all_unit_results_computed_idx ON public.lca_latest_all_unit_results USING btree (computed_at DESC);


--
-- Name: lca_latest_all_unit_results_result_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_latest_all_unit_results_result_idx ON public.lca_latest_all_unit_results USING btree (result_id);


--
-- Name: lca_network_snapshots_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_network_snapshots_status_created_idx ON public.lca_network_snapshots USING btree (status, created_at DESC);


--
-- Name: lca_network_snapshots_updated_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_network_snapshots_updated_idx ON public.lca_network_snapshots USING btree (updated_at DESC);


--
-- Name: lca_result_cache_job_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lca_result_cache_job_uidx ON public.lca_result_cache USING btree (job_id) WHERE (job_id IS NOT NULL);


--
-- Name: lca_result_cache_last_accessed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_result_cache_last_accessed_idx ON public.lca_result_cache USING btree (last_accessed_at DESC);


--
-- Name: lca_result_cache_lookup_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_result_cache_lookup_idx ON public.lca_result_cache USING btree (scope, snapshot_id, status, updated_at DESC);


--
-- Name: lca_result_cache_result_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lca_result_cache_result_uidx ON public.lca_result_cache USING btree (result_id) WHERE (result_id IS NOT NULL);


--
-- Name: lca_results_job_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_results_job_idx ON public.lca_results USING btree (job_id);


--
-- Name: lca_results_snapshot_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_results_snapshot_created_idx ON public.lca_results USING btree (snapshot_id, created_at DESC);


--
-- Name: lca_snapshot_artifacts_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_snapshot_artifacts_created_idx ON public.lca_snapshot_artifacts USING btree (created_at DESC);


--
-- Name: lca_snapshot_artifacts_snapshot_format_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lca_snapshot_artifacts_snapshot_format_key ON public.lca_snapshot_artifacts USING btree (snapshot_id, artifact_format);


--
-- Name: lca_snapshot_artifacts_snapshot_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_snapshot_artifacts_snapshot_status_idx ON public.lca_snapshot_artifacts USING btree (snapshot_id, status, created_at DESC);


--
-- Name: lciamethods_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lciamethods_created_at_idx ON public.lciamethods USING btree (created_at DESC);


--
-- Name: lciamethods_json_dataversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lciamethods_json_dataversion ON public.lciamethods USING btree (((((("json" -> 'LCIAMethodDataSetDataSet'::text) -> 'administrativeInformation'::text) -> 'publicationAndOwnership'::text) ->> 'common:dataSetVersion'::text)));


--
-- Name: lciamethods_json_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lciamethods_json_idx ON public.lciamethods USING gin ("json");


--
-- Name: lciamethods_json_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lciamethods_json_pgroonga ON public.lciamethods USING pgroonga ("json" extensions.pgroonga_jsonb_full_text_search_ops_v2);


--
-- Name: lciamethods_modified_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lciamethods_modified_at_idx ON public.lciamethods USING btree (modified_at);


--
-- Name: lciamethods_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lciamethods_user_id_created_at_idx ON public.lciamethods USING btree (user_id, created_at DESC);


--
-- Name: lifecyclemodels_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_created_at_idx ON public.lifecyclemodels USING btree (created_at DESC);


--
-- Name: lifecyclemodels_embedding_ft_hnsw_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_embedding_ft_hnsw_idx ON public.lifecyclemodels USING hnsw (embedding_ft extensions.vector_cosine_ops);


--
-- Name: lifecyclemodels_embedding_hnsw_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_embedding_hnsw_idx ON public.lifecyclemodels USING hnsw (embedding extensions.halfvec_cosine_ops);


--
-- Name: lifecyclemodels_json_dataversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_json_dataversion ON public.lifecyclemodels USING btree (((((("json" -> 'lifeCycleModelDataSet'::text) -> 'administrativeInformation'::text) -> 'publicationAndOwnership'::text) ->> 'common:dataSetVersion'::text)));


--
-- Name: lifecyclemodels_json_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_json_idx ON public.lifecyclemodels USING gin ("json");


--
-- Name: lifecyclemodels_json_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_json_pgroonga ON public.lifecyclemodels USING pgroonga ("json" extensions.pgroonga_jsonb_full_text_search_ops_v2);


--
-- Name: lifecyclemodels_json_tg_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_json_tg_idx ON public.lifecyclemodels USING gin (json_tg);


--
-- Name: lifecyclemodels_modified_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_modified_at_idx ON public.lifecyclemodels USING btree (modified_at);


--
-- Name: lifecyclemodels_text_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_text_pgroonga ON public.lifecyclemodels USING pgroonga (extracted_text);


--
-- Name: lifecyclemodels_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lifecyclemodels_user_id_created_at_idx ON public.lifecyclemodels USING btree (user_id, created_at DESC);


--
-- Name: processes_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_created_at_idx ON public.processes USING btree (created_at DESC);


--
-- Name: processes_embedding_ft_hnsw_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_embedding_ft_hnsw_idx ON public.processes USING hnsw (embedding_ft extensions.vector_cosine_ops);


--
-- Name: processes_embedding_hnsw_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_embedding_hnsw_idx ON public.processes USING hnsw (embedding extensions.halfvec_cosine_ops);


--
-- Name: processes_json_dataversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_json_dataversion ON public.processes USING btree (((((("json" -> 'processDataSet'::text) -> 'administrativeInformation'::text) -> 'publicationAndOwnership'::text) ->> 'common:dataSetVersion'::text)));


--
-- Name: processes_json_exchange_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_json_exchange_gin_idx ON public.processes USING gin ((((("json" -> 'processDataSet'::text) -> 'exchanges'::text) -> 'exchange'::text)));


--
-- Name: processes_json_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_json_location ON public.processes USING btree ((((((("json" -> 'processDataSet'::text) -> 'processInformation'::text) -> 'geography'::text) -> 'locationOfOperationSupplyOrProduction'::text) ->> '@location'::text)));


--
-- Name: processes_json_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_json_pgroonga ON public.processes USING pgroonga ("json" extensions.pgroonga_jsonb_full_text_search_ops_v2);


--
-- Name: processes_json_referenceyear; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_json_referenceyear ON public.processes USING btree (((((("json" -> 'processDataSet'::text) -> 'processInformation'::text) -> 'time'::text) ->> 'common:referenceYear'::text)));


--
-- Name: processes_modified_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_modified_at_idx ON public.processes USING btree (modified_at);


--
-- Name: processes_review_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_review_id_idx ON public.processes USING btree (review_id);


--
-- Name: processes_rule_verification_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_rule_verification_idx ON public.processes USING btree (rule_verification);


--
-- Name: processes_state_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_state_code_idx ON public.processes USING btree (state_code);


--
-- Name: processes_team_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_team_id_idx ON public.processes USING btree (team_id);


--
-- Name: processes_text_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_text_pgroonga ON public.processes USING pgroonga (extracted_text);


--
-- Name: processes_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX processes_user_id_created_at_idx ON public.processes USING btree (user_id, created_at DESC);


--
-- Name: reviews_data_id_data_version_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reviews_data_id_data_version_idx ON public.reviews USING btree (data_id, data_version);


--
-- Name: roles_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX roles_role_idx ON public.roles USING btree (role);


--
-- Name: roles_team_id_user_id_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX roles_team_id_user_id_role_idx ON public.roles USING btree (team_id, user_id, role);


--
-- Name: sources_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_created_at_idx ON public.sources USING btree (created_at DESC);


--
-- Name: sources_json_dataversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_json_dataversion ON public.sources USING btree (((((("json" -> 'sourceDataSet'::text) -> 'administrativeInformation'::text) -> 'publicationAndOwnership'::text) ->> 'common:dataSetVersion'::text)));


--
-- Name: sources_json_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_json_idx ON public.sources USING gin ("json");


--
-- Name: sources_json_ordered_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_json_ordered_vector ON public.sources USING hnsw (embedding extensions.vector_cosine_ops);


--
-- Name: sources_json_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_json_pgroonga ON public.sources USING pgroonga ("json" extensions.pgroonga_jsonb_full_text_search_ops_v2);


--
-- Name: sources_json_publicationtype; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_json_publicationtype ON public.sources USING btree (((((("json" -> 'sourceDataSet'::text) -> 'sourceInformation'::text) -> 'dataSetInformation'::text) ->> 'publicationType'::text)));


--
-- Name: sources_json_sourcecitation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_json_sourcecitation ON public.sources USING btree (((((("json" -> 'sourceDataSet'::text) -> 'sourceInformation'::text) -> 'dataSetInformation'::text) ->> 'sourceCitation'::text)));


--
-- Name: sources_modified_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_modified_at_idx ON public.sources USING btree (modified_at);


--
-- Name: sources_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sources_user_id_created_at_idx ON public.sources USING btree (user_id, created_at DESC);


--
-- Name: unitgroups_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX unitgroups_created_at_idx ON public.unitgroups USING btree (created_at DESC);


--
-- Name: unitgroups_json_dataversion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX unitgroups_json_dataversion ON public.unitgroups USING btree (((((("json" -> 'unitGroupDataSet'::text) -> 'administrativeInformation'::text) -> 'publicationAndOwnership'::text) ->> 'common:dataSetVersion'::text)));


--
-- Name: unitgroups_json_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX unitgroups_json_idx ON public.unitgroups USING gin ("json");


--
-- Name: unitgroups_json_ordered_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX unitgroups_json_ordered_vector ON public.unitgroups USING hnsw (embedding extensions.vector_cosine_ops);


--
-- Name: unitgroups_json_pgroonga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX unitgroups_json_pgroonga ON public.unitgroups USING pgroonga ("json" extensions.pgroonga_jsonb_full_text_search_ops_v2);


--
-- Name: unitgroups_json_referencetoreferenceunit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX unitgroups_json_referencetoreferenceunit ON public.unitgroups USING btree (((((("json" -> 'unitGroupDataSet'::text) -> 'unitGroupInformation'::text) -> 'quantitativeReference'::text) ->> 'referenceToReferenceUnit'::text)));


--
-- Name: unitgroups_modified_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX unitgroups_modified_at_idx ON public.unitgroups USING btree (modified_at);


--
-- Name: unitgroups_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX unitgroups_user_id_created_at_idx ON public.unitgroups USING btree (user_id, created_at DESC);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: supabase_functions_hooks_h_table_id_h_name_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);


--
-- Name: supabase_functions_hooks_request_id_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);


--
-- Name: users users_trigger; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER users_trigger AFTER INSERT OR DELETE OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_auth_users_to_public_users();


--
-- Name: contacts contacts_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER contacts_json_sync_trigger BEFORE INSERT OR UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.contacts_sync_jsonb_version();


--
-- Name: contacts contacts_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER contacts_set_modified_at_trigger BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: flows flow_embedding_ft_on_extract_md_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flow_embedding_ft_on_extract_md_update AFTER UPDATE OF extracted_md ON public.flows FOR EACH ROW WHEN ((old.extracted_md IS DISTINCT FROM new.extracted_md)) EXECUTE FUNCTION util.queue_embeddings('flows_embedding_ft_input', 'embedding_ft', 'embedding_ft');


--
-- Name: flows flow_extract_md_trigger_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flow_extract_md_trigger_insert AFTER INSERT ON public.flows FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_flow_embedding_ft', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key", "x_region":"us-east-1"}', '{}', '1000');


--
-- Name: flows flow_extract_md_trigger_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flow_extract_md_trigger_update AFTER UPDATE OF "json" ON public.flows FOR EACH ROW WHEN ((new."json" IS DISTINCT FROM old."json")) EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_flow_embedding_ft', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key", "x_region":"us-east-1"}', '{}', '1000');


--
-- Name: flows flow_extract_md_trigger_update_flag; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flow_extract_md_trigger_update_flag AFTER UPDATE OF embedding_flag ON public.flows FOR EACH ROW WHEN ((new.embedding_flag IS DISTINCT FROM old.embedding_flag)) EXECUTE FUNCTION util.queue_embedding_webhook();


--
-- Name: flows flow_extract_text_trigger_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flow_extract_text_trigger_insert AFTER INSERT ON public.flows FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_flow_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');


--
-- Name: flows flow_extract_text_trigger_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flow_extract_text_trigger_update AFTER UPDATE OF "json" ON public.flows FOR EACH ROW WHEN ((new."json" IS DISTINCT FROM old."json")) EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_flow_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');


--
-- Name: flowproperties flowproperties_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flowproperties_json_sync_trigger BEFORE INSERT OR UPDATE ON public.flowproperties FOR EACH ROW EXECUTE FUNCTION public.flowproperties_sync_jsonb_version();


--
-- Name: flowproperties flowproperties_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flowproperties_set_modified_at_trigger BEFORE UPDATE ON public.flowproperties FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: flows flows_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flows_json_sync_trigger BEFORE INSERT OR UPDATE ON public.flows FOR EACH ROW EXECUTE FUNCTION public.flows_sync_jsonb_version();


--
-- Name: flows flows_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flows_set_modified_at_trigger BEFORE UPDATE ON public.flows FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: ilcd ilcd_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER ilcd_json_sync_trigger BEFORE INSERT OR UPDATE ON public.ilcd FOR EACH ROW EXECUTE FUNCTION public.sync_json_to_jsonb();


--
-- Name: ilcd ilcd_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER ilcd_set_modified_at_trigger BEFORE UPDATE ON public.ilcd FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: lciamethods lciamethods_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lciamethods_json_sync_trigger BEFORE INSERT OR UPDATE ON public.lciamethods FOR EACH ROW EXECUTE FUNCTION public.lciamethods_sync_jsonb_version();


--
-- Name: lciamethods lciamethods_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lciamethods_set_modified_at_trigger BEFORE UPDATE ON public.lciamethods FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: lifecyclemodels lifecyclemodel_embedding_ft_on_extract_md_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lifecyclemodel_embedding_ft_on_extract_md_update AFTER UPDATE OF extracted_md ON public.lifecyclemodels FOR EACH ROW WHEN ((old.extracted_md IS DISTINCT FROM new.extracted_md)) EXECUTE FUNCTION util.queue_embeddings('lifecyclemodels_embedding_ft_input', 'embedding_ft', 'embedding_ft');


--
-- Name: lifecyclemodels lifecyclemodel_extract_md_trigger_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lifecyclemodel_extract_md_trigger_insert AFTER INSERT ON public.lifecyclemodels FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_model_embedding_ft', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key", "x_region":"us-east-1"}', '{}', '1000');


--
-- Name: lifecyclemodels lifecyclemodel_extract_md_trigger_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lifecyclemodel_extract_md_trigger_update AFTER UPDATE OF "json" ON public.lifecyclemodels FOR EACH ROW WHEN ((new."json" IS DISTINCT FROM old."json")) EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_model_embedding_ft', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key", "x_region":"us-east-1"}', '{}', '1000');


--
-- Name: lifecyclemodels lifecyclemodel_extract_md_trigger_update_flag; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lifecyclemodel_extract_md_trigger_update_flag AFTER UPDATE OF embedding_flag ON public.lifecyclemodels FOR EACH ROW WHEN ((new.embedding_flag IS DISTINCT FROM old.embedding_flag)) EXECUTE FUNCTION util.queue_embedding_webhook();


--
-- Name: lifecyclemodels lifecyclemodels_extract_text_trigger_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lifecyclemodels_extract_text_trigger_insert AFTER INSERT ON public.lifecyclemodels FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_model_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');


--
-- Name: lifecyclemodels lifecyclemodels_extract_text_trigger_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lifecyclemodels_extract_text_trigger_update AFTER UPDATE OF "json" ON public.lifecyclemodels FOR EACH ROW WHEN ((new."json" IS DISTINCT FROM old."json")) EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_model_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');


--
-- Name: lifecyclemodels lifecyclemodels_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lifecyclemodels_json_sync_trigger BEFORE INSERT OR UPDATE ON public.lifecyclemodels FOR EACH ROW EXECUTE FUNCTION public.lifecyclemodels_sync_jsonb_version();


--
-- Name: lifecyclemodels lifecyclemodels_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lifecyclemodels_set_modified_at_trigger BEFORE UPDATE ON public.lifecyclemodels FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: processes process_embedding_ft_on_extract_md_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER process_embedding_ft_on_extract_md_update AFTER UPDATE OF extracted_md ON public.processes FOR EACH ROW WHEN ((old.extracted_md IS DISTINCT FROM new.extracted_md)) EXECUTE FUNCTION util.queue_embeddings('processes_embedding_ft_input', 'embedding_ft', 'embedding_ft');


--
-- Name: processes process_extract_md_trigger_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER process_extract_md_trigger_insert AFTER INSERT ON public.processes FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_process_embedding_ft', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key", "x_region":"us-east-1"}', '{}', '1000');


--
-- Name: processes process_extract_md_trigger_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER process_extract_md_trigger_update AFTER UPDATE OF "json" ON public.processes FOR EACH ROW WHEN ((new."json" IS DISTINCT FROM old."json")) EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_process_embedding_ft', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key", "x_region":"us-east-1"}', '{}', '1000');


--
-- Name: processes process_extract_md_trigger_update_flag; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER process_extract_md_trigger_update_flag AFTER UPDATE OF embedding_flag ON public.processes FOR EACH ROW WHEN ((new.embedding_flag IS DISTINCT FROM old.embedding_flag)) EXECUTE FUNCTION util.queue_embedding_webhook();


--
-- Name: processes process_extract_text_trigger_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER process_extract_text_trigger_insert AFTER INSERT ON public.processes FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_process_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');


--
-- Name: processes process_extract_text_trigger_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER process_extract_text_trigger_update AFTER UPDATE OF "json" ON public.processes FOR EACH ROW WHEN ((new."json" IS DISTINCT FROM old."json")) EXECUTE FUNCTION supabase_functions.http_request('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_process_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');


--
-- Name: processes processes_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER processes_json_sync_trigger BEFORE INSERT OR UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.processes_sync_jsonb_version();


--
-- Name: processes processes_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER processes_set_modified_at_trigger BEFORE UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: roles roles_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER roles_set_modified_at_trigger BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: sources sources_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sources_json_sync_trigger BEFORE INSERT OR UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.sources_sync_jsonb_version();


--
-- Name: sources sources_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sources_set_modified_at_trigger BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: teams teams_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER teams_set_modified_at_trigger BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: unitgroups unitgroups_json_sync_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER unitgroups_json_sync_trigger BEFORE INSERT OR UPDATE ON public.unitgroups FOR EACH ROW EXECUTE FUNCTION public.unitgroups_sync_jsonb_version();


--
-- Name: unitgroups unitgroups_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER unitgroups_set_modified_at_trigger BEFORE UPDATE ON public.unitgroups FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: comments comments_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id);


--
-- Name: lca_active_snapshots lca_active_snapshots_snapshot_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_active_snapshots
    ADD CONSTRAINT lca_active_snapshots_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES public.lca_network_snapshots(id) ON DELETE RESTRICT;


--
-- Name: lca_factorization_registry lca_factorization_registry_prepared_job_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_factorization_registry
    ADD CONSTRAINT lca_factorization_registry_prepared_job_fk FOREIGN KEY (prepared_job_id) REFERENCES public.lca_jobs(id) ON DELETE SET NULL;


--
-- Name: lca_factorization_registry lca_factorization_registry_snapshot_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_factorization_registry
    ADD CONSTRAINT lca_factorization_registry_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES public.lca_network_snapshots(id) ON DELETE CASCADE;


--
-- Name: lca_jobs lca_jobs_snapshot_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_jobs
    ADD CONSTRAINT lca_jobs_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES public.lca_network_snapshots(id) ON DELETE CASCADE;


--
-- Name: lca_latest_all_unit_results lca_latest_all_unit_results_job_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_latest_all_unit_results
    ADD CONSTRAINT lca_latest_all_unit_results_job_fk FOREIGN KEY (job_id) REFERENCES public.lca_jobs(id) ON DELETE CASCADE;


--
-- Name: lca_latest_all_unit_results lca_latest_all_unit_results_result_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_latest_all_unit_results
    ADD CONSTRAINT lca_latest_all_unit_results_result_fk FOREIGN KEY (result_id) REFERENCES public.lca_results(id) ON DELETE CASCADE;


--
-- Name: lca_latest_all_unit_results lca_latest_all_unit_results_snapshot_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_latest_all_unit_results
    ADD CONSTRAINT lca_latest_all_unit_results_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES public.lca_network_snapshots(id) ON DELETE CASCADE;


--
-- Name: lca_network_snapshots lca_network_snapshots_lcia_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_network_snapshots
    ADD CONSTRAINT lca_network_snapshots_lcia_fk FOREIGN KEY (lcia_method_id, lcia_method_version) REFERENCES public.lciamethods(id, version) ON DELETE SET NULL;


--
-- Name: lca_result_cache lca_result_cache_job_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_result_cache
    ADD CONSTRAINT lca_result_cache_job_fk FOREIGN KEY (job_id) REFERENCES public.lca_jobs(id) ON DELETE SET NULL;


--
-- Name: lca_result_cache lca_result_cache_result_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_result_cache
    ADD CONSTRAINT lca_result_cache_result_fk FOREIGN KEY (result_id) REFERENCES public.lca_results(id) ON DELETE SET NULL;


--
-- Name: lca_result_cache lca_result_cache_snapshot_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_result_cache
    ADD CONSTRAINT lca_result_cache_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES public.lca_network_snapshots(id) ON DELETE CASCADE;


--
-- Name: lca_results lca_results_job_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_results
    ADD CONSTRAINT lca_results_job_fk FOREIGN KEY (job_id) REFERENCES public.lca_jobs(id) ON DELETE CASCADE;


--
-- Name: lca_results lca_results_snapshot_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_results
    ADD CONSTRAINT lca_results_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES public.lca_network_snapshots(id) ON DELETE CASCADE;


--
-- Name: lca_snapshot_artifacts lca_snapshot_artifacts_snapshot_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_snapshot_artifacts
    ADD CONSTRAINT lca_snapshot_artifacts_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES public.lca_network_snapshots(id) ON DELETE CASCADE;


--
-- Name: roles roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for users based on user_id" ON public.contacts FOR DELETE TO authenticated USING (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: flowproperties Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for users based on user_id" ON public.flowproperties FOR DELETE TO authenticated USING (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: flows Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for users based on user_id" ON public.flows FOR DELETE TO authenticated USING (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: lifecyclemodels Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for users based on user_id" ON public.lifecyclemodels FOR DELETE TO authenticated USING (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: processes Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for users based on user_id" ON public.processes FOR DELETE TO authenticated USING (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: sources Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for users based on user_id" ON public.sources FOR DELETE TO authenticated USING (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: unitgroups Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for users based on user_id" ON public.unitgroups FOR DELETE TO authenticated USING (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: reviews Enable insert data access for self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert data access for self" ON public.reviews FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND (((("json" -> 'user'::text) ->> 'id'::text))::uuid = ( SELECT auth.uid() AS uid))));


--
-- Name: contacts Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.contacts FOR INSERT TO authenticated WITH CHECK (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: flowproperties Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.flowproperties FOR INSERT TO authenticated WITH CHECK (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: flows Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.flows FOR INSERT TO authenticated WITH CHECK (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: lifecyclemodels Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.lifecyclemodels FOR INSERT TO authenticated WITH CHECK (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: processes Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.processes FOR INSERT TO authenticated WITH CHECK (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: sources Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.sources FOR INSERT TO authenticated WITH CHECK (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: unitgroups Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.unitgroups FOR INSERT TO authenticated WITH CHECK (((state_code = 0) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: comments Enable insert for review-admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for review-admin" ON public.comments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.user_id = ( SELECT auth.uid() AS uid)) AND ((roles.role)::text = 'review-admin'::text)))));


--
-- Name: ilcd Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON public.ilcd FOR SELECT TO authenticated USING (true);


--
-- Name: lciamethods Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON public.lciamethods FOR SELECT TO authenticated USING (true);


--
-- Name: contacts Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.contacts FOR SELECT USING (((state_code >= 100) OR (( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = contacts.team_id) AND ((roles.role)::text = ANY (ARRAY[('admin'::character varying)::text, ('member'::character varying)::text, ('owner'::character varying)::text])) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR ((state_code = 20) AND ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = '00000000-0000-0000-0000-000000000000'::uuid) AND ((roles.role)::text = 'review-admin'::text) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.state_code > 0) AND ((((r."json" -> 'data'::text) ->> 'id'::text))::uuid = contacts.id) AND (((r."json" -> 'data'::text) ->> 'version'::text) = (contacts.version)::text) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id IN ( SELECT ((review_item.value ->> 'id'::text))::uuid AS uuid
           FROM jsonb_array_elements(contacts.reviews) review_item(value))) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text)))))))));


--
-- Name: flowproperties Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.flowproperties FOR SELECT TO authenticated USING (((state_code >= 100) OR (( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = flowproperties.team_id) AND ((roles.role)::text = ANY (ARRAY[('admin'::character varying)::text, ('member'::character varying)::text, ('owner'::character varying)::text])) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR ((state_code = 20) AND ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = '00000000-0000-0000-0000-000000000000'::uuid) AND ((roles.role)::text = 'review-admin'::text) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.state_code > 0) AND ((((r."json" -> 'data'::text) ->> 'id'::text))::uuid = flowproperties.id) AND (((r."json" -> 'data'::text) ->> 'version'::text) = (flowproperties.version)::text) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id IN ( SELECT ((review_item.value ->> 'id'::text))::uuid AS uuid
           FROM jsonb_array_elements(flowproperties.reviews) review_item(value))) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text)))))))));


--
-- Name: flows Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.flows FOR SELECT TO authenticated USING (((state_code >= 100) OR (( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = flows.team_id) AND ((roles.role)::text = ANY (ARRAY[('admin'::character varying)::text, ('member'::character varying)::text, ('owner'::character varying)::text])) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR ((state_code = 20) AND ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = '00000000-0000-0000-0000-000000000000'::uuid) AND ((roles.role)::text = 'review-admin'::text) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.state_code > 0) AND ((((r."json" -> 'data'::text) ->> 'id'::text))::uuid = flows.id) AND (((r."json" -> 'data'::text) ->> 'version'::text) = (flows.version)::text) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id IN ( SELECT ((review_item.value ->> 'id'::text))::uuid AS uuid
           FROM jsonb_array_elements(flows.reviews) review_item(value))) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text)))))))));


--
-- Name: lifecyclemodels Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.lifecyclemodels FOR SELECT TO authenticated USING (((state_code >= 100) OR (( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = lifecyclemodels.team_id) AND ((roles.role)::text = ANY (ARRAY[('admin'::character varying)::text, ('member'::character varying)::text, ('owner'::character varying)::text])) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR ((state_code = 20) AND ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = '00000000-0000-0000-0000-000000000000'::uuid) AND ((roles.role)::text = 'review-admin'::text) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.state_code > 0) AND ((((r."json" -> 'data'::text) ->> 'id'::text))::uuid = lifecyclemodels.id) AND (((r."json" -> 'data'::text) ->> 'version'::text) = (lifecyclemodels.version)::text) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id IN ( SELECT ((review_item.value ->> 'id'::text))::uuid AS uuid
           FROM jsonb_array_elements(lifecyclemodels.reviews) review_item(value))) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text)))))))));


--
-- Name: processes Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.processes FOR SELECT TO authenticated USING (((state_code >= 100) OR (( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = processes.team_id) AND ((roles.role)::text = ANY (ARRAY[('admin'::character varying)::text, ('member'::character varying)::text, ('owner'::character varying)::text])) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = '00000000-0000-0000-0000-000000000000'::uuid) AND ((roles.role)::text = 'review-admin'::text) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.state_code > 0) AND ((((r."json" -> 'data'::text) ->> 'id'::text))::uuid = processes.id) AND (((r."json" -> 'data'::text) ->> 'version'::text) = (processes.version)::text) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id IN ( SELECT ((review_item.value ->> 'id'::text))::uuid AS uuid
           FROM jsonb_array_elements(processes.reviews) review_item(value))) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text))))))));


--
-- Name: sources Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.sources FOR SELECT TO authenticated USING (((state_code >= 100) OR (( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = sources.team_id) AND ((roles.role)::text = ANY (ARRAY[('admin'::character varying)::text, ('member'::character varying)::text, ('owner'::character varying)::text])) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR ((state_code = 20) AND ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = '00000000-0000-0000-0000-000000000000'::uuid) AND ((roles.role)::text = 'review-admin'::text) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.state_code > 0) AND ((((r."json" -> 'data'::text) ->> 'id'::text))::uuid = sources.id) AND (((r."json" -> 'data'::text) ->> 'version'::text) = (sources.version)::text) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id IN ( SELECT ((review_item.value ->> 'id'::text))::uuid AS uuid
           FROM jsonb_array_elements(sources.reviews) review_item(value))) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text)))))))));


--
-- Name: unitgroups Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.unitgroups FOR SELECT TO authenticated USING (((state_code >= 100) OR (( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = unitgroups.team_id) AND ((roles.role)::text = ANY (ARRAY[('admin'::character varying)::text, ('member'::character varying)::text, ('owner'::character varying)::text])) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR ((state_code = 20) AND ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.team_id = '00000000-0000-0000-0000-000000000000'::uuid) AND ((roles.role)::text = 'review-admin'::text) AND (roles.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.state_code > 0) AND ((((r."json" -> 'data'::text) ->> 'id'::text))::uuid = unitgroups.id) AND (((r."json" -> 'data'::text) ->> 'version'::text) = (unitgroups.version)::text) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text))))) OR (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id IN ( SELECT ((review_item.value ->> 'id'::text))::uuid AS uuid
           FROM jsonb_array_elements(unitgroups.reviews) review_item(value))) AND (r.reviewer_id @> jsonb_build_array((( SELECT auth.uid() AS uid))::text)))))))));


--
-- Name: comments Enable read open data access for reviews; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read open data access for reviews" ON public.comments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.user_id = ( SELECT auth.uid() AS uid)) AND (((roles.role)::text = 'review-admin'::text) OR ((roles.role)::text = 'review-member'::text))))));


--
-- Name: reviews Enable read open data access for reviews; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read open data access for reviews" ON public.reviews FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.roles
  WHERE ((roles.user_id = ( SELECT auth.uid() AS uid)) AND (((roles.role)::text = 'review-admin'::text) OR (((roles.role)::text = 'review-member'::text) AND (reviews.reviewer_id ? (( SELECT auth.uid() AS uid))::text)))))) OR ((( SELECT auth.uid() AS uid) IS NOT NULL) AND (((("json" -> 'user'::text) ->> 'id'::text))::uuid = ( SELECT auth.uid() AS uid))) OR (state_code = ANY (ARRAY[2, '-1'::integer]))));


--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: roles delete by owner and admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "delete by owner and admin" ON public.roles FOR DELETE TO authenticated USING (public.policy_roles_delete(user_id, team_id, (role)::text));


--
-- Name: flowproperties; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.flowproperties ENABLE ROW LEVEL SECURITY;

--
-- Name: flows; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

--
-- Name: ilcd; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ilcd ENABLE ROW LEVEL SECURITY;

--
-- Name: roles insert by authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "insert by authenticated" ON public.roles FOR INSERT TO authenticated WITH CHECK (public.policy_roles_insert(user_id, team_id, (role)::text));


--
-- Name: teams insert by authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "insert by authenticated" ON public.teams FOR INSERT TO authenticated WITH CHECK ((( SELECT count(1) AS count
   FROM public.roles
  WHERE ((roles.user_id = ( SELECT auth.uid() AS uid)) AND ((roles.role)::text <> 'rejected'::text) AND (roles.team_id <> '00000000-0000-0000-0000-000000000000'::uuid))) = 0));


--
-- Name: lca_active_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_active_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_factorization_registry; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_factorization_registry ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_jobs lca_jobs_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_jobs_select_own ON public.lca_jobs FOR SELECT TO authenticated USING ((requested_by = auth.uid()));


--
-- Name: lca_latest_all_unit_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_latest_all_unit_results ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_network_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_network_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_result_cache; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_result_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_results ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_results lca_results_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_results_select_own ON public.lca_results FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lca_jobs j
  WHERE ((j.id = lca_results.job_id) AND (j.requested_by = auth.uid())))));


--
-- Name: lca_snapshot_artifacts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_snapshot_artifacts ENABLE ROW LEVEL SECURITY;

--
-- Name: lciamethods; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lciamethods ENABLE ROW LEVEL SECURITY;

--
-- Name: lifecyclemodels; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lifecyclemodels ENABLE ROW LEVEL SECURITY;

--
-- Name: processes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: teams select by owner or public teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select by owner or public teams" ON public.teams FOR SELECT TO authenticated USING ((is_public OR (rank > 0) OR (EXISTS ( SELECT 1
   FROM public.roles
  WHERE (((roles.team_id = teams.id) OR (roles.team_id = '00000000-0000-0000-0000-000000000000'::uuid)) AND (roles.user_id = ( SELECT auth.uid() AS uid)) AND ((roles.role)::text <> 'rejected'::text))))));


--
-- Name: roles select by self and team; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select by self and team" ON public.roles FOR SELECT TO authenticated USING (public.policy_roles_select(team_id, (role)::text));


--
-- Name: users select by self and team and admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select by self and team and admin" ON public.users FOR SELECT TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR (id IN ( SELECT r.user_id
   FROM public.roles r
  WHERE (((r.role)::text = 'owner'::text) AND (public.policy_is_team_public(r.team_id) = true)))) OR (id IN ( SELECT r0.user_id
   FROM public.roles r0
  WHERE (r0.team_id IN ( SELECT r.team_id
           FROM public.roles r
          WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND ((r.role)::text <> 'rejected'::text)))))) OR public.policy_is_current_user_in_roles('00000000-0000-0000-0000-000000000000'::uuid, ARRAY['admin'::text, 'review-admin'::text, 'review-member'::text])));


--
-- Name: sources; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: unitgroups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.unitgroups ENABLE ROW LEVEL SECURITY;

--
-- Name: roles update by admin or owner or self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "update by admin or owner or self" ON public.roles FOR UPDATE TO authenticated USING (public.policy_roles_update(user_id, team_id, (role)::text));


--
-- Name: teams update by owner and admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "update by owner and admin" ON public.teams FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) IN ( SELECT roles.user_id
   FROM public.roles
  WHERE (((roles.role)::text = 'admin'::text) OR ((roles.role)::text = 'owner'::text)))));


--
-- Name: comments update by review-admin or data owener; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "update by review-admin or data owener" ON public.comments FOR UPDATE TO authenticated USING (((reviewer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND ((r.role)::text = 'review-admin'::text))))));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: objects delete by owner 1yyjigf_0; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "delete by owner 1yyjigf_0" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'external_docs'::text) AND (owner = ( SELECT auth.uid() AS uid))));


--
-- Name: objects delete by owner 1yyjigf_1; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "delete by owner 1yyjigf_1" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'external_docs'::text) AND (owner = ( SELECT auth.uid() AS uid))));


--
-- Name: objects insert by authenticated 1k3nibb_0; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "insert by authenticated 1k3nibb_0" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'sys-files'::text));


--
-- Name: objects insert by authenticated 1yyjigf_0; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "insert by authenticated 1yyjigf_0" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'external_docs'::text));


--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: objects select by authenticated 1k3nibb_0; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "select by authenticated 1k3nibb_0" ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'sys-files'::text));


--
-- Name: objects select by authenticated 1yyjigf_0; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "select by authenticated 1yyjigf_0" ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'external_docs'::text));


--
-- Name: objects select lca_results for authenticated; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "select lca_results for authenticated" ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'lca_results'::text));


--
-- Name: objects upload by authenticated 1k3nibb_0; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "upload by authenticated 1k3nibb_0" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'sys-files'::text));


--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT ALL ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA cron; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA cron TO postgres WITH GRANT OPTION;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO postgres;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;
GRANT USAGE ON SCHEMA realtime TO postgres;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;
GRANT ALL ON SCHEMA storage TO postgres;


--
-- Name: SCHEMA supabase_functions; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA supabase_functions TO anon;
GRANT USAGE ON SCHEMA supabase_functions TO authenticated;
GRANT USAGE ON SCHEMA supabase_functions TO service_role;
GRANT ALL ON SCHEMA supabase_functions TO supabase_functions_admin;
GRANT USAGE ON SCHEMA supabase_functions TO postgres;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION ghstore_in(cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_in(cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_out(extensions.ghstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_out(extensions.ghstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_in(cstring, oid, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_in(cstring, oid, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_out(extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_out(extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_recv(internal, oid, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_recv(internal, oid, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_send(extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_send(extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_typmod_in(cstring[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_typmod_in(cstring[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_in(cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_in(cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_out(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_out(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_recv(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_recv(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_send(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_send(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_subscript_handler(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_subscript_handler(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_in(cstring, oid, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_in(cstring, oid, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_out(extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_out(extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_recv(internal, oid, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_recv(internal, oid, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_send(extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_send(extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_typmod_in(cstring[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_typmod_in(cstring[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_in(cstring, oid, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_in(cstring, oid, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_out(extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_out(extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_recv(internal, oid, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_recv(internal, oid, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_send(extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_send(extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_typmod_in(cstring[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_typmod_in(cstring[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_halfvec(real[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_halfvec(real[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_sparsevec(real[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_sparsevec(real[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_vector(real[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_vector(real[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_halfvec(double precision[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_halfvec(double precision[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_sparsevec(double precision[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_sparsevec(double precision[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_vector(double precision[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_vector(double precision[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_halfvec(integer[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_halfvec(integer[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_sparsevec(integer[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_sparsevec(integer[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_vector(integer[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_vector(integer[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_halfvec(numeric[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_halfvec(numeric[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_sparsevec(numeric[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_sparsevec(numeric[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION array_to_vector(numeric[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.array_to_vector(numeric[], integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore(text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore(text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_to_float4(extensions.halfvec, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_to_float4(extensions.halfvec, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec(extensions.halfvec, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec(extensions.halfvec, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_to_sparsevec(extensions.halfvec, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_to_sparsevec(extensions.halfvec, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_to_vector(extensions.halfvec, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_to_vector(extensions.halfvec, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_to_json(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_to_json(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_to_jsonb(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_to_jsonb(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_to_halfvec(extensions.sparsevec, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_to_halfvec(extensions.sparsevec, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec(extensions.sparsevec, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec(extensions.sparsevec, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_to_vector(extensions.sparsevec, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_to_vector(extensions.sparsevec, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_to_float4(extensions.vector, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_to_float4(extensions.vector, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_to_halfvec(extensions.vector, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_to_halfvec(extensions.vector, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_to_sparsevec(extensions.vector, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_to_sparsevec(extensions.vector, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector(extensions.vector, integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector(extensions.vector, integer, boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;
GRANT ALL ON FUNCTION auth.email() TO postgres;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;
GRANT ALL ON FUNCTION auth.jwt() TO postgres;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;
GRANT ALL ON FUNCTION auth.role() TO postgres;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;
GRANT ALL ON FUNCTION auth.uid() TO postgres;


--
-- Name: FUNCTION alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION job_cache_invalidate(); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.job_cache_invalidate() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule(schedule text, command text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule(schedule text, command text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule(job_name text, schedule text, command text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule(job_name text, schedule text, command text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION unschedule(job_id bigint); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.unschedule(job_id bigint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION unschedule(job_name text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.unschedule(job_name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION akeys(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.akeys(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION avals(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.avals(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION binary_quantize(extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.binary_quantize(extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION binary_quantize(extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.binary_quantize(extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION bytea_to_text(data bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.bytea_to_text(data bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION cosine_distance(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.cosine_distance(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION cosine_distance(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.cosine_distance(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION cosine_distance(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.cosine_distance(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION defined(extensions.hstore, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.defined(extensions.hstore, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION delete(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.delete(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION delete(extensions.hstore, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.delete(extensions.hstore, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION delete(extensions.hstore, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.delete(extensions.hstore, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION each(hs extensions.hstore, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.each(hs extensions.hstore, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION exist(extensions.hstore, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.exist(extensions.hstore, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION exists_all(extensions.hstore, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.exists_all(extensions.hstore, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION exists_any(extensions.hstore, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.exists_any(extensions.hstore, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION fetchval(extensions.hstore, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.fetchval(extensions.hstore, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_compress(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_compress(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_consistent(internal, extensions.hstore, smallint, oid, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_consistent(internal, extensions.hstore, smallint, oid, internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_decompress(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_decompress(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_options(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_options(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_penalty(internal, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_penalty(internal, internal, internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_picksplit(internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_picksplit(internal, internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_same(extensions.ghstore, extensions.ghstore, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_same(extensions.ghstore, extensions.ghstore, internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ghstore_union(internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ghstore_union(internal, internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gin_consistent_hstore(internal, smallint, extensions.hstore, integer, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_consistent_hstore(internal, smallint, extensions.hstore, integer, internal, internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gin_extract_hstore(extensions.hstore, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_hstore(extensions.hstore, internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gin_extract_hstore_query(extensions.hstore, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_hstore_query(extensions.hstore, internal, smallint, internal, internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM postgres;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM postgres;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION halfvec_accum(double precision[], extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_accum(double precision[], extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_add(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_add(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_avg(double precision[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_avg(double precision[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_cmp(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_cmp(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_combine(double precision[], double precision[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_combine(double precision[], double precision[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_concat(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_concat(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_eq(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_eq(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_ge(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_ge(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_gt(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_gt(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_l2_squared_distance(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_l2_squared_distance(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_le(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_le(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_lt(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_lt(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_mul(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_mul(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_ne(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_ne(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_negative_inner_product(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_negative_inner_product(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_spherical_distance(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_spherical_distance(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION halfvec_sub(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.halfvec_sub(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hamming_distance(bit, bit); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hamming_distance(bit, bit) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hnsw_bit_support(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hnsw_bit_support(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hnsw_halfvec_support(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hnsw_halfvec_support(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hnsw_sparsevec_support(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hnsw_sparsevec_support(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hnswhandler(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hnswhandler(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hs_concat(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hs_concat(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hs_contained(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hs_contained(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hs_contains(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hs_contains(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore(record); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore(record) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore(text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore(text[], text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_cmp(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_cmp(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_eq(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_eq(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_ge(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_ge(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_gt(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_gt(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_hash(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_hash(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_hash_extended(extensions.hstore, bigint); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_hash_extended(extensions.hstore, bigint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_le(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_le(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_lt(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_lt(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_ne(extensions.hstore, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_ne(extensions.hstore, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_to_array(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_to_array(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_to_json_loose(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_to_json_loose(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_to_jsonb_loose(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_to_jsonb_loose(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_to_matrix(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_to_matrix(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hstore_version_diag(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hstore_version_diag(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http(request extensions.http_request); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http(request extensions.http_request) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_delete(uri character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_delete(uri character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_delete(uri character varying, content character varying, content_type character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_delete(uri character varying, content character varying, content_type character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_get(uri character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_get(uri character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_get(uri character varying, data jsonb); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_get(uri character varying, data jsonb) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_head(uri character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_head(uri character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_header(field character varying, value character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_header(field character varying, value character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_list_curlopt(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_list_curlopt() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_patch(uri character varying, content character varying, content_type character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_patch(uri character varying, content character varying, content_type character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_post(uri character varying, data jsonb); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_post(uri character varying, data jsonb) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_post(uri character varying, content character varying, content_type character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_post(uri character varying, content character varying, content_type character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_put(uri character varying, content character varying, content_type character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_put(uri character varying, content character varying, content_type character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_reset_curlopt(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_reset_curlopt() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION http_set_curlopt(curlopt character varying, value character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.http_set_curlopt(curlopt character varying, value character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION inner_product(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.inner_product(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION inner_product(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.inner_product(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION inner_product(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.inner_product(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION isdefined(extensions.hstore, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.isdefined(extensions.hstore, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION isexists(extensions.hstore, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.isexists(extensions.hstore, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ivfflat_bit_support(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ivfflat_bit_support(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ivfflat_halfvec_support(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ivfflat_halfvec_support(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION ivfflathandler(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.ivfflathandler(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION jaccard_distance(bit, bit); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.jaccard_distance(bit, bit) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l1_distance(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l1_distance(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l1_distance(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l1_distance(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l1_distance(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l1_distance(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l2_distance(extensions.halfvec, extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l2_distance(extensions.halfvec, extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l2_distance(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l2_distance(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l2_distance(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l2_distance(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l2_norm(extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l2_norm(extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l2_norm(extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l2_norm(extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l2_normalize(extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l2_normalize(extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l2_normalize(extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l2_normalize(extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION l2_normalize(extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.l2_normalize(extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_command(groongacommand text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_command(groongacommand text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_command(groongacommand text, arguments text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_command(groongacommand text, arguments text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_command_escape_value(value text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_command_escape_value(value text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_condition(query text, weights integer[], scorers text[], schema_name text, index_name text, column_name text, fuzzy_max_distance_ratio real); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_condition(query text, weights integer[], scorers text[], schema_name text, index_name text, column_name text, fuzzy_max_distance_ratio real) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_contain_varchar_array(character varying[], character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_contain_varchar_array(character varying[], character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_query_text_array(targets text[], query text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_query_text_array(targets text[], query text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_query_text_array_condition(targets text[], condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_query_text_array_condition(targets text[], condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_query_text_array_condition(targets text[], condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_query_text_array_condition(targets text[], condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_query_varchar_array(targets character varying[], query text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_query_varchar_array(targets character varying[], query text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_query_varchar_array_condition(targets character varying[], condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_query_varchar_array_condition(targets character varying[], condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_query_varchar_array_condition(targets character varying[], condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_query_varchar_array_condition(targets character varying[], condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_text(target text, other text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_text(target text, other text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_text_condition(target text, condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_text_condition(target text, condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_text_condition(target text, condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_text_condition(target text, condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_varchar(target character varying, other character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_varchar(target character varying, other character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_varchar_condition(target character varying, condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_varchar_condition(target character varying, condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_equal_varchar_condition(target character varying, condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_equal_varchar_condition(target character varying, condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value real); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value real) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value double precision); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value double precision) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value smallint); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value smallint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value bigint); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value bigint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value timestamp without time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value timestamp without time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_escape(value text, special_characters text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_escape(value text, special_characters text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_flush(indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_flush(indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_handler(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_handler(internal) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_highlight_html(targets text[], keywords text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_highlight_html(targets text[], keywords text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_highlight_html(target text, keywords text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_highlight_html(target text, keywords text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_highlight_html(targets text[], keywords text[], indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_highlight_html(targets text[], keywords text[], indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_highlight_html(target text, keywords text[], indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_highlight_html(target text, keywords text[], indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_index_column_name(indexname cstring, columnindex integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_index_column_name(indexname cstring, columnindex integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_index_column_name(indexname cstring, columnname text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_index_column_name(indexname cstring, columnname text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_is_writable(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_is_writable() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_list_broken_indexes(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_list_broken_indexes() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_list_lagged_indexes(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_list_lagged_indexes() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_in_text(text, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_in_text(text, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_in_text_array(text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_in_text_array(text[], text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_in_varchar(character varying, character varying[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_in_varchar(character varying, character varying[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_jsonb(jsonb, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_jsonb(jsonb, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_positions_byte(target text, keywords text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_positions_byte(target text, keywords text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_positions_byte(target text, keywords text[], indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_positions_byte(target text, keywords text[], indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_positions_character(target text, keywords text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_positions_character(target text, keywords text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_positions_character(target text, keywords text[], indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_positions_character(target text, keywords text[], indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_query(text[], text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_query(text[], text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_query(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_query(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_query(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_query(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_regexp(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_regexp(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_regexp(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_regexp(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_script_jsonb(jsonb, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_script_jsonb(jsonb, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_term(target text[], term text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_term(target text[], term text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_term(target character varying[], term character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_term(target character varying[], term character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_term(target text, term text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_term(target text, term text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_term(target character varying, term character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_term(target character varying, term character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_text(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_text(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_text_array(text[], text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_text_array(text[], text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_text_array_condition(target text[], condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_text_array_condition(target text[], condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_text_array_condition(target text[], condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_text_array_condition(target text[], condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_text_array_condition_with_scorers(target text[], condition extensions.pgroonga_full_text_search_condition_with_scorers); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_text_array_condition_with_scorers(target text[], condition extensions.pgroonga_full_text_search_condition_with_scorers) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_text_condition(target text, condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_text_condition(target text, condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_text_condition(target text, condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_text_condition(target text, condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_text_condition_with_scorers(target text, condition extensions.pgroonga_full_text_search_condition_with_scorers); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_text_condition_with_scorers(target text, condition extensions.pgroonga_full_text_search_condition_with_scorers) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_varchar(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_varchar(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_varchar_condition(target character varying, condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_varchar_condition(target character varying, condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_varchar_condition(target character varying, condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_varchar_condition(target character varying, condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_match_varchar_condition_with_scorers(target character varying, condition extensions.pgroonga_full_text_search_condition_with_scorers); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_match_varchar_condition_with_scorers(target character varying, condition extensions.pgroonga_full_text_search_condition_with_scorers) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_normalize(target text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_normalize(target text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_normalize(target text, normalizername text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_normalize(target text, normalizername text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_not_prefix_in_text(text, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_not_prefix_in_text(text, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_in_text(text, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_in_text(text, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_in_text_array(text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_in_text_array(text[], text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_in_varchar(character varying, character varying[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_in_varchar(character varying, character varying[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_in_varchar_array(character varying[], character varying[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_in_varchar_array(character varying[], character varying[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_rk_in_text(text, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_rk_in_text(text, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_rk_in_text_array(text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_rk_in_text_array(text[], text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_rk_in_varchar(character varying, character varying[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_rk_in_varchar(character varying, character varying[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_rk_in_varchar_array(character varying[], character varying[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_rk_in_varchar_array(character varying[], character varying[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_rk_text(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_rk_text(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_rk_text_array(text[], text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_rk_text_array(text[], text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_rk_varchar(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_rk_varchar(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_rk_varchar_array(character varying[], character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_rk_varchar_array(character varying[], character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_text(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_text(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_text_array(text[], text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_text_array(text[], text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_text_array_condition(text[], extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_text_array_condition(text[], extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_text_condition(text, condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_text_condition(text, condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_text_condition(text, condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_text_condition(text, condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_varchar(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_varchar(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_varchar_array(character varying[], character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_varchar_array(character varying[], character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_varchar_array_condition(character varying[], extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_varchar_array_condition(character varying[], extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_varchar_condition(target character varying, conditoin extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_varchar_condition(target character varying, conditoin extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_prefix_varchar_condition(target character varying, conditoin extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_prefix_varchar_condition(target character varying, conditoin extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_escape(query text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_escape(query text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_expand(tablename cstring, termcolumnname text, synonymscolumnname text, query text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_expand(tablename cstring, termcolumnname text, synonymscolumnname text, query text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_extract_keywords(query text, index_name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_extract_keywords(query text, index_name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_in_text(text, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_in_text(text, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_in_text_array(text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_in_text_array(text[], text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_in_varchar(character varying, character varying[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_in_varchar(character varying, character varying[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_jsonb(jsonb, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_jsonb(jsonb, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_text(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_text(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_text_array(text[], text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_text_array(text[], text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_text_array_condition(targets text[], condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_text_array_condition(targets text[], condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_text_array_condition(targets text[], condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_text_array_condition(targets text[], condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_text_array_condition_with_scorers(targets text[], condition extensions.pgroonga_full_text_search_condition_with_scorers); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_text_array_condition_with_scorers(targets text[], condition extensions.pgroonga_full_text_search_condition_with_scorers) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_text_condition(target text, condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_text_condition(target text, condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_text_condition(target text, condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_text_condition(target text, condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_text_condition_with_scorers(target text, condition extensions.pgroonga_full_text_search_condition_with_scorers); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_text_condition_with_scorers(target text, condition extensions.pgroonga_full_text_search_condition_with_scorers) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_varchar(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_varchar(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_varchar_condition(target character varying, condition extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_varchar_condition(target character varying, condition extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_varchar_condition(target character varying, condition extensions.pgroonga_full_text_search_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_varchar_condition(target character varying, condition extensions.pgroonga_full_text_search_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_query_varchar_condition_with_scorers(target character varying, condition extensions.pgroonga_full_text_search_condition_with_scorers); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_query_varchar_condition_with_scorers(target character varying, condition extensions.pgroonga_full_text_search_condition_with_scorers) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_regexp_in_text(text, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_regexp_in_text(text, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_regexp_in_varchar(character varying, character varying[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_regexp_in_varchar(character varying, character varying[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_regexp_text(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_regexp_text(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_regexp_text_array(targets text[], pattern text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_regexp_text_array(targets text[], pattern text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_regexp_text_array_condition(targets text[], pattern extensions.pgroonga_condition); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_regexp_text_array_condition(targets text[], pattern extensions.pgroonga_condition) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_regexp_varchar(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_regexp_varchar(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_result_to_jsonb_objects(result jsonb); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_result_to_jsonb_objects(result jsonb) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_result_to_recordset(result jsonb); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_result_to_recordset(result jsonb) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_score("row" record); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_score("row" record) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_score(tableoid oid, ctid tid); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_score(tableoid oid, ctid tid) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_script_jsonb(jsonb, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_script_jsonb(jsonb, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_script_text(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_script_text(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_script_text_array(text[], text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_script_text_array(text[], text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_script_varchar(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_script_varchar(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_set_writable(newwritable boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_set_writable(newwritable boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_similar_text(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_similar_text(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_similar_text_array(text[], text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_similar_text_array(text[], text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_similar_varchar(character varying, character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_similar_varchar(character varying, character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_snippet_html(target text, keywords text[], width integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_snippet_html(target text, keywords text[], width integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_table_name(indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_table_name(indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_tokenize(target text, VARIADIC options text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_tokenize(target text, VARIADIC options text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_vacuum(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_vacuum() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_apply(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_apply() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_apply(indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_apply(indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_set_applied_position(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_set_applied_position() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_set_applied_position(indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_set_applied_position(indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_set_applied_position(block bigint, "offset" bigint); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_set_applied_position(block bigint, "offset" bigint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_set_applied_position(indexname cstring, block bigint, "offset" bigint); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_set_applied_position(indexname cstring, block bigint, "offset" bigint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_status(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_status() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_truncate(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_truncate() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgroonga_wal_truncate(indexname cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgroonga_wal_truncate(indexname cstring) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION populate_record(anyelement, extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.populate_record(anyelement, extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION skeys(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.skeys(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION slice(extensions.hstore, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.slice(extensions.hstore, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION slice_array(extensions.hstore, text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.slice_array(extensions.hstore, text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_cmp(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_cmp(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_eq(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_eq(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_ge(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_ge(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_gt(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_gt(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_l2_squared_distance(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_l2_squared_distance(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_le(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_le(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_lt(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_lt(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_ne(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_ne(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sparsevec_negative_inner_product(extensions.sparsevec, extensions.sparsevec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sparsevec_negative_inner_product(extensions.sparsevec, extensions.sparsevec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION subvector(extensions.halfvec, integer, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.subvector(extensions.halfvec, integer, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION subvector(extensions.vector, integer, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.subvector(extensions.vector, integer, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION svals(extensions.hstore); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.svals(extensions.hstore) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION tconvert(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.tconvert(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION text_to_bytea(data text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.text_to_bytea(data text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION urlencode(string bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.urlencode(string bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION urlencode(data jsonb); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.urlencode(data jsonb) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION urlencode(string character varying); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.urlencode(string character varying) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_accum(double precision[], extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_accum(double precision[], extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_add(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_add(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_avg(double precision[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_avg(double precision[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_cmp(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_cmp(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_combine(double precision[], double precision[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_combine(double precision[], double precision[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_concat(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_concat(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_dims(extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_dims(extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_dims(extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_dims(extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_eq(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_eq(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_ge(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_ge(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_gt(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_gt(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_l2_squared_distance(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_l2_squared_distance(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_le(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_le(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_lt(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_lt(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_mul(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_mul(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_ne(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_ne(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_negative_inner_product(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_negative_inner_product(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_norm(extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_norm(extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_spherical_distance(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_spherical_distance(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION vector_sub(extensions.vector, extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.vector_sub(extensions.vector, extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer); Type: ACL; Schema: net; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO anon;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO authenticated;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO service_role;


--
-- Name: FUNCTION http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer); Type: ACL; Schema: net; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO anon;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO authenticated;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION crypto_aead_det_decrypt(message bytea, additional bytea, key_uuid uuid, nonce bytea); Type: ACL; Schema: pgsodium; Owner: pgsodium_keymaker
--

GRANT ALL ON FUNCTION pgsodium.crypto_aead_det_decrypt(message bytea, additional bytea, key_uuid uuid, nonce bytea) TO service_role;


--
-- Name: FUNCTION crypto_aead_det_encrypt(message bytea, additional bytea, key_uuid uuid, nonce bytea); Type: ACL; Schema: pgsodium; Owner: pgsodium_keymaker
--

GRANT ALL ON FUNCTION pgsodium.crypto_aead_det_encrypt(message bytea, additional bytea, key_uuid uuid, nonce bytea) TO service_role;


--
-- Name: FUNCTION crypto_aead_det_keygen(); Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pgsodium.crypto_aead_det_keygen() TO service_role;


--
-- Name: FUNCTION _navicat_temp_stored_proc(query_text text, query_embedding extensions.vector, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding extensions.vector, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer) TO anon;
GRANT ALL ON FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding extensions.vector, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer) TO authenticated;
GRANT ALL ON FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding extensions.vector, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer) TO service_role;


--
-- Name: FUNCTION _navicat_temp_stored_proc(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer) TO anon;
GRANT ALL ON FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer) TO authenticated;
GRANT ALL ON FUNCTION public._navicat_temp_stored_proc(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight numeric, extracted_text_weight numeric, semantic_weight numeric, rrf_k integer, data_source text, this_user_id text, page_size integer, page_current integer) TO service_role;


--
-- Name: FUNCTION contacts_sync_jsonb_version(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.contacts_sync_jsonb_version() TO anon;
GRANT ALL ON FUNCTION public.contacts_sync_jsonb_version() TO authenticated;
GRANT ALL ON FUNCTION public.contacts_sync_jsonb_version() TO service_role;


--
-- Name: FUNCTION flowproperties_sync_jsonb_version(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.flowproperties_sync_jsonb_version() TO anon;
GRANT ALL ON FUNCTION public.flowproperties_sync_jsonb_version() TO authenticated;
GRANT ALL ON FUNCTION public.flowproperties_sync_jsonb_version() TO service_role;


--
-- Name: TABLE flows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.flows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.flows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.flows TO service_role;


--
-- Name: FUNCTION flows_embedding_ft_input(proc public.flows); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.flows_embedding_ft_input(proc public.flows) TO anon;
GRANT ALL ON FUNCTION public.flows_embedding_ft_input(proc public.flows) TO authenticated;
GRANT ALL ON FUNCTION public.flows_embedding_ft_input(proc public.flows) TO service_role;


--
-- Name: FUNCTION flows_embedding_input(flow public.flows); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.flows_embedding_input(flow public.flows) TO anon;
GRANT ALL ON FUNCTION public.flows_embedding_input(flow public.flows) TO authenticated;
GRANT ALL ON FUNCTION public.flows_embedding_input(flow public.flows) TO service_role;


--
-- Name: FUNCTION flows_sync_jsonb_version(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.flows_sync_jsonb_version() TO anon;
GRANT ALL ON FUNCTION public.flows_sync_jsonb_version() TO authenticated;
GRANT ALL ON FUNCTION public.flows_sync_jsonb_version() TO service_role;


--
-- Name: FUNCTION generate_flow_embedding(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_flow_embedding() TO anon;
GRANT ALL ON FUNCTION public.generate_flow_embedding() TO authenticated;
GRANT ALL ON FUNCTION public.generate_flow_embedding() TO service_role;


--
-- Name: FUNCTION hybrid_search_flows(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hybrid_search_flows(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO anon;
GRANT ALL ON FUNCTION public.hybrid_search_flows(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO authenticated;
GRANT ALL ON FUNCTION public.hybrid_search_flows(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO service_role;


--
-- Name: FUNCTION hybrid_search_lifecyclemodels(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hybrid_search_lifecyclemodels(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO anon;
GRANT ALL ON FUNCTION public.hybrid_search_lifecyclemodels(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO authenticated;
GRANT ALL ON FUNCTION public.hybrid_search_lifecyclemodels(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO service_role;


--
-- Name: FUNCTION hybrid_search_processes(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hybrid_search_processes(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO anon;
GRANT ALL ON FUNCTION public.hybrid_search_processes(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO authenticated;
GRANT ALL ON FUNCTION public.hybrid_search_processes(query_text text, query_embedding text, filter_condition text, match_threshold double precision, match_count integer, full_text_weight double precision, extracted_text_weight double precision, semantic_weight double precision, rrf_k integer, data_source text, page_size integer, page_current integer) TO service_role;


--
-- Name: FUNCTION ilcd_classification_get(this_file_name text, category_type text, get_values text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ilcd_classification_get(this_file_name text, category_type text, get_values text[]) TO authenticated;
GRANT ALL ON FUNCTION public.ilcd_classification_get(this_file_name text, category_type text, get_values text[]) TO service_role;


--
-- Name: FUNCTION ilcd_flow_categorization_get(this_file_name text, get_values text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ilcd_flow_categorization_get(this_file_name text, get_values text[]) TO authenticated;
GRANT ALL ON FUNCTION public.ilcd_flow_categorization_get(this_file_name text, get_values text[]) TO service_role;


--
-- Name: FUNCTION ilcd_location_get(this_file_name text, get_values text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ilcd_location_get(this_file_name text, get_values text[]) TO authenticated;
GRANT ALL ON FUNCTION public.ilcd_location_get(this_file_name text, get_values text[]) TO service_role;


--
-- Name: FUNCTION lca_enqueue_job(p_queue_name text, p_message jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.lca_enqueue_job(p_queue_name text, p_message jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.lca_enqueue_job(p_queue_name text, p_message jsonb) TO service_role;


--
-- Name: FUNCTION lciamethods_sync_jsonb_version(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.lciamethods_sync_jsonb_version() TO anon;
GRANT ALL ON FUNCTION public.lciamethods_sync_jsonb_version() TO authenticated;
GRANT ALL ON FUNCTION public.lciamethods_sync_jsonb_version() TO service_role;


--
-- Name: TABLE lifecyclemodels; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lifecyclemodels TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lifecyclemodels TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lifecyclemodels TO service_role;


--
-- Name: FUNCTION lifecyclemodels_embedding_ft_input(proc public.lifecyclemodels); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.lifecyclemodels_embedding_ft_input(proc public.lifecyclemodels) TO anon;
GRANT ALL ON FUNCTION public.lifecyclemodels_embedding_ft_input(proc public.lifecyclemodels) TO authenticated;
GRANT ALL ON FUNCTION public.lifecyclemodels_embedding_ft_input(proc public.lifecyclemodels) TO service_role;


--
-- Name: FUNCTION lifecyclemodels_embedding_input(models public.lifecyclemodels); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.lifecyclemodels_embedding_input(models public.lifecyclemodels) TO anon;
GRANT ALL ON FUNCTION public.lifecyclemodels_embedding_input(models public.lifecyclemodels) TO authenticated;
GRANT ALL ON FUNCTION public.lifecyclemodels_embedding_input(models public.lifecyclemodels) TO service_role;


--
-- Name: FUNCTION lifecyclemodels_sync_jsonb_version(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.lifecyclemodels_sync_jsonb_version() TO anon;
GRANT ALL ON FUNCTION public.lifecyclemodels_sync_jsonb_version() TO authenticated;
GRANT ALL ON FUNCTION public.lifecyclemodels_sync_jsonb_version() TO service_role;


--
-- Name: FUNCTION pgroonga_search(query_text text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search(query_text text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search(query_text text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search(query_text text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_contacts(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_contacts(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_contacts(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_contacts(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_flowproperties(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_flowproperties(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_flowproperties(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_flowproperties(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_flows_text_v1(query_text text, page_size integer, page_current integer, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_flows_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_flows_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_flows_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_flows_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_flows_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_flows_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_flows_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_lifecyclemodels_text_v1(query_text text, page_size integer, page_current integer, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_lifecyclemodels_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_lifecyclemodels_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_lifecyclemodels_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_lifecyclemodels_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_lifecyclemodels_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_lifecyclemodels_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_lifecyclemodels_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_processes_text_v1(query_text text, page_size integer, page_current integer, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_processes_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_processes_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_processes_text_v1(query_text text, page_size integer, page_current integer, data_source text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_processes_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_processes_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_processes_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_processes_v1(query_text text, filter_condition text, order_by text, page_size bigint, page_current bigint, data_source text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_sources(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_sources(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_sources(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_sources(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO service_role;


--
-- Name: FUNCTION pgroonga_search_unitgroups(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgroonga_search_unitgroups(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO anon;
GRANT ALL ON FUNCTION public.pgroonga_search_unitgroups(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO authenticated;
GRANT ALL ON FUNCTION public.pgroonga_search_unitgroups(query_text text, filter_condition text, page_size bigint, page_current bigint, data_source text, this_user_id text) TO service_role;


--
-- Name: FUNCTION policy_is_current_user_in_roles(p_team_id uuid, p_roles_to_check text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.policy_is_current_user_in_roles(p_team_id uuid, p_roles_to_check text[]) TO authenticated;
GRANT ALL ON FUNCTION public.policy_is_current_user_in_roles(p_team_id uuid, p_roles_to_check text[]) TO service_role;


--
-- Name: FUNCTION policy_is_team_id_used(_team_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.policy_is_team_id_used(_team_id uuid) TO anon;
GRANT ALL ON FUNCTION public.policy_is_team_id_used(_team_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.policy_is_team_id_used(_team_id uuid) TO service_role;


--
-- Name: FUNCTION policy_is_team_public(_team_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.policy_is_team_public(_team_id uuid) TO anon;
GRANT ALL ON FUNCTION public.policy_is_team_public(_team_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.policy_is_team_public(_team_id uuid) TO service_role;


--
-- Name: FUNCTION policy_roles_delete(_user_id uuid, _team_id uuid, _role text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.policy_roles_delete(_user_id uuid, _team_id uuid, _role text) TO anon;
GRANT ALL ON FUNCTION public.policy_roles_delete(_user_id uuid, _team_id uuid, _role text) TO authenticated;
GRANT ALL ON FUNCTION public.policy_roles_delete(_user_id uuid, _team_id uuid, _role text) TO service_role;


--
-- Name: FUNCTION policy_roles_insert(_user_id uuid, _team_id uuid, _role text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.policy_roles_insert(_user_id uuid, _team_id uuid, _role text) TO anon;
GRANT ALL ON FUNCTION public.policy_roles_insert(_user_id uuid, _team_id uuid, _role text) TO authenticated;
GRANT ALL ON FUNCTION public.policy_roles_insert(_user_id uuid, _team_id uuid, _role text) TO service_role;


--
-- Name: FUNCTION policy_roles_select(_team_id uuid, _role text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.policy_roles_select(_team_id uuid, _role text) TO anon;
GRANT ALL ON FUNCTION public.policy_roles_select(_team_id uuid, _role text) TO authenticated;
GRANT ALL ON FUNCTION public.policy_roles_select(_team_id uuid, _role text) TO service_role;


--
-- Name: FUNCTION policy_roles_update(_user_id uuid, _team_id uuid, _role text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.policy_roles_update(_user_id uuid, _team_id uuid, _role text) TO anon;
GRANT ALL ON FUNCTION public.policy_roles_update(_user_id uuid, _team_id uuid, _role text) TO authenticated;
GRANT ALL ON FUNCTION public.policy_roles_update(_user_id uuid, _team_id uuid, _role text) TO service_role;


--
-- Name: FUNCTION policy_user_has_team(_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.policy_user_has_team(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.policy_user_has_team(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.policy_user_has_team(_user_id uuid) TO service_role;


--
-- Name: TABLE processes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.processes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.processes TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.processes TO service_role;


--
-- Name: FUNCTION processes_embedding_ft_input(proc public.processes); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.processes_embedding_ft_input(proc public.processes) TO anon;
GRANT ALL ON FUNCTION public.processes_embedding_ft_input(proc public.processes) TO authenticated;
GRANT ALL ON FUNCTION public.processes_embedding_ft_input(proc public.processes) TO service_role;


--
-- Name: FUNCTION processes_embedding_input(proc public.processes); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.processes_embedding_input(proc public.processes) TO anon;
GRANT ALL ON FUNCTION public.processes_embedding_input(proc public.processes) TO authenticated;
GRANT ALL ON FUNCTION public.processes_embedding_input(proc public.processes) TO service_role;


--
-- Name: FUNCTION processes_sync_jsonb_version(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.processes_sync_jsonb_version() TO anon;
GRANT ALL ON FUNCTION public.processes_sync_jsonb_version() TO authenticated;
GRANT ALL ON FUNCTION public.processes_sync_jsonb_version() TO service_role;


--
-- Name: FUNCTION semantic_search(query_embedding text, match_threshold double precision, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.semantic_search(query_embedding text, match_threshold double precision, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.semantic_search(query_embedding text, match_threshold double precision, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.semantic_search(query_embedding text, match_threshold double precision, match_count integer) TO service_role;


--
-- Name: FUNCTION semantic_search_flows_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.semantic_search_flows_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO anon;
GRANT ALL ON FUNCTION public.semantic_search_flows_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.semantic_search_flows_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO service_role;


--
-- Name: FUNCTION semantic_search_lifecyclemodels_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.semantic_search_lifecyclemodels_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO anon;
GRANT ALL ON FUNCTION public.semantic_search_lifecyclemodels_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.semantic_search_lifecyclemodels_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO service_role;


--
-- Name: FUNCTION semantic_search_processes_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.semantic_search_processes_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO anon;
GRANT ALL ON FUNCTION public.semantic_search_processes_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO authenticated;
GRANT ALL ON FUNCTION public.semantic_search_processes_v1(query_embedding text, filter_condition text, match_threshold double precision, match_count integer, data_source text) TO service_role;


--
-- Name: FUNCTION sources_sync_jsonb_version(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sources_sync_jsonb_version() TO anon;
GRANT ALL ON FUNCTION public.sources_sync_jsonb_version() TO authenticated;
GRANT ALL ON FUNCTION public.sources_sync_jsonb_version() TO service_role;


--
-- Name: FUNCTION sync_auth_users_to_public_users(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_auth_users_to_public_users() TO anon;
GRANT ALL ON FUNCTION public.sync_auth_users_to_public_users() TO authenticated;
GRANT ALL ON FUNCTION public.sync_auth_users_to_public_users() TO service_role;


--
-- Name: FUNCTION sync_json_to_jsonb(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_json_to_jsonb() TO anon;
GRANT ALL ON FUNCTION public.sync_json_to_jsonb() TO authenticated;
GRANT ALL ON FUNCTION public.sync_json_to_jsonb() TO service_role;


--
-- Name: FUNCTION unitgroups_sync_jsonb_version(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.unitgroups_sync_jsonb_version() TO anon;
GRANT ALL ON FUNCTION public.unitgroups_sync_jsonb_version() TO authenticated;
GRANT ALL ON FUNCTION public.unitgroups_sync_jsonb_version() TO service_role;


--
-- Name: FUNCTION update_modified_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_modified_at() TO anon;
GRANT ALL ON FUNCTION public.update_modified_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_modified_at() TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.topic() TO postgres;


--
-- Name: FUNCTION can_insert_object(bucketid text, name text, owner uuid, metadata jsonb); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) TO postgres;


--
-- Name: FUNCTION extension(name text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.extension(name text) TO postgres;


--
-- Name: FUNCTION filename(name text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.filename(name text) TO postgres;


--
-- Name: FUNCTION foldername(name text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.foldername(name text) TO postgres;


--
-- Name: FUNCTION list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) TO postgres;


--
-- Name: FUNCTION operation(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.operation() TO postgres;


--
-- Name: FUNCTION search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) TO postgres;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.update_updated_at_column() TO postgres;


--
-- Name: FUNCTION http_request(); Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

REVOKE ALL ON FUNCTION supabase_functions.http_request() FROM PUBLIC;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO anon;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO authenticated;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO service_role;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO postgres;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION avg(extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.avg(extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION avg(extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.avg(extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sum(extensions.halfvec); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sum(extensions.halfvec) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sum(extensions.vector); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sum(extensions.vector) TO postgres WITH GRANT OPTION;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.custom_oauth_providers TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.flow_state TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.identities TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_amr_claims TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_challenges TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_factors TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_authorizations TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_client_states TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_clients TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_consents TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.one_time_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_providers TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_relay_states TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.schema_migrations TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.schema_migrations TO postgres;
GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sessions TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_domains TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_providers TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE job; Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT SELECT ON TABLE cron.job TO postgres WITH GRANT OPTION;


--
-- Name: TABLE job_run_details; Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON TABLE cron.job_run_details TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE extensions.pg_stat_statements_info TO dashboard_user;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;


--
-- Name: TABLE a_embedding_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_embedding_jobs TO pg_monitor;


--
-- Name: TABLE a_lca_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_lca_jobs TO pg_monitor;


--
-- Name: TABLE a_webhook_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_webhook_jobs TO pg_monitor;


--
-- Name: TABLE q_embedding_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.q_embedding_jobs TO pg_monitor;


--
-- Name: TABLE q_lca_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.q_lca_jobs TO pg_monitor;


--
-- Name: TABLE q_webhook_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.q_webhook_jobs TO pg_monitor;


--
-- Name: TABLE decrypted_key; Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE pgsodium.decrypted_key TO pgsodium_keyholder;


--
-- Name: TABLE masking_rule; Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE pgsodium.masking_rule TO pgsodium_keyholder;


--
-- Name: TABLE mask_columns; Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE pgsodium.mask_columns TO pgsodium_keyholder;


--
-- Name: TABLE comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.comments TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.comments TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.comments TO service_role;


--
-- Name: TABLE contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.contacts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.contacts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.contacts TO service_role;


--
-- Name: TABLE flowproperties; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.flowproperties TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.flowproperties TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.flowproperties TO service_role;


--
-- Name: TABLE ilcd; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ilcd TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ilcd TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ilcd TO service_role;


--
-- Name: TABLE lca_active_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_active_snapshots TO service_role;


--
-- Name: TABLE lca_factorization_registry; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_factorization_registry TO service_role;


--
-- Name: TABLE lca_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_jobs TO service_role;
GRANT SELECT ON TABLE public.lca_jobs TO authenticated;


--
-- Name: TABLE lca_latest_all_unit_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_latest_all_unit_results TO service_role;


--
-- Name: TABLE lca_network_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_network_snapshots TO service_role;


--
-- Name: TABLE lca_result_cache; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_result_cache TO service_role;


--
-- Name: TABLE lca_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_results TO service_role;
GRANT SELECT ON TABLE public.lca_results TO authenticated;


--
-- Name: TABLE lca_snapshot_artifacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_snapshot_artifacts TO service_role;


--
-- Name: TABLE lciamethods; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lciamethods TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lciamethods TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lciamethods TO service_role;


--
-- Name: TABLE reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.reviews TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.reviews TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.reviews TO service_role;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.roles TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.roles TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.roles TO service_role;


--
-- Name: TABLE sources; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.sources TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.sources TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.sources TO service_role;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.teams TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.teams TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.teams TO service_role;


--
-- Name: TABLE unitgroups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.unitgroups TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.unitgroups TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.unitgroups TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.messages TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO supabase_realtime_admin;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO postgres;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO supabase_realtime_admin;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO postgres;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE migrations; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.migrations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.migrations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.migrations TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.migrations TO postgres;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.s3_multipart_uploads TO postgres;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.s3_multipart_uploads_parts TO postgres;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE hooks; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.hooks TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.hooks TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.hooks TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.hooks TO postgres;


--
-- Name: SEQUENCE hooks_id_seq; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO anon;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO service_role;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO postgres;


--
-- Name: TABLE migrations; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.migrations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.migrations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.migrations TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.migrations TO postgres;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: pgmq; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT SELECT ON SEQUENCES TO pg_monitor;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: pgmq; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT SELECT ON TABLES TO pg_monitor;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: pgsodium; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium GRANT ALL ON SEQUENCES TO pgsodium_keyholder;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: pgsodium; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO pgsodium_keyholder;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: pgsodium_masks; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium_masks GRANT ALL ON SEQUENCES TO pgsodium_keyiduser;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: pgsodium_masks; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium_masks GRANT ALL ON FUNCTIONS TO pgsodium_keyiduser;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: pgsodium_masks; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium_masks GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO pgsodium_keyiduser;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO postgres;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--



