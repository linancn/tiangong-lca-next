

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


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgroonga" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "util";


ALTER SCHEMA "util" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "hstore" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






-- Create pgmq schema first
CREATE SCHEMA IF NOT EXISTS "pgmq";

-- Try to create pgmq extension if available (may not exist in standard Supabase image)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgmq') THEN
        CREATE EXTENSION IF NOT EXISTS "pgmq" WITH SCHEMA "pgmq";
    END IF;
END
$$;






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."filtered_row" AS (
	"id" "uuid",
	"embedding" "extensions"."vector"(1536)
);


ALTER TYPE "public"."filtered_row" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_navicat_temp_stored_proc"("query_text" "text", "query_embedding" "extensions"."vector", "filter_condition" "text" DEFAULT ''::"text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "full_text_weight" numeric DEFAULT 0.3, "extracted_text_weight" numeric DEFAULT 0.2, "semantic_weight" numeric DEFAULT 0.5, "rrf_k" integer DEFAULT 10, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text", "page_size" integer DEFAULT 10, "page_current" integer DEFAULT 1) RETURNS TABLE("id" "uuid", "json" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."_navicat_temp_stored_proc"("query_text" "text", "query_embedding" "extensions"."vector", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" numeric, "extracted_text_weight" numeric, "semantic_weight" numeric, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_navicat_temp_stored_proc"("query_text" "text", "query_embedding" "text", "filter_condition" "text" DEFAULT ''::"text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "full_text_weight" numeric DEFAULT 0.3, "extracted_text_weight" numeric DEFAULT 0.2, "semantic_weight" numeric DEFAULT 0.5, "rrf_k" integer DEFAULT 10, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text", "page_size" integer DEFAULT 10, "page_current" integer DEFAULT 1) RETURNS TABLE("id" "uuid", "json" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."_navicat_temp_stored_proc"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" numeric, "extracted_text_weight" numeric, "semantic_weight" numeric, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contacts_sync_jsonb_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."contacts_sync_jsonb_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."flowproperties_sync_jsonb_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."flowproperties_sync_jsonb_version"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."flows" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "json_ordered" json,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "state_code" integer DEFAULT 0,
    "version" character(9) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "extensions"."halfvec"(384),
    "embedding_at" timestamp(6) with time zone DEFAULT NULL::timestamp with time zone,
    "extracted_text" "text",
    "team_id" "uuid",
    "review_id" "uuid",
    "rule_verification" boolean,
    "reviews" "jsonb"
);


ALTER TABLE "public"."flows" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."flows_embedding_input"("flow" "public"."flows") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
begin
  return flow.extracted_text;
end;
$$;


ALTER FUNCTION "public"."flows_embedding_input"("flow" "public"."flows") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."flows_sync_jsonb_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."flows_sync_jsonb_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_flow_embedding"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."generate_flow_embedding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hybrid_search_flows"("query_text" "text", "query_embedding" "text", "filter_condition" "text" DEFAULT ''::"text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "full_text_weight" double precision DEFAULT 0.3, "extracted_text_weight" double precision DEFAULT 0.2, "semantic_weight" double precision DEFAULT 0.5, "rrf_k" integer DEFAULT 10, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text", "page_size" integer DEFAULT 10, "page_current" integer DEFAULT 1) RETURNS TABLE("id" "uuid", "json" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$ BEGIN
		RETURN QUERY WITH full_text AS (
			SELECT
				ps.RANK AS ps_rank,
				ps.ID AS ps_id,
				ps.JSON AS ps_json 
			FROM
				pgroonga_search_flows ( query_text, filter_condition, 20, -- page_size: 获取足够多候选
					1, -- page_current: 第1页
				data_source, this_user_id ) ps 
		),
		ex_text AS (
			SELECT
				ex.RANK AS ex_rank,
				ex.ID AS ex_id,
				P.JSON AS ex_json 
			FROM
				pgroonga_search_flows_text ( query_text, 20, -- page_size
					1, -- page_current
				data_source, this_user_id ) ex
				JOIN PUBLIC.flows P ON P.ID = ex.ID 
		),
		semantic AS (
			SELECT
				ss.RANK AS ss_rank,
				ss.ID AS ss_id,
				ss.JSON AS ss_json 
			FROM
				semantic_search_flows ( query_embedding, filter_condition, match_threshold, match_count, data_source, this_user_id ) ss 
		), 
		fused as (
		SELECT 
			COALESCE ( full_text.ps_id, semantic.ss_id, ex_text.ex_id ) AS ID,
			COALESCE ( full_text.ps_json, semantic.ss_json, ex_text.ex_json ) AS JSON,
			COALESCE ( 1.0 / ( rrf_k + full_text.ps_rank ), 0.0 ) * full_text_weight + COALESCE ( 1.0 / ( rrf_k + ex_text.ex_rank ), 0.0 ) * extracted_text_weight + COALESCE ( 1.0 / ( rrf_k + semantic.ss_rank ), 0.0 ) * semantic_weight AS score 
		FROM
			full_text
			FULL OUTER JOIN semantic ON full_text.ps_id = semantic.ss_id
			FULL OUTER JOIN ex_text ON ex_text.ex_id = COALESCE ( full_text.ps_id, semantic.ss_id ) 
		)
		SELECT f.id, f.json
		FROM fused AS f
		ORDER BY f.score DESC
		LIMIT page_size OFFSET ( page_current - 1 ) * page_size;
		
	END;
$$;


ALTER FUNCTION "public"."hybrid_search_flows"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hybrid_search_lifecyclemodels"("query_text" "text", "query_embedding" "text", "filter_condition" "text" DEFAULT ''::"text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "full_text_weight" double precision DEFAULT 0.3, "extracted_text_weight" double precision DEFAULT 0.2, "semantic_weight" double precision DEFAULT 0.5, "rrf_k" integer DEFAULT 10, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text", "page_size" integer DEFAULT 10, "page_current" integer DEFAULT 1) RETURNS TABLE("id" "uuid", "json" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$ BEGIN
		RETURN QUERY WITH full_text AS (
			SELECT
				ps.RANK AS ps_rank,
				ps.ID AS ps_id,
				ps.JSON AS ps_json 
			FROM
				pgroonga_search_lifecyclemodels ( query_text, filter_condition, 20, -- page_size: 获取足够多候选
					1, -- page_current: 第1页
				data_source, this_user_id ) ps 
		),
		ex_text AS (
			SELECT
				ex.RANK AS ex_rank,
				ex.ID AS ex_id,
				P.JSON AS ex_json 
			FROM
				pgroonga_search_lifecyclemodels_text ( query_text, 20, -- page_size
					1, -- page_current
				data_source, this_user_id ) ex
				JOIN PUBLIC.lifecyclemodels P ON P.ID = ex.ID 
		),
		semantic AS (
			SELECT
				ss.RANK AS ss_rank,
				ss.ID AS ss_id,
				ss.JSON AS ss_json 
			FROM
				semantic_search_lifecyclemodels ( query_embedding, filter_condition, match_threshold, match_count, data_source, this_user_id ) ss 
		), 
		fused as (
		SELECT 
			COALESCE ( full_text.ps_id, semantic.ss_id, ex_text.ex_id ) AS ID,
			COALESCE ( full_text.ps_json, semantic.ss_json, ex_text.ex_json ) AS JSON,
			COALESCE ( 1.0 / ( rrf_k + full_text.ps_rank ), 0.0 ) * full_text_weight + COALESCE ( 1.0 / ( rrf_k + ex_text.ex_rank ), 0.0 ) * extracted_text_weight + COALESCE ( 1.0 / ( rrf_k + semantic.ss_rank ), 0.0 ) * semantic_weight AS score 
		FROM
			full_text
			FULL OUTER JOIN semantic ON full_text.ps_id = semantic.ss_id
			FULL OUTER JOIN ex_text ON ex_text.ex_id = COALESCE ( full_text.ps_id, semantic.ss_id ) 
		)
		SELECT f.id, f.json
		FROM fused AS f
		ORDER BY f.score DESC
		LIMIT page_size OFFSET ( page_current - 1 ) * page_size;
		
	END;
