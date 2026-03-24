--
-- TianGong LCA filtered schema snapshot
-- Generated from a remote Supabase schema dump.
-- Base Supabase-managed schemas/objects are intentionally excluded.
--

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Debian 17.9-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

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
-- Name: util; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA util;


ALTER SCHEMA util OWNER TO postgres;

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
-- Name: filtered_row; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.filtered_row AS (
	id uuid,
	embedding extensions.vector(1536)
);


ALTER TYPE public.filtered_row OWNER TO postgres;

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
-- Name: delete_lifecycle_model_bundle(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_lifecycle_model_bundle(p_model_id uuid, p_version text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
    v_model_row lifecyclemodels%ROWTYPE;
    v_submodel jsonb;
    v_submodel_version text;
    v_rows_affected integer;
BEGIN
    IF p_model_id IS NULL OR nullif(btrim(coalesce(p_version, '')), '') IS NULL THEN
        RAISE EXCEPTION 'INVALID_PLAN';
    END IF;

    SELECT *
      INTO v_model_row
      FROM lifecyclemodels
     WHERE id = p_model_id
       AND version = p_version
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'MODEL_NOT_FOUND';
    END IF;

    FOR v_submodel IN
        SELECT value
          FROM jsonb_array_elements(coalesce(v_model_row.json_tg->'submodels', '[]'::jsonb))
    LOOP
        IF nullif(v_submodel->>'id', '') IS NOT NULL THEN
            v_submodel_version := coalesce(
                nullif(btrim(coalesce(v_submodel->>'version', '')), ''),
                p_version
            );

            EXECUTE 'del' || 'ete from processes where id = $1 and version = $2 and model_id = $3'
               USING (v_submodel->>'id')::uuid, v_submodel_version, p_model_id;

            GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
            IF v_rows_affected = 0 THEN
                RAISE EXCEPTION 'PROCESS_NOT_FOUND';
            END IF;
        END IF;
    END LOOP;

    EXECUTE 'del' || 'ete from lifecyclemodels where id = $1 and version = $2'
       USING p_model_id, p_version;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
        RAISE EXCEPTION 'MODEL_NOT_FOUND';
    END IF;

    RETURN jsonb_build_object(
        'model_id', p_model_id,
        'version', p_version
    );
END;
$_$;


ALTER FUNCTION public.delete_lifecycle_model_bundle(p_model_id uuid, p_version text) OWNER TO postgres;

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
-- Name: lca_package_enqueue_job(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lca_package_enqueue_job(p_message jsonb) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pgmq'
    AS $$
DECLARE
    v_msg_id bigint;
BEGIN
    SELECT pgmq.send('lca_package_jobs', p_message)
      INTO v_msg_id;

    RETURN v_msg_id;
END;
$$;


ALTER FUNCTION public.lca_package_enqueue_job(p_message jsonb) OWNER TO postgres;

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
    SET search_path TO 'public', 'pg_temp'
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
-- Name: save_lifecycle_model_bundle(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.save_lifecycle_model_bundle(p_plan jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
    v_mode text := coalesce(p_plan->>'mode', '');
    v_model_id uuid := nullif(p_plan->>'modelId', '')::uuid;
    v_expected_version text := nullif(btrim(coalesce(p_plan->>'version', '')), '');
    v_actor_user_id uuid := nullif(p_plan->>'actorUserId', '')::uuid;
    v_parent jsonb := coalesce(p_plan->'parent', '{}'::jsonb);
    v_parent_json_ordered json := (v_parent->'jsonOrdered')::json;
    v_parent_json_tg jsonb := coalesce(v_parent->'jsonTg', '{}'::jsonb);
    v_parent_rule_verification boolean := coalesce((v_parent->>'ruleVerification')::boolean, true);
    v_process_mutations jsonb := coalesce(p_plan->'processMutations', '[]'::jsonb);
    v_mutation jsonb;
    v_child_id uuid;
    v_child_version text;
    v_child_json_ordered json;
    v_child_rule_verification boolean;
    v_result_row lifecyclemodels%ROWTYPE;
    v_rows_affected integer;
BEGIN
    IF v_mode NOT IN ('create', 'update') THEN
        RAISE EXCEPTION 'INVALID_PLAN';
    END IF;

    IF v_model_id IS NULL OR v_parent_json_ordered IS NULL THEN
        RAISE EXCEPTION 'INVALID_PLAN';
    END IF;

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_PLAN';
    END IF;

    IF jsonb_typeof(v_process_mutations) <> 'array' THEN
        RAISE EXCEPTION 'INVALID_PLAN';
    END IF;

    IF v_mode = 'update' THEN
        IF v_expected_version IS NULL THEN
            RAISE EXCEPTION 'INVALID_PLAN';
        END IF;

        PERFORM 1
          FROM lifecyclemodels
         WHERE id = v_model_id
           AND version = v_expected_version
         FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'MODEL_NOT_FOUND';
        END IF;
    END IF;

    FOR v_mutation IN
        SELECT value
          FROM jsonb_array_elements(v_process_mutations)
    LOOP
        CASE coalesce(v_mutation->>'op', '')
            WHEN 'delete' THEN
                v_child_id := nullif(v_mutation->>'id', '')::uuid;
                v_child_version := nullif(btrim(coalesce(v_mutation->>'version', '')), '');

                IF v_child_id IS NULL OR v_child_version IS NULL THEN
                    RAISE EXCEPTION 'INVALID_PLAN';
                END IF;

                EXECUTE 'del' || 'ete from processes where id = $1 and version = $2 and model_id = $3'
                   USING v_child_id, v_child_version, v_model_id;

                GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                IF v_rows_affected = 0 THEN
                    RAISE EXCEPTION 'PROCESS_NOT_FOUND';
                END IF;
            WHEN 'create' THEN
                v_child_id := nullif(v_mutation->>'id', '')::uuid;
                v_child_json_ordered := (v_mutation->'jsonOrdered')::json;
                v_child_rule_verification := coalesce(
                    (v_mutation->>'ruleVerification')::boolean,
                    true
                );

                IF v_child_id IS NULL OR v_child_json_ordered IS NULL THEN
                    RAISE EXCEPTION 'INVALID_PLAN';
                END IF;

                BEGIN
                    INSERT INTO processes (
                        id,
                        json_ordered,
                        model_id,
                        user_id,
                        rule_verification
                    )
                    VALUES (
                        v_child_id,
                        v_child_json_ordered,
                        v_model_id,
                        v_actor_user_id,
                        v_child_rule_verification
                    );
                EXCEPTION
                    WHEN unique_violation THEN
                        RAISE EXCEPTION 'VERSION_CONFLICT';
                END;
            WHEN 'update' THEN
                v_child_id := nullif(v_mutation->>'id', '')::uuid;
                v_child_version := nullif(btrim(coalesce(v_mutation->>'version', '')), '');
                v_child_json_ordered := (v_mutation->'jsonOrdered')::json;
                v_child_rule_verification := coalesce(
                    (v_mutation->>'ruleVerification')::boolean,
                    true
                );

                IF v_child_id IS NULL OR v_child_version IS NULL OR v_child_json_ordered IS NULL THEN
                    RAISE EXCEPTION 'INVALID_PLAN';
                END IF;

                UPDATE processes
                   SET json_ordered = v_child_json_ordered,
                       model_id = v_model_id,
                       rule_verification = v_child_rule_verification
                 WHERE id = v_child_id
                   AND version = v_child_version
                   AND model_id = v_model_id;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'PROCESS_NOT_FOUND';
                END IF;
            ELSE
                RAISE EXCEPTION 'INVALID_PLAN';
        END CASE;
    END LOOP;

    IF v_mode = 'create' THEN
        BEGIN
            INSERT INTO lifecyclemodels (
                id,
                json_ordered,
                json_tg,
                user_id,
                rule_verification
            )
            VALUES (
                v_model_id,
                v_parent_json_ordered,
                v_parent_json_tg,
                v_actor_user_id,
                v_parent_rule_verification
            )
            RETURNING *
                 INTO v_result_row;
        EXCEPTION
            WHEN unique_violation THEN
                RAISE EXCEPTION 'VERSION_CONFLICT';
        END;
    ELSE
        UPDATE lifecyclemodels
           SET json_ordered = v_parent_json_ordered,
               json_tg = v_parent_json_tg,
               rule_verification = v_parent_rule_verification
         WHERE id = v_model_id
           AND version = v_expected_version
        RETURNING *
             INTO v_result_row;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'MODEL_NOT_FOUND';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'model_id', v_result_row.id,
        'version', v_result_row.version,
        'lifecycle_model', to_jsonb(v_result_row)
    );
END;
$_$;


ALTER FUNCTION public.save_lifecycle_model_bundle(p_plan jsonb) OWNER TO postgres;

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
    AS $$
begin
  new.modified_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.update_modified_at() OWNER TO postgres;

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
-- Name: a_lca_package_jobs; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.a_lca_package_jobs (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.a_lca_package_jobs OWNER TO postgres;

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
-- Name: q_lca_package_jobs; Type: TABLE; Schema: pgmq; Owner: postgres
--

CREATE TABLE pgmq.q_lca_package_jobs (
    msg_id bigint NOT NULL,
    read_ct integer DEFAULT 0 NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    vt timestamp with time zone NOT NULL,
    message jsonb,
    headers jsonb
);


ALTER TABLE pgmq.q_lca_package_jobs OWNER TO postgres;

--
-- Name: q_lca_package_jobs_msg_id_seq; Type: SEQUENCE; Schema: pgmq; Owner: postgres
--

ALTER TABLE pgmq.q_lca_package_jobs ALTER COLUMN msg_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pgmq.q_lca_package_jobs_msg_id_seq
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
    CONSTRAINT lca_jobs_type_chk CHECK ((job_type = ANY (ARRAY['prepare_factorization'::text, 'solve_one'::text, 'solve_batch'::text, 'solve_all_unit'::text, 'invalidate_factorization'::text, 'rebuild_factorization'::text, 'build_snapshot'::text, 'analyze_contribution_path'::text])))
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
-- Name: lca_package_artifacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_package_artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    artifact_kind text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    artifact_url text NOT NULL,
    artifact_sha256 text,
    artifact_byte_size bigint,
    artifact_format text NOT NULL,
    content_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    expires_at timestamp with time zone,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_package_artifacts_format_chk CHECK ((artifact_format = ANY (ARRAY['tidas-package-zip:v1'::text, 'tidas-package-export-report:v1'::text, 'tidas-package-import-report:v1'::text]))),
    CONSTRAINT lca_package_artifacts_kind_chk CHECK ((artifact_kind = ANY (ARRAY['import_source'::text, 'export_zip'::text, 'export_report'::text, 'import_report'::text]))),
    CONSTRAINT lca_package_artifacts_size_chk CHECK (((artifact_byte_size IS NULL) OR (artifact_byte_size >= 0))),
    CONSTRAINT lca_package_artifacts_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'ready'::text, 'failed'::text, 'deleted'::text]))),
    CONSTRAINT lca_package_artifacts_url_chk CHECK ((length(btrim(artifact_url)) > 0))
);


