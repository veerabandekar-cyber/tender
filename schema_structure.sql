--
-- PostgreSQL database dump
--

\restrict uX8MVQtVAYtI6iRHLgso9bfsEc26SdwszyUA6CWFtu9ZfFijmLiuINmfs9sMgzf

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: catalogue_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catalogue_products (
    id uuid NOT NULL,
    name character varying(500) NOT NULL,
    type character varying(255) NOT NULL,
    category_id uuid NOT NULL,
    provider_id uuid,
    image_url character varying,
    additional_images json NOT NULL,
    video_url character varying,
    short_description text,
    detailed_description text,
    applications json NOT NULL,
    industries json NOT NULL,
    technical_highlights json NOT NULL,
    key_features json NOT NULL,
    test_types json NOT NULL,
    price_range character varying(255) NOT NULL,
    price_currency character varying(10) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_upcoming boolean DEFAULT false NOT NULL
);


ALTER TABLE public.catalogue_products OWNER TO postgres;

--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_categories (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_categories OWNER TO postgres;

--
-- Name: product_providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_providers (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    website_url character varying(500),
    country character varying(100),
    description text,
    logo_url character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_providers OWNER TO postgres;

--
-- Name: catalogue_products catalogue_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogue_products
    ADD CONSTRAINT catalogue_products_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_providers product_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_providers
    ADD CONSTRAINT product_providers_pkey PRIMARY KEY (id);


--
-- Name: ix_catalogue_products_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_catalogue_products_category_id ON public.catalogue_products USING btree (category_id);


--
-- Name: ix_catalogue_products_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_catalogue_products_name ON public.catalogue_products USING btree (name);


--
-- Name: ix_catalogue_products_provider_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_catalogue_products_provider_id ON public.catalogue_products USING btree (provider_id);


--
-- Name: ix_product_categories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_product_categories_name ON public.product_categories USING btree (name);


--
-- Name: ix_product_providers_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_providers_name ON public.product_providers USING btree (name);


--
-- Name: catalogue_products catalogue_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogue_products
    ADD CONSTRAINT catalogue_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id);


--
-- Name: catalogue_products catalogue_products_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogue_products
    ADD CONSTRAINT catalogue_products_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.product_providers(id);


--
-- PostgreSQL database dump complete
--

\unrestrict uX8MVQtVAYtI6iRHLgso9bfsEc26SdwszyUA6CWFtu9ZfFijmLiuINmfs9sMgzf