$$;


ALTER FUNCTION "public"."hybrid_search_lifecyclemodels"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hybrid_search_processes"("query_text" "text", "query_embedding" "text", "filter_condition" "text" DEFAULT ''::"text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "full_text_weight" double precision DEFAULT 0.3, "extracted_text_weight" double precision DEFAULT 0.2, "semantic_weight" double precision DEFAULT 0.5, "rrf_k" integer DEFAULT 10, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text", "page_size" integer DEFAULT 10, "page_current" integer DEFAULT 1) RETURNS TABLE("id" "uuid", "json" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$ BEGIN
		RETURN QUERY WITH full_text AS (
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
				ex.RANK AS ex_rank,
				ex.ID AS ex_id,
				P.JSON AS ex_json 
			FROM
				pgroonga_search_processes_text ( query_text, 20, -- page_size
					1, -- page_current
				data_source, this_user_id ) ex
				JOIN PUBLIC.processes P ON P.ID = ex.ID 
		),
		semantic AS (
			SELECT
				ss.RANK AS ss_rank,
				ss.ID AS ss_id,
				ss.JSON AS ss_json 
			FROM
				semantic_search_processes ( query_embedding, filter_condition, match_threshold, match_count, data_source, this_user_id ) ss 
		), 
		fused as (
		SELECT 
			COALESCE ( full_text.ps_id, semantic.ss_id, ex_text.ex_id ) AS ID,
			COALESCE ( full_text.ps_json, semantic.ss_json, ex_text.ex_json ) AS JSON,
			COALESCE ( 1.0 / ( rrf_k + full_text.ps_rank ), 0.0 ) * full_text_weight + COALESCE ( 1.0 / ( rrf_k + ex_text.ex_rank ), 0.0 ) * extracted_text_weight + COALESCE ( 1.0 / ( rrf_k + semantic.ss_rank ), 0.0 ) * semantic_weight AS score 
		FROM
			full_text
			FULL OUTER JOIN semantic ON full_text.ps_id = semantic.ss_id
			FULL OUTER JOIN ex_text ON ex_text.ex_id = COALESCE ( full_text.ps_id, semantic.ss_id ) 
		)
		SELECT f.id, f.json
		FROM fused AS f
		ORDER BY f.score DESC
		LIMIT page_size OFFSET ( page_current - 1 ) * page_size;
		
	END;
$$;


ALTER FUNCTION "public"."hybrid_search_processes"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ilcd_classification_get"("this_file_name" "text", "category_type" "text", "get_values" "text"[]) RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."ilcd_classification_get"("this_file_name" "text", "category_type" "text", "get_values" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ilcd_flow_categorization_get"("this_file_name" "text", "get_values" "text"[]) RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."ilcd_flow_categorization_get"("this_file_name" "text", "get_values" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ilcd_location_get"("this_file_name" "text", "get_values" "text"[]) RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."ilcd_location_get"("this_file_name" "text", "get_values" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lciamethods_sync_jsonb_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version := NEW.json->'LCIAMethodDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."lciamethods_sync_jsonb_version"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lifecyclemodels" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp(6) with time zone DEFAULT "now"(),
    "json_ordered" json,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "state_code" integer DEFAULT 0,
    "version" character(9) NOT NULL,
    "json_tg" "jsonb",
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "rule_verification" boolean,
    "reviews" "jsonb",
    "extracted_text" "text",
    "embedding" "extensions"."halfvec"(384),
    "embedding_at" timestamp with time zone
);


ALTER TABLE "public"."lifecyclemodels" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lifecyclemodels_embedding_input"("models" "public"."lifecyclemodels") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
begin
  return models.extracted_text;
end;
$$;


ALTER FUNCTION "public"."lifecyclemodels_embedding_input"("models" "public"."lifecyclemodels") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lifecyclemodels_sync_jsonb_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb THEN
        NEW.json := NEW.json_ordered;
        NEW.version := NEW.json->'lifeCycleModelDataSet'->'administrativeInformation'->'publicationAndOwnership'->>'common:dataSetVersion';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."lifecyclemodels_sync_jsonb_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search"("query_text" "text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."pgroonga_search"("query_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_contacts"("query_text" "text", "filter_condition" "text" DEFAULT ''::"text", "page_size" bigint DEFAULT 10, "page_current" bigint DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."pgroonga_search_contacts"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_flowproperties"("query_text" "text", "filter_condition" "text" DEFAULT ''::"text", "page_size" bigint DEFAULT 10, "page_current" bigint DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."pgroonga_search_flowproperties"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_flows"("query_text" "text", "filter_condition" "text" DEFAULT ''::"text", "page_size" bigint DEFAULT 10, "page_current" bigint DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$ 
DECLARE 
	filter_condition_jsonb JSONB; 
	flowType TEXT; 
	flowTypeArray TEXT[]; 
	asInput BOOLEAN; 
BEGIN 
	filter_condition_jsonb := filter_condition::JSONB; 
	flowType := filter_condition_jsonb->>'flowType'; 
	flowTypeArray := string_to_array(flowType, ','); 
	filter_condition_jsonb := filter_condition_jsonb - 'flowType'; 
	asInput := (filter_condition_jsonb->'asInput')::BOOLEAN; 
	filter_condition_jsonb := filter_condition_jsonb - 'asInput'; 
	RETURN QUERY 
		SELECT 
			RANK () OVER (ORDER BY pgroonga_score(f.tableoid, f.ctid) DESC) AS rank, 
			f.id, 
			f.json, 
			f.version, 
			f.modified_at, 
			COUNT(*) OVER() AS total_count 
		FROM flows f 
		WHERE f.json @> filter_condition_jsonb AND f.json &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'co' AND state_code = 200) or (data_source = 'my' AND user_id::text = this_user_id) or (data_source = 'te' and EXISTS ( SELECT 1 FROM roles r WHERE r.user_id::text = this_user_id and r.team_id = f.team_id AND r.role::text IN ('admin', 'member', 'owner') ) ) ) AND ( flowType IS NULL OR flowType = '' OR (f.json->'flowDataSet'->'modellingAndValidation'->'LCIMethod'->>'typeOfDataSet') = ANY(flowTypeArray) ) and ( asInput is NULL OR asInput=false or not(f.json @> '{"flowDataSet":{"flowInformation":{"dataSetInformation":{"classificationInformation":{"common:elementaryFlowCategorization":{"common:category":[{"#text": "Emissions", "@level": "0"}]}}}}}}')) 
		ORDER BY pgroonga_score(tableoid, ctid) DESC 
		LIMIT page_size OFFSET (page_current -1) * page_size; 
	END; 
	$$;