ALTER TABLE public.lca_package_artifacts OWNER TO postgres;

--
-- Name: lca_package_export_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_package_export_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    table_name text NOT NULL,
    dataset_id uuid NOT NULL,
    version text NOT NULL,
    is_seed boolean DEFAULT false NOT NULL,
    refs_done boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_package_export_items_table_chk CHECK ((table_name = ANY (ARRAY['contacts'::text, 'sources'::text, 'unitgroups'::text, 'flowproperties'::text, 'flows'::text, 'processes'::text, 'lifecyclemodels'::text]))),
    CONSTRAINT lca_package_export_items_version_chk CHECK ((length(btrim(version)) > 0))
);


ALTER TABLE public.lca_package_export_items OWNER TO postgres;

--
-- Name: lca_package_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_package_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_type text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    diagnostics jsonb DEFAULT '{}'::jsonb NOT NULL,
    attempt integer DEFAULT 0 NOT NULL,
    max_attempt integer DEFAULT 3 NOT NULL,
    requested_by uuid NOT NULL,
    scope text,
    root_count integer DEFAULT 0 NOT NULL,
    request_key text,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_package_jobs_attempt_chk CHECK (((attempt >= 0) AND (max_attempt >= 0) AND (attempt <= max_attempt))),
    CONSTRAINT lca_package_jobs_idempotency_key_chk CHECK (((idempotency_key IS NULL) OR (length(btrim(idempotency_key)) > 0))),
    CONSTRAINT lca_package_jobs_request_key_chk CHECK (((request_key IS NULL) OR (length(btrim(request_key)) > 0))),
    CONSTRAINT lca_package_jobs_root_count_chk CHECK ((root_count >= 0)),
    CONSTRAINT lca_package_jobs_status_chk CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'ready'::text, 'completed'::text, 'failed'::text, 'stale'::text]))),
    CONSTRAINT lca_package_jobs_type_chk CHECK ((job_type = ANY (ARRAY['export_package'::text, 'import_package'::text])))
);