ALTER FUNCTION "public"."pgroonga_search_flows"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_flows_text"("query_text" "text", "page_size" integer DEFAULT 10, "page_current" integer DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "extracted_text" "text", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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
		WHERE f.extracted_text &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'co' AND state_code = 200) or (data_source = 'my' AND user_id::text = this_user_id)
																			  or (data_source = 'te' and
		EXISTS ( 
						SELECT 1
						FROM roles r
						WHERE r.user_id::text = this_user_id and r.team_id =  f.team_id
						AND r.role::text IN ('admin', 'member', 'owner') 
				)
			)
		)
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION "public"."pgroonga_search_flows_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_lifecyclemodels"("query_text" "text", "filter_condition" "text" DEFAULT ''::"text", "page_size" bigint DEFAULT 10, "page_current" bigint DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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
		FROM lifecyclemodels f
		WHERE f.json @> filter_condition_jsonb AND f.json &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'my' AND user_id::text = this_user_id))
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION "public"."pgroonga_search_lifecyclemodels"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_lifecyclemodels_text"("query_text" "text", "page_size" integer DEFAULT 10, "page_current" integer DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "extracted_text" "text", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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
		WHERE f.extracted_text &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'co' AND state_code = 200) or (data_source = 'my' AND user_id::text = this_user_id)
																			  or (data_source = 'te' and
		EXISTS ( 
						SELECT 1
						FROM roles r
						WHERE r.user_id::text = this_user_id and r.team_id =  f.team_id
						AND r.role::text IN ('admin', 'member', 'owner') 
				)
			)
		)
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION "public"."pgroonga_search_lifecyclemodels_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_processes"("query_text" "text", "filter_condition" "text" DEFAULT ''::"text", "page_size" bigint DEFAULT 10, "page_current" bigint DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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
		FROM processes f
		WHERE f.json @> filter_condition_jsonb AND f.json &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'co' AND state_code = 200) or (data_source = 'my' AND user_id::text = this_user_id)
																			  or (data_source = 'te' and
		EXISTS ( 
                        SELECT 1
                        FROM roles r
                        WHERE r.user_id::text = this_user_id and r.team_id =  f.team_id
                        AND r.role::text IN ('admin', 'member', 'owner') 
                    )
  )
																			 )
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION "public"."pgroonga_search_processes"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_processes_text"("query_text" "text", "page_size" integer DEFAULT 10, "page_current" integer DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "extracted_text" "text", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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
		WHERE f.extracted_text &@~ query_text AND ((data_source = 'tg' AND state_code = 100) or (data_source = 'co' AND state_code = 200) or (data_source = 'my' AND user_id::text = this_user_id)
																			  or (data_source = 'te' and
		EXISTS ( 
						SELECT 1
						FROM roles r
						WHERE r.user_id::text = this_user_id and r.team_id =  f.team_id
						AND r.role::text IN ('admin', 'member', 'owner') 
				)
			)
		)
		ORDER BY pgroonga_score(tableoid, ctid) DESC
		LIMIT page_size
		OFFSET (page_current -1) * page_size;
END;
$$;


ALTER FUNCTION "public"."pgroonga_search_processes_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_sources"("query_text" "text", "filter_condition" "text" DEFAULT ''::"text", "page_size" bigint DEFAULT 10, "page_current" bigint DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."pgroonga_search_sources"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgroonga_search_unitgroups"("query_text" "text", "filter_condition" "text" DEFAULT ''::"text", "page_size" bigint DEFAULT 10, "page_current" bigint DEFAULT 1, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."pgroonga_search_unitgroups"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processes" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "json_ordered" json,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "state_code" integer DEFAULT 0,
    "version" character(9) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "extracted_text" "text",
    "embedding" "extensions"."halfvec"(384),
    "embedding_at" timestamp with time zone,
    "review_id" "uuid",
    "rule_verification" boolean,
    "reviews" "jsonb"
);


ALTER TABLE "public"."processes" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."processes_embedding_input"("proc" "public"."processes") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
begin
  return proc.extracted_text;
end;
$$;


ALTER FUNCTION "public"."processes_embedding_input"("proc" "public"."processes") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."processes_sync_jsonb_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."processes_sync_jsonb_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."semantic_search"("query_embedding" "text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20) RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."semantic_search"("query_embedding" "text", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."semantic_search_flows"("query_embedding" "text", "filter_condition" "text" DEFAULT ''::"text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    query_embedding_vector vector(384);
		filter_condition_jsonb JSONB;
		flowType TEXT;
    flowTypeArray TEXT[];
		asInput BOOLEAN;
BEGIN
    -- Convert the input TEXT to vector(1536) once
    query_embedding_vector := query_embedding::vector(384);
		
		filter_condition_jsonb := filter_condition::JSONB;
    flowType := filter_condition_jsonb->>'flowType';
    flowTypeArray := string_to_array(flowType, ',');
    filter_condition_jsonb := filter_condition_jsonb - 'flowType';

    asInput := (filter_condition_jsonb->'asInput')::BOOLEAN;
    filter_condition_jsonb := filter_condition_jsonb - 'asInput';

    RETURN QUERY
    SELECT
        RANK () OVER (ORDER BY f.embedding <=> query_embedding_vector) AS rank,
        f.id,
        f.json,
				f.version,
				f.modified_at,
				COUNT(*) OVER() AS total_count
    FROM flows f
    WHERE f.embedding <=> query_embedding_vector < 1 - match_threshold
					AND f.json @> filter_condition_jsonb
          AND (
               (data_source = 'tg' AND state_code = 100)
               OR (data_source = 'my' AND f.user_id::text = this_user_id)
          )
          AND (
               flowType IS NULL
               OR flowType = ''
               OR (f.json->'flowDataSet'->'modellingAndValidation'->'LCIMethod'->>'typeOfDataSet') = ANY(flowTypeArray)
          )
          AND (
               asInput IS NULL
               OR asInput = false
               OR NOT (
                       f.json @> '{"flowDataSet":{"flowInformation":{"dataSetInformation":{"classificationInformation":{"common:elementaryFlowCategorization":{"common:category":[{"#text": "Emissions", "@level": "0"}]}}}}}}'
                      )
          )
    ORDER BY f.embedding <=> query_embedding_vector
    LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."semantic_search_flows"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."semantic_search_lifecyclemodels"("query_embedding" "text", "filter_condition" "text" DEFAULT ''::"text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    query_embedding_vector vector(384);
		filter_condition_jsonb JSONB;
BEGIN
    -- Convert the input TEXT to vector(1536) once
    query_embedding_vector := query_embedding::vector(384);
		filter_condition_jsonb := filter_condition::JSONB;

    RETURN QUERY
    SELECT
        RANK () OVER (ORDER BY f.embedding <=> query_embedding_vector) AS rank,
        f.id,
        f.json,
				f.version,
				f.modified_at,
				COUNT(*) OVER() AS total_count
    FROM lifecyclemodels f
    WHERE f.embedding <=> query_embedding_vector < 1 - match_threshold
					AND f.json @> filter_condition_jsonb
          AND (
               (data_source = 'tg' AND state_code = 100)
               OR (data_source = 'my' AND f.user_id::text = this_user_id)
          )
    ORDER BY f.embedding <=> query_embedding_vector
    LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."semantic_search_lifecyclemodels"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."semantic_search_processes"("query_embedding" "text", "filter_condition" "text" DEFAULT ''::"text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "data_source" "text" DEFAULT 'tg'::"text", "this_user_id" "text" DEFAULT ''::"text") RETURNS TABLE("rank" bigint, "id" "uuid", "json" "jsonb", "version" character, "modified_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    query_embedding_vector vector(384);
		filter_condition_jsonb JSONB;
BEGIN
    -- Convert the input TEXT to vector(1536) once
    query_embedding_vector := query_embedding::vector(384);
		filter_condition_jsonb := filter_condition::JSONB;

    RETURN QUERY
    SELECT
        RANK () OVER (ORDER BY f.embedding <=> query_embedding_vector) AS rank,
        f.id,
        f.json,
				f.version,
				f.modified_at,
				COUNT(*) OVER() AS total_count
    FROM processes f
    WHERE f.embedding <=> query_embedding_vector < 1 - match_threshold
					AND f.json @> filter_condition_jsonb
          AND (
               (data_source = 'tg' AND state_code = 100)
               OR (data_source = 'my' AND f.user_id::text = this_user_id)
          )
    ORDER BY f.embedding <=> query_embedding_vector
    LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."semantic_search_processes"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sources_sync_jsonb_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."sources_sync_jsonb_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_auth_users_to_public_users"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."sync_auth_users_to_public_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_json_to_jsonb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$BEGIN
    IF NEW.json_ordered::jsonb IS DISTINCT FROM OLD.json_ordered::jsonb
    THEN
        NEW.json := NEW.json_ordered;
    END IF;
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."sync_json_to_jsonb"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unitgroups_sync_jsonb_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."unitgroups_sync_jsonb_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
   NEW.modified_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "util"."clear_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
    clear_column text := TG_ARGV[0];
begin
    NEW := NEW #= public.hstore(clear_column, NULL);
    return NEW;
end;
$$;


ALTER FUNCTION "util"."clear_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "util"."invoke_edge_function"("name" "text", "body" "jsonb", "timeout_milliseconds" integer DEFAULT ((5 * 60) * 1000)) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  headers_raw text;
  auth_header text;
begin
  -- If we're in a PostgREST session, reuse the request headers for authorization
  headers_raw := current_setting('request.headers', true);

  -- Only try to parse if headers are present
  auth_header := case
    when headers_raw is not null then
      (headers_raw::json->>'authorization')
    else
      null
  end;

  -- Perform async HTTP request to the edge function
  perform net.http_post(
    url => util.project_url() || '/functions/v1/' || name,
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_header
    ),
    body => body,
    timeout_milliseconds => timeout_milliseconds
  );
end;
$$;


ALTER FUNCTION "util"."invoke_edge_function"("name" "text", "body" "jsonb", "timeout_milliseconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "util"."process_embeddings"("batch_size" integer DEFAULT 10, "max_requests" integer DEFAULT 10, "timeout_milliseconds" integer DEFAULT ((5 * 60) * 1000)) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  job_batches jsonb[];
  batch jsonb;
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
      group by batch_num
    )
  -- Finally aggregate all batches into array
  select array_agg(batch_array)
  from batched_jobs
  into job_batches;

  -- Invoke the embed edge function for each batch
  foreach batch in array job_batches loop
    perform util.invoke_edge_function(
      name => 'embedding',
      body => batch,
      timeout_milliseconds => timeout_milliseconds
    );
  end loop;
end;
$$;


ALTER FUNCTION "util"."process_embeddings"("batch_size" integer, "max_requests" integer, "timeout_milliseconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "util"."project_url"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  secret_value text;
begin
  -- Retrieve the project URL from Vault
  select decrypted_secret into secret_value from vault.decrypted_secrets where name = 'project_url';
  return secret_value;
end;
$$;


ALTER FUNCTION "util"."project_url"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "util"."queue_embeddings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  content_function text = TG_ARGV[0];
  embedding_column text = TG_ARGV[1];
begin
  perform pgmq.send(
    queue_name => 'embedding_jobs',
    msg => jsonb_build_object(
      'id', NEW.id,
			'version', NEW.version,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'contentFunction', content_function,
      'embeddingColumn', embedding_column
    )
  );
  return NEW;
end;
$$;


ALTER FUNCTION "util"."queue_embeddings"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "review_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "json" json,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "state_code" integer DEFAULT 0
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "json_ordered" json,
    "embedding" "extensions"."vector"(1536),
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "state_code" integer DEFAULT 0,
    "version" character(9) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "review_id" "uuid",
    "rule_verification" boolean,
    "reviews" "jsonb"
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flowproperties" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "json_ordered" json,
    "embedding" "extensions"."vector"(1536),
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "state_code" integer DEFAULT 0,
    "version" character(9) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "review_id" "uuid",
    "rule_verification" boolean,
    "reviews" "jsonb"
);


ALTER TABLE "public"."flowproperties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ilcd" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_name" character varying(255),
    "json" "jsonb",
    "created_at" timestamp(6) with time zone DEFAULT "now"(),
    "json_ordered" json,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "modified_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ilcd" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lciamethods" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp(6) with time zone DEFAULT "now"(),
    "json_ordered" json,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "state_code" integer DEFAULT 0,
    "version" character(9) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lciamethods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "log" "jsonb",
    "log_type" character varying,
    "user_id" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."logs" OWNER TO "postgres";


ALTER TABLE "public"."logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" NOT NULL,
    "data_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "state_code" integer DEFAULT 0,
    "data_version" character(9),
    "reviewer_id" "jsonb",
    "json" "jsonb",
    "deadline" timestamp with time zone
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "user_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "role" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "modified_at" timestamp with time zone
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sources" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "json_ordered" json,
    "embedding" "extensions"."vector"(1536),
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "state_code" integer DEFAULT 0,
    "version" character(9) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "review_id" "uuid",
    "rule_verification" boolean,
    "reviews" "jsonb"
);


ALTER TABLE "public"."sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "modified_at" timestamp with time zone,
    "rank" integer DEFAULT '-1'::integer,
    "is_public" boolean DEFAULT false
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unitgroups" (
    "id" "uuid" NOT NULL,
    "json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "json_ordered" json,
    "embedding" "extensions"."vector"(1536),
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "state_code" integer DEFAULT 0,
    "version" character(9) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "review_id" "uuid",
    "rule_verification" boolean,
    "reviews" "jsonb"
);


ALTER TABLE "public"."unitgroups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "raw_user_meta_data" "jsonb",
    "contact" "jsonb"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("review_id", "reviewer_id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id", "version");



ALTER TABLE ONLY "public"."flowproperties"
    ADD CONSTRAINT "flowproperties_pkey" PRIMARY KEY ("id", "version");



ALTER TABLE ONLY "public"."flows"
    ADD CONSTRAINT "flows_pkey" PRIMARY KEY ("id", "version");



ALTER TABLE ONLY "public"."ilcd"
    ADD CONSTRAINT "ilcd_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lciamethods"
    ADD CONSTRAINT "lciamethods_pkey" PRIMARY KEY ("id", "version");



ALTER TABLE ONLY "public"."lifecyclemodels"
    ADD CONSTRAINT "lifecyclemodels_pkey" PRIMARY KEY ("id", "version");



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processes"
    ADD CONSTRAINT "processes_pkey" PRIMARY KEY ("id", "version");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("user_id", "team_id");



ALTER TABLE ONLY "public"."sources"
    ADD CONSTRAINT "sources_pkey" PRIMARY KEY ("id", "version");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unitgroups"
    ADD CONSTRAINT "unitgroups_pkey" PRIMARY KEY ("id", "version");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "contacts_created_at_idx" ON "public"."contacts" USING "btree" ("created_at" DESC);



CREATE INDEX "contacts_json_dataversion" ON "public"."contacts" USING "btree" (((((("json" -> 'contactDataSet'::"text") -> 'administrativeInformation'::"text") -> 'publicationAndOwnership'::"text") ->> 'common:dataSetVersion'::"text")));



CREATE INDEX "contacts_json_email" ON "public"."contacts" USING "btree" (((((("json" -> 'contactDataSet'::"text") -> 'contactInformation'::"text") -> 'dataSetInformation'::"text") ->> 'email'::"text")));



CREATE INDEX "contacts_json_idx" ON "public"."contacts" USING "gin" ("json");



CREATE INDEX "contacts_json_ordered_vector" ON "public"."contacts" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "contacts_json_pgroonga" ON "public"."contacts" USING "pgroonga" ("json" "extensions"."pgroonga_jsonb_full_text_search_ops_v2");



CREATE INDEX "contacts_user_id_created_at_idx" ON "public"."contacts" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "file_name_index" ON "public"."ilcd" USING "btree" ("file_name");



CREATE INDEX "flowproperties_created_at_idx" ON "public"."flowproperties" USING "btree" ("created_at" DESC);



CREATE INDEX "flowproperties_json_dataversion" ON "public"."flowproperties" USING "btree" (((((("json" -> 'flowPropertyDataSet'::"text") -> 'administrativeInformation'::"text") -> 'publicationAndOwnership'::"text") ->> 'common:dataSetVersion'::"text")));



CREATE INDEX "flowproperties_json_idx" ON "public"."flowproperties" USING "gin" ("json");



CREATE INDEX "flowproperties_json_ordered_vector" ON "public"."flowproperties" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "flowproperties_json_pgroonga" ON "public"."flowproperties" USING "pgroonga" ("json" "extensions"."pgroonga_jsonb_full_text_search_ops_v2");