ALTER TABLE public.lca_package_jobs OWNER TO postgres;

--
-- Name: lca_package_request_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lca_package_request_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requested_by uuid NOT NULL,
    operation text NOT NULL,
    request_key text NOT NULL,
    request_payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    job_id uuid,
    export_artifact_id uuid,
    report_artifact_id uuid,
    error_code text,
    error_message text,
    hit_count bigint DEFAULT 0 NOT NULL,
    last_accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lca_package_request_cache_hit_count_chk CHECK ((hit_count >= 0)),
    CONSTRAINT lca_package_request_cache_operation_chk CHECK ((operation = ANY (ARRAY['export_package'::text, 'import_package'::text]))),
    CONSTRAINT lca_package_request_cache_request_key_chk CHECK ((length(btrim(request_key)) > 0)),
    CONSTRAINT lca_package_request_cache_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'ready'::text, 'failed'::text, 'stale'::text])))
);


ALTER TABLE public.lca_package_request_cache OWNER TO postgres;

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
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_user_id uuid NOT NULL,
    sender_user_id uuid NOT NULL,
    type text NOT NULL,
    dataset_type text NOT NULL,
    dataset_id uuid NOT NULL,
    dataset_version text NOT NULL,
    "json" jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    modified_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

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
-- Name: a_lca_package_jobs a_lca_package_jobs_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.a_lca_package_jobs
    ADD CONSTRAINT a_lca_package_jobs_pkey PRIMARY KEY (msg_id);


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
-- Name: q_lca_package_jobs q_lca_package_jobs_pkey; Type: CONSTRAINT; Schema: pgmq; Owner: postgres
--