CREATE INDEX "flowproperties_json_refobjectid" ON "public"."flowproperties" USING "btree" ((((((("json" -> 'flowPropertyDataSet'::"text") -> 'flowPropertiesInformation'::"text") -> 'quantitativeReference'::"text") -> 'referenceToReferenceUnitGroup'::"text") ->> '@refObjectId'::"text")));



CREATE INDEX "flowproperties_modified_at_idx" ON "public"."flowproperties" USING "btree" ("modified_at");



CREATE INDEX "flowproperties_user_id_created_at_idx" ON "public"."flowproperties" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "flows_composite_idx" ON "public"."flows" USING "btree" (((((("json" -> 'flowDataSet'::"text") -> 'modellingAndValidation'::"text") -> 'LCIMethod'::"text") ->> 'typeOfDataSet'::"text")), "state_code", "modified_at" DESC);



CREATE INDEX "flows_created_at_idx" ON "public"."flows" USING "btree" ("created_at" DESC);



CREATE INDEX "flows_embedding_hnsw_idx" ON "public"."flows" USING "hnsw" ("embedding" "extensions"."halfvec_cosine_ops");



CREATE INDEX "flows_json_casnumber" ON "public"."flows" USING "btree" (((((("json" -> 'flowDataSet'::"text") -> 'flowInformation'::"text") -> 'dataSetInformation'::"text") ->> 'CASNumber'::"text")));



CREATE INDEX "flows_json_dataversion" ON "public"."flows" USING "btree" (((((("json" -> 'flowDataSet'::"text") -> 'administrativeInformation'::"text") -> 'publicationAndOwnership'::"text") ->> 'common:dataSetVersion'::"text")));



CREATE INDEX "flows_json_locationofsupply" ON "public"."flows" USING "btree" (((((("json" -> 'flowDataSet'::"text") -> 'flowInformation'::"text") -> 'geography'::"text") ->> 'locationOfSupply'::"text")));



CREATE INDEX "flows_json_pgroonga" ON "public"."flows" USING "pgroonga" ("json" "extensions"."pgroonga_jsonb_full_text_search_ops_v2");



CREATE INDEX "flows_json_typeofdataset" ON "public"."flows" USING "btree" (((((("json" -> 'flowDataSet'::"text") -> 'modellingAndValidation'::"text") -> 'LCIMethod'::"text") ->> 'typeOfDataSet'::"text")));



CREATE INDEX "flows_modified_at_idx" ON "public"."flows" USING "btree" ("modified_at");



CREATE INDEX "flows_not_emissions_idx" ON "public"."flows" USING "btree" ("state_code", "modified_at" DESC) WHERE (NOT ("json" @> '{"flowDataSet": {"flowInformation": {"dataSetInformation": {"classificationInformation": {"common:elementaryFlowCategorization": {"common:category": [{"#text": "Emissions", "@level": "0"}]}}}}}}'::"jsonb"));



CREATE INDEX "flows_review_id_idx" ON "public"."flows" USING "btree" ("review_id");



CREATE INDEX "flows_state_code_idx" ON "public"."flows" USING "btree" ("state_code");



CREATE INDEX "flows_team_id_idx" ON "public"."flows" USING "btree" ("team_id");



CREATE INDEX "flows_text_pgroonga" ON "public"."flows" USING "pgroonga" ("extracted_text");



CREATE INDEX "flows_user_id_created_at_idx" ON "public"."flows" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "ilcd_created_at_idx" ON "public"."ilcd" USING "btree" ("created_at" DESC);



CREATE INDEX "ilcd_json_idx" ON "public"."ilcd" USING "gin" ("json");



CREATE INDEX "ilcd_modified_at_idx" ON "public"."ilcd" USING "btree" ("modified_at");



CREATE INDEX "ilcd_user_id_created_at_idx" ON "public"."ilcd" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "lciamethods_created_at_idx" ON "public"."lciamethods" USING "btree" ("created_at" DESC);



CREATE INDEX "lciamethods_json_dataversion" ON "public"."lciamethods" USING "btree" (((((("json" -> 'LCIAMethodDataSetDataSet'::"text") -> 'administrativeInformation'::"text") -> 'publicationAndOwnership'::"text") ->> 'common:dataSetVersion'::"text")));



CREATE INDEX "lciamethods_json_idx" ON "public"."lciamethods" USING "gin" ("json");



CREATE INDEX "lciamethods_json_pgroonga" ON "public"."lciamethods" USING "pgroonga" ("json" "extensions"."pgroonga_jsonb_full_text_search_ops_v2");



CREATE INDEX "lciamethods_modified_at_idx" ON "public"."lciamethods" USING "btree" ("modified_at");



CREATE INDEX "lciamethods_user_id_created_at_idx" ON "public"."lciamethods" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "lifecyclemodels_created_at_idx" ON "public"."lifecyclemodels" USING "btree" ("created_at" DESC);



CREATE INDEX "lifecyclemodels_embedding_hnsw_idx" ON "public"."lifecyclemodels" USING "hnsw" ("embedding" "extensions"."halfvec_cosine_ops");



CREATE INDEX "lifecyclemodels_json_dataversion" ON "public"."lifecyclemodels" USING "btree" (((((("json" -> 'lifeCycleModelDataSet'::"text") -> 'administrativeInformation'::"text") -> 'publicationAndOwnership'::"text") ->> 'common:dataSetVersion'::"text")));



CREATE INDEX "lifecyclemodels_json_idx" ON "public"."lifecyclemodels" USING "gin" ("json");



CREATE INDEX "lifecyclemodels_json_pgroonga" ON "public"."lifecyclemodels" USING "pgroonga" ("json" "extensions"."pgroonga_jsonb_full_text_search_ops_v2");



CREATE INDEX "lifecyclemodels_json_tg_idx" ON "public"."lifecyclemodels" USING "gin" ("json_tg");



CREATE INDEX "lifecyclemodels_modified_at_idx" ON "public"."lifecyclemodels" USING "btree" ("modified_at");



CREATE INDEX "lifecyclemodels_text_pgroonga" ON "public"."lifecyclemodels" USING "pgroonga" ("extracted_text");



CREATE INDEX "lifecyclemodels_user_id_created_at_idx" ON "public"."lifecyclemodels" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "processes_created_at_idx" ON "public"."processes" USING "btree" ("created_at" DESC);



CREATE INDEX "processes_embedding_hnsw_idx" ON "public"."processes" USING "hnsw" ("embedding" "extensions"."halfvec_cosine_ops");



CREATE INDEX "processes_json_dataversion" ON "public"."processes" USING "btree" (((((("json" -> 'processDataSet'::"text") -> 'administrativeInformation'::"text") -> 'publicationAndOwnership'::"text") ->> 'common:dataSetVersion'::"text")));



CREATE INDEX "processes_json_exchange_gin_idx" ON "public"."processes" USING "gin" ((((("json" -> 'processDataSet'::"text") -> 'exchanges'::"text") -> 'exchange'::"text")));



CREATE INDEX "processes_json_location" ON "public"."processes" USING "btree" ((((((("json" -> 'processDataSet'::"text") -> 'processInformation'::"text") -> 'geography'::"text") -> 'locationOfOperationSupplyOrProduction'::"text") ->> '@location'::"text")));



CREATE INDEX "processes_json_pgroonga" ON "public"."processes" USING "pgroonga" ("json" "extensions"."pgroonga_jsonb_full_text_search_ops_v2");



CREATE INDEX "processes_json_referenceyear" ON "public"."processes" USING "btree" (((((("json" -> 'processDataSet'::"text") -> 'processInformation'::"text") -> 'time'::"text") ->> 'common:referenceYear'::"text")));



CREATE INDEX "processes_modified_at_idx" ON "public"."processes" USING "btree" ("modified_at");



CREATE INDEX "processes_review_id_idx" ON "public"."processes" USING "btree" ("review_id");



CREATE INDEX "processes_rule_verification_idx" ON "public"."processes" USING "btree" ("rule_verification");