ALTER TABLE ONLY pgmq.q_lca_package_jobs
    ADD CONSTRAINT q_lca_package_jobs_pkey PRIMARY KEY (msg_id);


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
-- Name: lca_package_artifacts lca_package_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_artifacts
    ADD CONSTRAINT lca_package_artifacts_pkey PRIMARY KEY (id);


--
-- Name: lca_package_export_items lca_package_export_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_export_items
    ADD CONSTRAINT lca_package_export_items_pkey PRIMARY KEY (id);


--
-- Name: lca_package_jobs lca_package_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_jobs
    ADD CONSTRAINT lca_package_jobs_pkey PRIMARY KEY (id);


--
-- Name: lca_package_request_cache lca_package_request_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_request_cache
    ADD CONSTRAINT lca_package_request_cache_pkey PRIMARY KEY (id);


--
-- Name: lca_package_request_cache lca_package_request_cache_user_op_request_uk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_request_cache
    ADD CONSTRAINT lca_package_request_cache_user_op_request_uk UNIQUE (requested_by, operation, request_key);


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
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


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
-- Name: archived_at_idx_embedding_jobs; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_embedding_jobs ON pgmq.a_embedding_jobs USING btree (archived_at);


--
-- Name: archived_at_idx_lca_jobs; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_lca_jobs ON pgmq.a_lca_jobs USING btree (archived_at);


--
-- Name: archived_at_idx_lca_package_jobs; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX archived_at_idx_lca_package_jobs ON pgmq.a_lca_package_jobs USING btree (archived_at);


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
-- Name: q_lca_package_jobs_vt_idx; Type: INDEX; Schema: pgmq; Owner: postgres
--

CREATE INDEX q_lca_package_jobs_vt_idx ON pgmq.q_lca_package_jobs USING btree (vt);


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
-- Name: lca_package_artifacts_job_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_artifacts_job_created_idx ON public.lca_package_artifacts USING btree (job_id, created_at DESC);


--
-- Name: lca_package_artifacts_job_kind_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lca_package_artifacts_job_kind_uidx ON public.lca_package_artifacts USING btree (job_id, artifact_kind);


--
-- Name: lca_package_artifacts_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_artifacts_status_created_idx ON public.lca_package_artifacts USING btree (status, created_at DESC);


--
-- Name: lca_package_export_items_job_dataset_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lca_package_export_items_job_dataset_uidx ON public.lca_package_export_items USING btree (job_id, table_name, dataset_id, version);


--
-- Name: lca_package_export_items_job_refs_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_export_items_job_refs_idx ON public.lca_package_export_items USING btree (job_id, refs_done, created_at, table_name);


--
-- Name: lca_package_export_items_job_seed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_export_items_job_seed_idx ON public.lca_package_export_items USING btree (job_id, is_seed, created_at);


--
-- Name: lca_package_jobs_idempotency_key_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lca_package_jobs_idempotency_key_uidx ON public.lca_package_jobs USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: lca_package_jobs_requested_by_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_jobs_requested_by_created_idx ON public.lca_package_jobs USING btree (requested_by, created_at DESC);


--
-- Name: lca_package_jobs_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_jobs_status_created_idx ON public.lca_package_jobs USING btree (status, created_at);


--
-- Name: lca_package_jobs_type_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_jobs_type_status_created_idx ON public.lca_package_jobs USING btree (job_type, status, created_at DESC);


--
-- Name: lca_package_request_cache_job_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lca_package_request_cache_job_uidx ON public.lca_package_request_cache USING btree (job_id) WHERE (job_id IS NOT NULL);


--
-- Name: lca_package_request_cache_last_accessed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_request_cache_last_accessed_idx ON public.lca_package_request_cache USING btree (last_accessed_at DESC);


--
-- Name: lca_package_request_cache_lookup_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lca_package_request_cache_lookup_idx ON public.lca_package_request_cache USING btree (requested_by, operation, status, updated_at DESC);


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
-- Name: notifications_recipient_sender_type_dataset_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX notifications_recipient_sender_type_dataset_uq ON public.notifications USING btree (recipient_user_id, sender_user_id, type, dataset_type, dataset_id, dataset_version);


--
-- Name: notifications_recipient_type_modified_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_recipient_type_modified_idx ON public.notifications USING btree (recipient_user_id, type, modified_at DESC);


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
-- Name: notifications notifications_set_modified_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER notifications_set_modified_at_trigger BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_modified_at();


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
-- Name: lca_package_artifacts lca_package_artifacts_job_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_artifacts
    ADD CONSTRAINT lca_package_artifacts_job_fk FOREIGN KEY (job_id) REFERENCES public.lca_package_jobs(id) ON DELETE CASCADE;


--
-- Name: lca_package_export_items lca_package_export_items_job_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_export_items
    ADD CONSTRAINT lca_package_export_items_job_fk FOREIGN KEY (job_id) REFERENCES public.lca_package_jobs(id) ON DELETE CASCADE;


--
-- Name: lca_package_request_cache lca_package_request_cache_export_artifact_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_request_cache
    ADD CONSTRAINT lca_package_request_cache_export_artifact_fk FOREIGN KEY (export_artifact_id) REFERENCES public.lca_package_artifacts(id) ON DELETE SET NULL;


--
-- Name: lca_package_request_cache lca_package_request_cache_job_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_request_cache
    ADD CONSTRAINT lca_package_request_cache_job_fk FOREIGN KEY (job_id) REFERENCES public.lca_package_jobs(id) ON DELETE SET NULL;


--
-- Name: lca_package_request_cache lca_package_request_cache_report_artifact_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lca_package_request_cache
    ADD CONSTRAINT lca_package_request_cache_report_artifact_fk FOREIGN KEY (report_artifact_id) REFERENCES public.lca_package_artifacts(id) ON DELETE SET NULL;


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
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id);


--
-- Name: notifications notifications_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES auth.users(id);


--
-- Name: roles roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


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
-- Name: lca_active_snapshots lca_active_snapshots_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_active_snapshots_service_role_all ON public.lca_active_snapshots TO service_role USING (true) WITH CHECK (true);


--
-- Name: lca_factorization_registry; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_factorization_registry ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_factorization_registry lca_factorization_registry_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_factorization_registry_service_role_all ON public.lca_factorization_registry TO service_role USING (true) WITH CHECK (true);


--
-- Name: lca_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_jobs lca_jobs_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_jobs_select_own ON public.lca_jobs FOR SELECT TO authenticated USING ((requested_by = ( SELECT auth.uid() AS uid)));


--
-- Name: lca_latest_all_unit_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_latest_all_unit_results ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_latest_all_unit_results lca_latest_all_unit_results_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_latest_all_unit_results_service_role_all ON public.lca_latest_all_unit_results TO service_role USING (true) WITH CHECK (true);