CREATE INDEX "processes_state_code_idx" ON "public"."processes" USING "btree" ("state_code");



CREATE INDEX "processes_team_id_idx" ON "public"."processes" USING "btree" ("team_id");



CREATE INDEX "processes_text_pgroonga" ON "public"."processes" USING "pgroonga" ("extracted_text");



CREATE INDEX "processes_user_id_created_at_idx" ON "public"."processes" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "reviews_data_id_data_version_idx" ON "public"."reviews" USING "btree" ("data_id", "data_version");



CREATE INDEX "roles_role_idx" ON "public"."roles" USING "btree" ("role");



CREATE INDEX "roles_team_id_user_id_role_idx" ON "public"."roles" USING "btree" ("team_id", "user_id", "role");



CREATE INDEX "sources_created_at_idx" ON "public"."sources" USING "btree" ("created_at" DESC);



CREATE INDEX "sources_json_dataversion" ON "public"."sources" USING "btree" (((((("json" -> 'sourceDataSet'::"text") -> 'administrativeInformation'::"text") -> 'publicationAndOwnership'::"text") ->> 'common:dataSetVersion'::"text")));



CREATE INDEX "sources_json_idx" ON "public"."sources" USING "gin" ("json");



CREATE INDEX "sources_json_ordered_vector" ON "public"."sources" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "sources_json_pgroonga" ON "public"."sources" USING "pgroonga" ("json" "extensions"."pgroonga_jsonb_full_text_search_ops_v2");



CREATE INDEX "sources_json_publicationtype" ON "public"."sources" USING "btree" (((((("json" -> 'sourceDataSet'::"text") -> 'sourceInformation'::"text") -> 'dataSetInformation'::"text") ->> 'publicationType'::"text")));



CREATE INDEX "sources_json_sourcecitation" ON "public"."sources" USING "btree" (((((("json" -> 'sourceDataSet'::"text") -> 'sourceInformation'::"text") -> 'dataSetInformation'::"text") ->> 'sourceCitation'::"text")));



CREATE INDEX "sources_modified_at_idx" ON "public"."sources" USING "btree" ("modified_at");



CREATE INDEX "sources_user_id_created_at_idx" ON "public"."sources" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "unitgroups_created_at_idx" ON "public"."unitgroups" USING "btree" ("created_at" DESC);



CREATE INDEX "unitgroups_json_dataversion" ON "public"."unitgroups" USING "btree" (((((("json" -> 'unitGroupDataSet'::"text") -> 'administrativeInformation'::"text") -> 'publicationAndOwnership'::"text") ->> 'common:dataSetVersion'::"text")));



CREATE INDEX "unitgroups_json_idx" ON "public"."unitgroups" USING "gin" ("json");



CREATE INDEX "unitgroups_json_ordered_vector" ON "public"."unitgroups" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "unitgroups_json_pgroonga" ON "public"."unitgroups" USING "pgroonga" ("json" "extensions"."pgroonga_jsonb_full_text_search_ops_v2");



CREATE INDEX "unitgroups_json_referencetoreferenceunit" ON "public"."unitgroups" USING "btree" (((((("json" -> 'unitGroupDataSet'::"text") -> 'unitGroupInformation'::"text") -> 'quantitativeReference'::"text") ->> 'referenceToReferenceUnit'::"text")));



CREATE INDEX "unitgroups_modified_at_idx" ON "public"."unitgroups" USING "btree" ("modified_at");



CREATE INDEX "unitgroups_user_id_created_at_idx" ON "public"."unitgroups" USING "btree" ("user_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "contacts_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."contacts_sync_jsonb_version"();



CREATE OR REPLACE TRIGGER "contacts_set_modified_at_trigger" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "flow_embedding_on_extract_text_update" AFTER UPDATE OF "extracted_text" ON "public"."flows" FOR EACH ROW EXECUTE FUNCTION "util"."queue_embeddings"('flows_embedding_input', 'embedding');



CREATE OR REPLACE TRIGGER "flow_embedding_trigger_insert" AFTER INSERT ON "public"."flows" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_flow_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');



CREATE OR REPLACE TRIGGER "flow_embedding_trigger_update" AFTER UPDATE ON "public"."flows" FOR EACH ROW WHEN (("new"."json" IS DISTINCT FROM "old"."json")) EXECUTE FUNCTION "supabase_functions"."http_request"('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_flow_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');



CREATE OR REPLACE TRIGGER "flowproperties_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."flowproperties" FOR EACH ROW EXECUTE FUNCTION "public"."flowproperties_sync_jsonb_version"();



CREATE OR REPLACE TRIGGER "flowproperties_set_modified_at_trigger" BEFORE UPDATE ON "public"."flowproperties" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "flows_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."flows" FOR EACH ROW EXECUTE FUNCTION "public"."flows_sync_jsonb_version"();



CREATE OR REPLACE TRIGGER "flows_set_modified_at_trigger" BEFORE UPDATE ON "public"."flows" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "ilcd_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."ilcd" FOR EACH ROW EXECUTE FUNCTION "public"."sync_json_to_jsonb"();



CREATE OR REPLACE TRIGGER "ilcd_set_modified_at_trigger" BEFORE UPDATE ON "public"."ilcd" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "lciamethods_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."lciamethods" FOR EACH ROW EXECUTE FUNCTION "public"."lciamethods_sync_jsonb_version"();



CREATE OR REPLACE TRIGGER "lciamethods_set_modified_at_trigger" BEFORE UPDATE ON "public"."lciamethods" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "lifecyclemodels_embedding_on_extract_text_update" AFTER UPDATE OF "extracted_text" ON "public"."lifecyclemodels" FOR EACH ROW EXECUTE FUNCTION "util"."queue_embeddings"('lifecyclemodels_embedding_input', 'embedding');



CREATE OR REPLACE TRIGGER "lifecyclemodels_embedding_trigger_insert" AFTER INSERT ON "public"."lifecyclemodels" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_model_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');



CREATE OR REPLACE TRIGGER "lifecyclemodels_embedding_trigger_update" AFTER UPDATE ON "public"."lifecyclemodels" FOR EACH ROW WHEN (("new"."json" IS DISTINCT FROM "old"."json")) EXECUTE FUNCTION "supabase_functions"."http_request"('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_model_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');



CREATE OR REPLACE TRIGGER "lifecyclemodels_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."lifecyclemodels" FOR EACH ROW EXECUTE FUNCTION "public"."lifecyclemodels_sync_jsonb_version"();



CREATE OR REPLACE TRIGGER "lifecyclemodels_set_modified_at_trigger" BEFORE UPDATE ON "public"."lifecyclemodels" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "process_embedding_on_extract_text_update" AFTER UPDATE OF "extracted_text" ON "public"."processes" FOR EACH ROW EXECUTE FUNCTION "util"."queue_embeddings"('processes_embedding_input', 'embedding');



CREATE OR REPLACE TRIGGER "process_embedding_trigger_insert" AFTER INSERT ON "public"."processes" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_process_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');



CREATE OR REPLACE TRIGGER "process_embedding_trigger_update" AFTER UPDATE ON "public"."processes" FOR EACH ROW WHEN (("new"."json" IS DISTINCT FROM "old"."json")) EXECUTE FUNCTION "supabase_functions"."http_request"('https://qgzvkongdjqiiamzbbts.supabase.co/functions/v1/webhook_process_embedding', 'POST', '{"Content-Type":"application/json","apikey":"edge-functions-key","x_region":"us-east-1"}', '{}', '1000');



CREATE OR REPLACE TRIGGER "processes_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."processes" FOR EACH ROW EXECUTE FUNCTION "public"."processes_sync_jsonb_version"();



CREATE OR REPLACE TRIGGER "processes_set_modified_at_trigger" BEFORE UPDATE ON "public"."processes" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "roles_set_modified_at_trigger" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "sources_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."sources" FOR EACH ROW EXECUTE FUNCTION "public"."sources_sync_jsonb_version"();



CREATE OR REPLACE TRIGGER "sources_set_modified_at_trigger" BEFORE UPDATE ON "public"."sources" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "teams_set_modified_at_trigger" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



CREATE OR REPLACE TRIGGER "unitgroups_json_sync_trigger" BEFORE INSERT OR UPDATE ON "public"."unitgroups" FOR EACH ROW EXECUTE FUNCTION "public"."unitgroups_sync_jsonb_version"();



CREATE OR REPLACE TRIGGER "unitgroups_set_modified_at_trigger" BEFORE UPDATE ON "public"."unitgroups" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_at"();



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Enable delete for users based on user_id" ON "public"."contacts" FOR DELETE TO "authenticated" USING ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."flowproperties" FOR DELETE TO "authenticated" USING ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."flows" FOR DELETE TO "authenticated" USING ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."lifecyclemodels" FOR DELETE TO "authenticated" USING ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."processes" FOR DELETE TO "authenticated" USING ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."sources" FOR DELETE TO "authenticated" USING ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."unitgroups" FOR DELETE TO "authenticated" USING ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable insert data access for self" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (((("json" -> 'user'::"text") ->> 'id'::"text"))::"uuid" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."contacts" FOR INSERT TO "authenticated" WITH CHECK ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."flowproperties" FOR INSERT TO "authenticated" WITH CHECK ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."flows" FOR INSERT TO "authenticated" WITH CHECK ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."lifecyclemodels" FOR INSERT TO "authenticated" WITH CHECK ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."processes" FOR INSERT TO "authenticated" WITH CHECK ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."sources" FOR INSERT TO "authenticated" WITH CHECK ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."unitgroups" FOR INSERT TO "authenticated" WITH CHECK ((("state_code" = 0) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Enable insert for review-admin" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("roles"."role")::"text" = 'review-admin'::"text")))));



CREATE POLICY "Enable read access for all users" ON "public"."ilcd" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."lciamethods" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."contacts" FOR SELECT USING ((("state_code" >= 100) OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = "contacts"."team_id") AND (("roles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'owner'::character varying])::"text"[])) AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("state_code" = 20) AND ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = '00000000-0000-0000-0000-000000000000'::"uuid") AND (("roles"."role")::"text" = 'review-admin'::"text") AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."state_code" > 0) AND (((("r"."json" -> 'data'::"text") ->> 'id'::"text"))::"uuid" = "contacts"."id") AND ((("r"."json" -> 'data'::"text") ->> 'version'::"text") = ("contacts"."version")::"text") AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" IN ( SELECT (("review_item"."value" ->> 'id'::"text"))::"uuid" AS "uuid"
           FROM "jsonb_array_elements"("contacts"."reviews") "review_item"("value"))) AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text")))))))));



CREATE POLICY "Enable read access for authenticated users" ON "public"."flowproperties" FOR SELECT TO "authenticated" USING ((("state_code" >= 100) OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = "flowproperties"."team_id") AND (("roles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'owner'::character varying])::"text"[])) AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("state_code" = 20) AND ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = '00000000-0000-0000-0000-000000000000'::"uuid") AND (("roles"."role")::"text" = 'review-admin'::"text") AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."state_code" > 0) AND (((("r"."json" -> 'data'::"text") ->> 'id'::"text"))::"uuid" = "flowproperties"."id") AND ((("r"."json" -> 'data'::"text") ->> 'version'::"text") = ("flowproperties"."version")::"text") AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" IN ( SELECT (("review_item"."value" ->> 'id'::"text"))::"uuid" AS "uuid"
           FROM "jsonb_array_elements"("flowproperties"."reviews") "review_item"("value"))) AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text")))))))));



CREATE POLICY "Enable read access for authenticated users" ON "public"."flows" FOR SELECT TO "authenticated" USING ((("state_code" >= 100) OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = "flows"."team_id") AND (("roles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'owner'::character varying])::"text"[])) AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("state_code" = 20) AND ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = '00000000-0000-0000-0000-000000000000'::"uuid") AND (("roles"."role")::"text" = 'review-admin'::"text") AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."state_code" > 0) AND (((("r"."json" -> 'data'::"text") ->> 'id'::"text"))::"uuid" = "flows"."id") AND ((("r"."json" -> 'data'::"text") ->> 'version'::"text") = ("flows"."version")::"text") AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" IN ( SELECT (("review_item"."value" ->> 'id'::"text"))::"uuid" AS "uuid"
           FROM "jsonb_array_elements"("flows"."reviews") "review_item"("value"))) AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text")))))))));



CREATE POLICY "Enable read access for authenticated users" ON "public"."lifecyclemodels" FOR SELECT TO "authenticated" USING ((("state_code" >= 100) OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = "lifecyclemodels"."team_id") AND (("roles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'owner'::character varying])::"text"[])) AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("state_code" = 20) AND ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = '00000000-0000-0000-0000-000000000000'::"uuid") AND (("roles"."role")::"text" = 'review-admin'::"text") AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."state_code" > 0) AND (((("r"."json" -> 'data'::"text") ->> 'id'::"text"))::"uuid" = "lifecyclemodels"."id") AND ((("r"."json" -> 'data'::"text") ->> 'version'::"text") = ("lifecyclemodels"."version")::"text") AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" IN ( SELECT (("review_item"."value" ->> 'id'::"text"))::"uuid" AS "uuid"
           FROM "jsonb_array_elements"("lifecyclemodels"."reviews") "review_item"("value"))) AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text")))))))));



CREATE POLICY "Enable read access for authenticated users" ON "public"."processes" FOR SELECT TO "authenticated" USING ((("state_code" >= 100) OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = "processes"."team_id") AND (("roles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'owner'::character varying])::"text"[])) AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("state_code" = 20) AND ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = '00000000-0000-0000-0000-000000000000'::"uuid") AND (("roles"."role")::"text" = 'review-admin'::"text") AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."state_code" > 0) AND (((("r"."json" -> 'data'::"text") ->> 'id'::"text"))::"uuid" = "processes"."id") AND ((("r"."json" -> 'data'::"text") ->> 'version'::"text") = ("processes"."version")::"text") AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" IN ( SELECT (("review_item"."value" ->> 'id'::"text"))::"uuid" AS "uuid"
           FROM "jsonb_array_elements"("processes"."reviews") "review_item"("value"))) AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text")))))))));



CREATE POLICY "Enable read access for authenticated users" ON "public"."sources" FOR SELECT TO "authenticated" USING ((("state_code" >= 100) OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = "sources"."team_id") AND (("roles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'owner'::character varying])::"text"[])) AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("state_code" = 20) AND ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = '00000000-0000-0000-0000-000000000000'::"uuid") AND (("roles"."role")::"text" = 'review-admin'::"text") AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."state_code" > 0) AND (((("r"."json" -> 'data'::"text") ->> 'id'::"text"))::"uuid" = "sources"."id") AND ((("r"."json" -> 'data'::"text") ->> 'version'::"text") = ("sources"."version")::"text") AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" IN ( SELECT (("review_item"."value" ->> 'id'::"text"))::"uuid" AS "uuid"
           FROM "jsonb_array_elements"("sources"."reviews") "review_item"("value"))) AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text")))))))));



CREATE POLICY "Enable read access for authenticated users" ON "public"."unitgroups" FOR SELECT TO "authenticated" USING ((("state_code" >= 100) OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = "unitgroups"."team_id") AND (("roles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'owner'::character varying])::"text"[])) AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("state_code" = 20) AND ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."team_id" = '00000000-0000-0000-0000-000000000000'::"uuid") AND (("roles"."role")::"text" = 'review-admin'::"text") AND ("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."state_code" > 0) AND (((("r"."json" -> 'data'::"text") ->> 'id'::"text"))::"uuid" = "unitgroups"."id") AND ((("r"."json" -> 'data'::"text") ->> 'version'::"text") = ("unitgroups"."version")::"text") AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" IN ( SELECT (("review_item"."value" ->> 'id'::"text"))::"uuid" AS "uuid"
           FROM "jsonb_array_elements"("unitgroups"."reviews") "review_item"("value"))) AND ("r"."reviewer_id" @> "jsonb_build_array"((( SELECT "auth"."uid"() AS "uid"))::"text")))))))));



CREATE POLICY "Enable read open data access for reviews" ON "public"."comments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((("roles"."role")::"text" = 'review-admin'::"text") OR ((("roles"."role")::"text" = 'review-member'::"text") AND ("comments"."reviewer_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Enable read open data access for reviews" ON "public"."reviews" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((("roles"."role")::"text" = 'review-admin'::"text") OR ((("roles"."role")::"text" = 'review-member'::"text") AND ("reviews"."reviewer_id" ? (( SELECT "auth"."uid"() AS "uid"))::"text")))))) OR ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (((("json" -> 'user'::"text") ->> 'id'::"text"))::"uuid" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete by owner and admin and self" ON "public"."roles" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "roles_1"."user_id"
   FROM "public"."roles" "roles_1"
  WHERE ((("roles_1"."role")::"text" = 'admin'::"text") OR (("roles_1"."role")::"text" = 'owner'::"text")))) OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



ALTER TABLE "public"."flowproperties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ilcd" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert by authenticated" ON "public"."roles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "insert by authenticated" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."lciamethods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lifecyclemodels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select" ON "public"."teams" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "select" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "select by authenticated" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."unitgroups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update by admin or owner or self" ON "public"."roles" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "roles_1"."user_id"
   FROM "public"."roles" "roles_1"
  WHERE ((("roles_1"."role")::"text" = 'admin'::"text") OR (("roles_1"."role")::"text" = 'owner'::"text")))) OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "update by owner and admin" ON "public"."teams" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "roles"."user_id"
   FROM "public"."roles"
  WHERE ((("roles"."role")::"text" = 'admin'::"text") OR (("roles"."role")::"text" = 'owner'::"text")))));



CREATE POLICY "update by review-admin or data owener" ON "public"."comments" FOR UPDATE TO "authenticated" USING ((("reviewer_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."roles"
  WHERE (("roles"."user_id" = "auth"."uid"()) AND (("roles"."role")::"text" = 'review-admin'::"text"))))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "postgres";













































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."_navicat_temp_stored_proc"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" numeric, "extracted_text_weight" numeric, "semantic_weight" numeric, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."_navicat_temp_stored_proc"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" numeric, "extracted_text_weight" numeric, "semantic_weight" numeric, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_navicat_temp_stored_proc"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" numeric, "extracted_text_weight" numeric, "semantic_weight" numeric, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."contacts_sync_jsonb_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."contacts_sync_jsonb_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."contacts_sync_jsonb_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."flowproperties_sync_jsonb_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."flowproperties_sync_jsonb_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."flowproperties_sync_jsonb_version"() TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."flows" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."flows" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."flows" TO "service_role";



GRANT ALL ON FUNCTION "public"."flows_embedding_input"("flow" "public"."flows") TO "anon";
GRANT ALL ON FUNCTION "public"."flows_embedding_input"("flow" "public"."flows") TO "authenticated";
GRANT ALL ON FUNCTION "public"."flows_embedding_input"("flow" "public"."flows") TO "service_role";



GRANT ALL ON FUNCTION "public"."flows_sync_jsonb_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."flows_sync_jsonb_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."flows_sync_jsonb_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_flow_embedding"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_flow_embedding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_flow_embedding"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hybrid_search_flows"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."hybrid_search_flows"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hybrid_search_flows"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."hybrid_search_lifecyclemodels"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."hybrid_search_lifecyclemodels"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hybrid_search_lifecyclemodels"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."hybrid_search_processes"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."hybrid_search_processes"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hybrid_search_processes"("query_text" "text", "query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "full_text_weight" double precision, "extracted_text_weight" double precision, "semantic_weight" double precision, "rrf_k" integer, "data_source" "text", "this_user_id" "text", "page_size" integer, "page_current" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."ilcd_classification_get"("this_file_name" "text", "category_type" "text", "get_values" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ilcd_classification_get"("this_file_name" "text", "category_type" "text", "get_values" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."ilcd_flow_categorization_get"("this_file_name" "text", "get_values" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ilcd_flow_categorization_get"("this_file_name" "text", "get_values" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."ilcd_location_get"("this_file_name" "text", "get_values" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ilcd_location_get"("this_file_name" "text", "get_values" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."lciamethods_sync_jsonb_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."lciamethods_sync_jsonb_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lciamethods_sync_jsonb_version"() TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lifecyclemodels" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lifecyclemodels" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lifecyclemodels" TO "service_role";



GRANT ALL ON FUNCTION "public"."lifecyclemodels_embedding_input"("models" "public"."lifecyclemodels") TO "anon";
GRANT ALL ON FUNCTION "public"."lifecyclemodels_embedding_input"("models" "public"."lifecyclemodels") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lifecyclemodels_embedding_input"("models" "public"."lifecyclemodels") TO "service_role";



GRANT ALL ON FUNCTION "public"."lifecyclemodels_sync_jsonb_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."lifecyclemodels_sync_jsonb_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lifecyclemodels_sync_jsonb_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search"("query_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search"("query_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search"("query_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_contacts"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_contacts"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_contacts"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_flowproperties"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_flowproperties"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_flowproperties"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_flows"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_flows"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_flows"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_flows_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_flows_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_flows_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_lifecyclemodels"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_lifecyclemodels"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_lifecyclemodels"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_lifecyclemodels_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_lifecyclemodels_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_lifecyclemodels_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_processes"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_processes"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_processes"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_processes_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_processes_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_processes_text"("query_text" "text", "page_size" integer, "page_current" integer, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_sources"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_sources"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_sources"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgroonga_search_unitgroups"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgroonga_search_unitgroups"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgroonga_search_unitgroups"("query_text" "text", "filter_condition" "text", "page_size" bigint, "page_current" bigint, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."processes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."processes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."processes" TO "service_role";



GRANT ALL ON FUNCTION "public"."processes_embedding_input"("proc" "public"."processes") TO "anon";
GRANT ALL ON FUNCTION "public"."processes_embedding_input"("proc" "public"."processes") TO "authenticated";
GRANT ALL ON FUNCTION "public"."processes_embedding_input"("proc" "public"."processes") TO "service_role";



GRANT ALL ON FUNCTION "public"."processes_sync_jsonb_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."processes_sync_jsonb_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."processes_sync_jsonb_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."semantic_search"("query_embedding" "text", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."semantic_search"("query_embedding" "text", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."semantic_search"("query_embedding" "text", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."semantic_search_flows"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."semantic_search_flows"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."semantic_search_flows"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."semantic_search_lifecyclemodels"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."semantic_search_lifecyclemodels"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."semantic_search_lifecyclemodels"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."semantic_search_processes"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."semantic_search_processes"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."semantic_search_processes"("query_embedding" "text", "filter_condition" "text", "match_threshold" double precision, "match_count" integer, "data_source" "text", "this_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sources_sync_jsonb_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."sources_sync_jsonb_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sources_sync_jsonb_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_auth_users_to_public_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_auth_users_to_public_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_auth_users_to_public_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_json_to_jsonb"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_json_to_jsonb"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_json_to_jsonb"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unitgroups_sync_jsonb_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."unitgroups_sync_jsonb_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."unitgroups_sync_jsonb_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_at"() TO "service_role";










































GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."contacts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."contacts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."contacts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."flowproperties" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."flowproperties" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."flowproperties" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ilcd" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ilcd" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ilcd" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lciamethods" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lciamethods" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lciamethods" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."logs_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reviews" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reviews" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reviews" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."roles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."roles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."roles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sources" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sources" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sources" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."teams" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."teams" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."teams" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."unitgroups" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."unitgroups" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."unitgroups" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";






























RESET ALL;