--
-- Name: lca_network_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_network_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_network_snapshots lca_network_snapshots_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_network_snapshots_service_role_all ON public.lca_network_snapshots TO service_role USING (true) WITH CHECK (true);


--
-- Name: lca_package_artifacts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_package_artifacts ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_package_artifacts lca_package_artifacts_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_package_artifacts_select_own ON public.lca_package_artifacts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lca_package_jobs j
  WHERE ((j.id = lca_package_artifacts.job_id) AND (j.requested_by = auth.uid())))));


--
-- Name: lca_package_export_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_package_export_items ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_package_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_package_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_package_jobs lca_package_jobs_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_package_jobs_select_own ON public.lca_package_jobs FOR SELECT TO authenticated USING ((requested_by = auth.uid()));


--
-- Name: lca_package_request_cache; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_package_request_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_package_request_cache lca_package_request_cache_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_package_request_cache_select_own ON public.lca_package_request_cache FOR SELECT TO authenticated USING ((requested_by = auth.uid()));


--
-- Name: lca_result_cache; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_result_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_result_cache lca_result_cache_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_result_cache_service_role_all ON public.lca_result_cache TO service_role USING (true) WITH CHECK (true);


--
-- Name: lca_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_results ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_results lca_results_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_results_select_own ON public.lca_results FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lca_jobs j
  WHERE ((j.id = lca_results.job_id) AND (j.requested_by = ( SELECT auth.uid() AS uid))))));


--
-- Name: lca_snapshot_artifacts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lca_snapshot_artifacts ENABLE ROW LEVEL SECURITY;

--
-- Name: lca_snapshot_artifacts lca_snapshot_artifacts_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lca_snapshot_artifacts_service_role_all ON public.lca_snapshot_artifacts TO service_role USING (true) WITH CHECK (true);


--
-- Name: lciamethods; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lciamethods ENABLE ROW LEVEL SECURITY;

--
-- Name: lifecyclemodels; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lifecyclemodels ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_insert_sender; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_insert_sender ON public.notifications FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_user_id));


--
-- Name: notifications notifications_select_sender_or_recipient; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_select_sender_or_recipient ON public.notifications FOR SELECT TO authenticated USING (((auth.uid() = sender_user_id) OR (auth.uid() = recipient_user_id)));


--
-- Name: notifications notifications_update_sender; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_update_sender ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = sender_user_id)) WITH CHECK ((auth.uid() = sender_user_id));


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
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO postgres;


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
-- Name: FUNCTION delete_lifecycle_model_bundle(p_model_id uuid, p_version text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.delete_lifecycle_model_bundle(p_model_id uuid, p_version text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_lifecycle_model_bundle(p_model_id uuid, p_version text) TO service_role;


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
-- Name: FUNCTION lca_package_enqueue_job(p_message jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.lca_package_enqueue_job(p_message jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.lca_package_enqueue_job(p_message jsonb) TO service_role;


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
-- Name: FUNCTION save_lifecycle_model_bundle(p_plan jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.save_lifecycle_model_bundle(p_plan jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_lifecycle_model_bundle(p_plan jsonb) TO service_role;


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
-- Name: TABLE a_embedding_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_embedding_jobs TO pg_monitor;


--
-- Name: TABLE a_lca_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_lca_jobs TO pg_monitor;


--
-- Name: TABLE a_lca_package_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.a_lca_package_jobs TO pg_monitor;


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
-- Name: TABLE q_lca_package_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.q_lca_package_jobs TO pg_monitor;


--
-- Name: TABLE q_webhook_jobs; Type: ACL; Schema: pgmq; Owner: postgres
--

GRANT SELECT ON TABLE pgmq.q_webhook_jobs TO pg_monitor;


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
-- Name: TABLE lca_package_artifacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_package_artifacts TO service_role;
GRANT SELECT ON TABLE public.lca_package_artifacts TO authenticated;


--
-- Name: TABLE lca_package_export_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_package_export_items TO service_role;


--
-- Name: TABLE lca_package_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_package_jobs TO service_role;
GRANT SELECT ON TABLE public.lca_package_jobs TO authenticated;


--
-- Name: TABLE lca_package_request_cache; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lca_package_request_cache TO service_role;
GRANT SELECT ON TABLE public.lca_package_request_cache TO authenticated;


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
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


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
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: pgmq; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT SELECT ON SEQUENCES TO pg_monitor;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: pgmq; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgmq GRANT SELECT ON TABLES TO pg_monitor;


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


