--
-- PostgreSQL database dump
--

\restrict i0oBdMLxkc8DQDBiRlhOGXOom0rcuoJTZzVftre53cISMidOP7UG1n6BmlXqNVA

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

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
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ApprovalStatus" OWNER TO postgres;

--
-- Name: ContractStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ContractStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'COMPLETED',
    'TERMINATED'
);


ALTER TYPE public."ContractStatus" OWNER TO postgres;

--
-- Name: ContractType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ContractType" AS ENUM (
    'CLIENT',
    'SUBCONTRACTOR',
    'SUPPLIER',
    'LABOR'
);


ALTER TYPE public."ContractType" OWNER TO postgres;

--
-- Name: FieldMaterialPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FieldMaterialPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."FieldMaterialPriority" OWNER TO postgres;

--
-- Name: FieldMaterialRequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FieldMaterialRequestStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'ISSUED',
    'RECEIVED',
    'CANCELLED'
);


ALTER TYPE public."FieldMaterialRequestStatus" OWNER TO postgres;

--
-- Name: FieldProgressEntryStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FieldProgressEntryStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REVISION_REQUESTED',
    'CANCELLED'
);


ALTER TYPE public."FieldProgressEntryStatus" OWNER TO postgres;

--
-- Name: FieldProgressItemStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FieldProgressItemStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'PAUSED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."FieldProgressItemStatus" OWNER TO postgres;

--
-- Name: FieldProgressItemType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FieldProgressItemType" AS ENUM (
    'GROUP',
    'WORK',
    'NOTE'
);


ALTER TYPE public."FieldProgressItemType" OWNER TO postgres;

--
-- Name: MaterialMovementType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MaterialMovementType" AS ENUM (
    'IMPORT',
    'EXPORT',
    'TRANSFER',
    'RETURN'
);


ALTER TYPE public."MaterialMovementType" OWNER TO postgres;

--
-- Name: MaterialRequestPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MaterialRequestPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."MaterialRequestPriority" OWNER TO postgres;

--
-- Name: MaterialRequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MaterialRequestStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'ISSUED',
    'RECEIVED',
    'CANCELLED'
);


ALTER TYPE public."MaterialRequestStatus" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'PARTIAL',
    'PAID',
    'REJECTED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: ProjectRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProjectRole" AS ENUM (
    'PROJECT_MANAGER',
    'SITE_COMMANDER',
    'QA_QC',
    'HSE',
    'SUPERVISOR'
);


ALTER TYPE public."ProjectRole" OWNER TO postgres;

--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'PLANNING',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."ProjectStatus" OWNER TO postgres;

--
-- Name: SiteReportStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SiteReportStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'REVISION_REQUESTED',
    'LOCKED',
    'CANCELLED'
);


ALTER TYPE public."SiteReportStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'DIRECTOR',
    'MANAGER',
    'ENGINEER',
    'ACCOUNTANT',
    'STAFF'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

--
-- Name: WBSItemStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."WBSItemStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'PAUSED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."WBSItemStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ApprovalRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ApprovalRequest" (
    id text NOT NULL,
    "requesterId" text NOT NULL,
    "approverId" text,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ApprovalRequest" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    "projectId" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "beforeData" text,
    "afterData" text,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "senderId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ChatMessage" OWNER TO postgres;

--
-- Name: Contract; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Contract" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "supplierId" text,
    "contractNo" text NOT NULL,
    name text NOT NULL,
    type public."ContractType" NOT NULL,
    status public."ContractStatus" DEFAULT 'DRAFT'::public."ContractStatus" NOT NULL,
    value numeric(19,4) NOT NULL,
    "signDate" timestamp(3) without time zone,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Contract" OWNER TO postgres;

--
-- Name: Document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Document" (
    id text NOT NULL,
    "folderId" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    extension text NOT NULL,
    "originalName" text NOT NULL,
    "projectId" text NOT NULL,
    "storagePath" text NOT NULL,
    "storedName" text NOT NULL,
    "uploadedById" text NOT NULL
);


ALTER TABLE public."Document" OWNER TO postgres;

--
-- Name: DocumentFolder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentFolder" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "parentId" text,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."DocumentFolder" OWNER TO postgres;

--
-- Name: FieldMaterialRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FieldMaterialRequest" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "templateId" text NOT NULL,
    "itemId" text NOT NULL,
    "entryId" text,
    "requestDate" timestamp(3) without time zone NOT NULL,
    "neededDate" timestamp(3) without time zone,
    "requestedById" text NOT NULL,
    status public."FieldMaterialRequestStatus" DEFAULT 'DRAFT'::public."FieldMaterialRequestStatus" NOT NULL,
    priority public."FieldMaterialPriority" DEFAULT 'MEDIUM'::public."FieldMaterialPriority" NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."FieldMaterialRequest" OWNER TO postgres;

--
-- Name: FieldMaterialRequestItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FieldMaterialRequestItem" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "materialName" text NOT NULL,
    unit text NOT NULL,
    "requestedQuantity" numeric(19,4) NOT NULL,
    reason text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."FieldMaterialRequestItem" OWNER TO postgres;

--
-- Name: FieldProgressEntry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FieldProgressEntry" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "templateId" text NOT NULL,
    "itemId" text NOT NULL,
    "entryDate" timestamp(3) without time zone NOT NULL,
    quantity numeric(19,4) NOT NULL,
    "issueNote" text,
    "proposalNote" text,
    note text,
    status public."FieldProgressEntryStatus" DEFAULT 'DRAFT'::public."FieldProgressEntryStatus" NOT NULL,
    "createdById" text NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."FieldProgressEntry" OWNER TO postgres;

--
-- Name: FieldProgressItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FieldProgressItem" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "templateId" text NOT NULL,
    "parentId" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 0 NOT NULL,
    "itemType" public."FieldProgressItemType" DEFAULT 'WORK'::public."FieldProgressItemType" NOT NULL,
    code text,
    "categoryName" text,
    "workContent" text,
    "constructionCrew" text,
    "designQuantity" numeric(19,4),
    unit text,
    status public."FieldProgressItemStatus" DEFAULT 'PLANNED'::public."FieldProgressItemStatus" NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    note text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."FieldProgressItem" OWNER TO postgres;

--
-- Name: FieldProgressTemplate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FieldProgressTemplate" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."FieldProgressTemplate" OWNER TO postgres;

--
-- Name: MaterialItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MaterialItem" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MaterialItem" OWNER TO postgres;

--
-- Name: MaterialMovement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MaterialMovement" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "materialItemId" text NOT NULL,
    type public."MaterialMovementType" NOT NULL,
    quantity numeric(19,4) NOT NULL,
    "unitPrice" numeric(19,4),
    "movementDate" timestamp(3) without time zone NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MaterialMovement" OWNER TO postgres;

--
-- Name: MaterialRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MaterialRequest" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "siteReportId" text,
    "requestedById" text NOT NULL,
    "requestDate" timestamp(3) without time zone NOT NULL,
    "neededDate" timestamp(3) without time zone,
    status public."MaterialRequestStatus" DEFAULT 'DRAFT'::public."MaterialRequestStatus" NOT NULL,
    priority public."MaterialRequestPriority" DEFAULT 'MEDIUM'::public."MaterialRequestPriority" NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."MaterialRequest" OWNER TO postgres;

--
-- Name: MaterialRequestItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MaterialRequestItem" (
    id text NOT NULL,
    "materialRequestId" text NOT NULL,
    "wbsItemId" text,
    "materialName" text NOT NULL,
    unit text NOT NULL,
    "requestedQuantity" numeric(19,4) NOT NULL,
    reason text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."MaterialRequestItem" OWNER TO postgres;

--
-- Name: PaymentPlan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaymentPlan" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "contractId" text,
    name text NOT NULL,
    amount numeric(19,4) NOT NULL,
    "plannedDate" timestamp(3) without time zone NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PaymentPlan" OWNER TO postgres;

--
-- Name: PaymentRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaymentRecord" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "paymentPlanId" text,
    amount numeric(19,4) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "referenceNo" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PaymentRecord" OWNER TO postgres;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status public."ProjectStatus" DEFAULT 'PLANNING'::public."ProjectStatus" NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    budget numeric(19,4),
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    location text,
    investor text
);


ALTER TABLE public."Project" OWNER TO postgres;

--
-- Name: ProjectMember; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProjectMember" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "userId" text NOT NULL,
    role public."ProjectRole" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leftAt" timestamp(3) without time zone
);


ALTER TABLE public."ProjectMember" OWNER TO postgres;

--
-- Name: SiteReport; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SiteReport" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "reportDate" timestamp(3) without time zone NOT NULL,
    weather text,
    status public."SiteReportStatus" DEFAULT 'DRAFT'::public."SiteReportStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedById" text,
    "createdById" text NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "equipmentNote" text,
    "generalNote" text,
    "manpowerCount" integer,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone,
    title text
);


ALTER TABLE public."SiteReport" OWNER TO postgres;

--
-- Name: SiteReportLine; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SiteReportLine" (
    id text NOT NULL,
    "siteReportId" text NOT NULL,
    "projectId" text NOT NULL,
    "wbsItemId" text NOT NULL,
    "workContent" text NOT NULL,
    "constructionCrew" text,
    unit text,
    "designQuantity" numeric(19,4),
    "quantityToday" numeric(19,4) NOT NULL,
    "quantityBefore" numeric(19,4) DEFAULT 0 NOT NULL,
    "quantityCumulative" numeric(19,4) DEFAULT 0 NOT NULL,
    "progressPercent" numeric(5,2) DEFAULT 0 NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "issueNote" text,
    "proposalNote" text
);


ALTER TABLE public."SiteReportLine" OWNER TO postgres;

--
-- Name: SiteReportPhoto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SiteReportPhoto" (
    id text NOT NULL,
    "reportId" text NOT NULL,
    "storageKey" text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SiteReportPhoto" OWNER TO postgres;

--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "taxCode" text,
    address text,
    phone text,
    email text,
    "contactPerson" text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Supplier" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."UserRole" DEFAULT 'STAFF'::public."UserRole" NOT NULL,
    phone text,
    avatar text,
    "isActive" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: WBSItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."WBSItem" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "parentId" text,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    progress numeric(5,2) DEFAULT 0 NOT NULL,
    budget numeric(19,4),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text,
    "deletedAt" timestamp(3) without time zone,
    "designQuantity" numeric(19,4),
    note text,
    "plannedEndDate" timestamp(3) without time zone,
    "plannedStartDate" timestamp(3) without time zone,
    status public."WBSItemStatus" DEFAULT 'PLANNED'::public."WBSItemStatus" NOT NULL,
    unit text DEFAULT 'Lần'::text NOT NULL
);


ALTER TABLE public."WBSItem" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: ApprovalRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ApprovalRequest" (id, "requesterId", "approverId", "entityType", "entityId", status, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, "userId", "projectId", action, "entityType", "entityId", "beforeData", "afterData", "ipAddress", "userAgent", "createdAt") FROM stdin;
cmq4ntqy20009h8wkrjyfkq8p	cmq4ljlku0000cwwkewrboncw	cmq4ntqx10000h8wkwqq0n50b	CREATE	Project	cmq4ntqx10000h8wkwqq0n50b	\N	{"id":"cmq4ntqx10000h8wkwqq0n50b","code":"CT001","name":"CT test","description":"","investor":"Chủ đầu tư test","location":"Hà Nội","status":"ACTIVE","startDate":"2026-06-03T00:00:00.000Z","endDate":"2027-02-27T00:00:00.000Z","budget":null,"deletedAt":null,"createdAt":"2026-06-08T03:37:14.630Z","updatedAt":"2026-06-08T03:37:14.630Z"}	\N	\N	2026-06-08 03:37:14.666
cmq4nwqmi000ah8wk7qnke8pj	cmq4ljlku0000cwwkewrboncw	cmq4ntqx10000h8wkwqq0n50b	SOFT_DELETE	Project	cmq4ntqx10000h8wkwqq0n50b	{"id":"cmq4ntqx10000h8wkwqq0n50b","code":"CT001","name":"CT test","description":"","investor":"Chủ đầu tư test","location":"Hà Nội","status":"ACTIVE","startDate":"2026-06-03T00:00:00.000Z","endDate":"2027-02-27T00:00:00.000Z","budget":null,"deletedAt":null,"createdAt":"2026-06-08T03:37:14.630Z","updatedAt":"2026-06-08T03:37:14.630Z"}	{"id":"cmq4ntqx10000h8wkwqq0n50b","code":"CT001","name":"CT test","description":"","investor":"Chủ đầu tư test","location":"Hà Nội","status":"ACTIVE","startDate":"2026-06-03T00:00:00.000Z","endDate":"2027-02-27T00:00:00.000Z","budget":null,"deletedAt":"2026-06-08T03:39:34.210Z","createdAt":"2026-06-08T03:37:14.630Z","updatedAt":"2026-06-08T03:39:34.214Z"}	\N	\N	2026-06-08 03:39:34.218
cmq4o4w2f000kh8wkolvdq4ib	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	CREATE	Project	cmq4o4w27000bh8wkq961gh22	\N	{"id":"cmq4o4w27000bh8wkq961gh22","code":"CT0011","name":"test1","description":"","investor":"Chủ đầu tư test1","location":"Hà Nội1","status":"ACTIVE","startDate":"2026-06-06T00:00:00.000Z","endDate":"2026-10-16T00:00:00.000Z","budget":null,"deletedAt":null,"createdAt":"2026-06-08T03:45:54.511Z","updatedAt":"2026-06-08T03:45:54.511Z"}	\N	\N	2026-06-08 03:45:54.519
cmq4oiw5l000uh8wk1ys4eiar	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	CREATE	Project	cmq4oiw57000lh8wka1w5o232	\N	{"id":"cmq4oiw57000lh8wka1w5o232","code":"123","name":"test12","description":"","investor":"Chủ đầu tư test12","location":"Hà Nội","status":"ACTIVE","startDate":"2026-06-01T00:00:00.000Z","endDate":"2026-11-20T00:00:00.000Z","budget":null,"deletedAt":null,"createdAt":"2026-06-08T03:56:47.803Z","updatedAt":"2026-06-08T03:56:47.803Z"}	\N	\N	2026-06-08 03:56:47.817
cmq4ot5om0014h8wk1u3918r0	cmq4ljlku0000cwwkewrboncw	cmq4ot5nu000vh8wk7g4edmxw	CREATE	Project	cmq4ot5nu000vh8wk7g4edmxw	\N	{"id":"cmq4ot5nu000vh8wk7g4edmxw","code":"QA-TEST-001","name":"Test Project","description":"","investor":"","location":"","status":"PLANNING","startDate":null,"endDate":null,"budget":null,"deletedAt":null,"createdAt":"2026-06-08T04:04:46.699Z","updatedAt":"2026-06-08T04:04:46.699Z"}	\N	\N	2026-06-08 04:04:46.726
cmq4pa5pg0001nkwkah1w6ttj	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	UPLOAD_DOCUMENT	Document	cmq4pa5op0000nkwkzjobvjt3	\N	{"id":"cmq4pa5op0000nkwkzjobvjt3","projectId":"cmq4oiw57000lh8wka1w5o232","folderId":"cmq4oiw5b000mh8wkrlwpdrih","originalName":"Bảo vệ.doc","storedName":"B_o_v__1780892279844_123fc78a.doc","mimeType":"application/msword","extension":".doc","size":73728,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\123\\\\documents\\\\cmq4oiw5b000mh8wkrlwpdrih\\\\B_o_v__1780892279844_123fc78a.doc","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":null,"createdAt":"2026-06-08T04:17:59.881Z","updatedAt":"2026-06-08T04:17:59.881Z"}	\N	\N	2026-06-08 04:17:59.908
cmq4pancn0002nkwknpob6yce	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	SOFT_DELETE_DOCUMENT	Document	cmq4pa5op0000nkwkzjobvjt3	{"id":"cmq4pa5op0000nkwkzjobvjt3","projectId":"cmq4oiw57000lh8wka1w5o232","folderId":"cmq4oiw5b000mh8wkrlwpdrih","originalName":"Bảo vệ.doc","storedName":"B_o_v__1780892279844_123fc78a.doc","mimeType":"application/msword","extension":".doc","size":73728,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\123\\\\documents\\\\cmq4oiw5b000mh8wkrlwpdrih\\\\B_o_v__1780892279844_123fc78a.doc","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":null,"createdAt":"2026-06-08T04:17:59.881Z","updatedAt":"2026-06-08T04:17:59.881Z"}	{"id":"cmq4pa5op0000nkwkzjobvjt3","projectId":"cmq4oiw57000lh8wka1w5o232","folderId":"cmq4oiw5b000mh8wkrlwpdrih","originalName":"Bảo vệ.doc","storedName":"B_o_v__1780892279844_123fc78a.doc","mimeType":"application/msword","extension":".doc","size":73728,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\123\\\\documents\\\\cmq4oiw5b000mh8wkrlwpdrih\\\\B_o_v__1780892279844_123fc78a.doc","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":"2026-06-08T04:18:22.758Z","createdAt":"2026-06-08T04:17:59.881Z","updatedAt":"2026-06-08T04:18:22.765Z"}	\N	\N	2026-06-08 04:18:22.775
cmq4pb9040004nkwkqlvex8mm	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	CREATE_FOLDER	DocumentFolder	cmq4pb8zx0003nkwktoomlma9	\N	{"id":"cmq4pb8zx0003nkwktoomlma9","projectId":"cmq4oiw57000lh8wka1w5o232","parentId":"cmq4oiw5b000mh8wkrlwpdrih","name":"ok","deletedAt":null,"createdAt":"2026-06-08T04:18:50.829Z","updatedAt":"2026-06-08T04:18:50.829Z"}	\N	\N	2026-06-08 04:18:50.836
cmq4pbt6z0006nkwkjugxqv7d	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	CREATE_FOLDER	DocumentFolder	cmq4pbt6g0005nkwkz8v1w6l0	\N	{"id":"cmq4pbt6g0005nkwkz8v1w6l0","projectId":"cmq4oiw57000lh8wka1w5o232","parentId":"cmq4oiw5b000mh8wkrlwpdrih","name":"SubFolder Test","deletedAt":null,"createdAt":"2026-06-08T04:19:16.984Z","updatedAt":"2026-06-08T04:19:16.984Z"}	\N	\N	2026-06-08 04:19:17.003
cmq4pfpaf0008nkwkks9ds7lv	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	CREATE_FOLDER	DocumentFolder	cmq4pfpa10007nkwk6542lp5k	\N	{"id":"cmq4pfpa10007nkwk6542lp5k","projectId":"cmq4o4w27000bh8wkq961gh22","parentId":"cmq4o4w29000ch8wk5divaso2","name":"SubFolder Test","deletedAt":null,"createdAt":"2026-06-08T04:22:18.553Z","updatedAt":"2026-06-08T04:22:18.553Z"}	\N	\N	2026-06-08 04:22:18.568
cmq7gj1ix00026owkzumabx3d	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-06	\N	[{"id":"cmq6hvs1q0011n8wkesr74qjw","code":null,"name":"Công việc đào móng","parentName":"Phần Cống","constructionCrew":"Mũi 223","designQuantity":4444,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"2222","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq6hvs1q0011n8wkesr74qjw"}]	\N	\N	2026-06-10 02:36:16.377
cmq4pgj5f000ankwkjyhviaco	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	UPLOAD_DOCUMENT	Document	cmq4pgj5a0009nkwkqlhbot8z	\N	{"id":"cmq4pgj5a0009nkwkqlhbot8z","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4o4w2d000ih8wkvwabcmi3","originalName":"434117417_1154596019233333_7399462298877532542_n.jpg","storedName":"434117417_1154596019233333_7399462298877532542_n_1780892577251_d9d8b072.jpg","mimeType":"image/jpeg","extension":".jpg","size":11463,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4o4w2d000ih8wkvwabcmi3\\\\434117417_1154596019233333_7399462298877532542_n_1780892577251_d9d8b072.jpg","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":null,"createdAt":"2026-06-08T04:22:57.262Z","updatedAt":"2026-06-08T04:22:57.262Z"}	\N	\N	2026-06-08 04:22:57.267
cmq4pgw7p000cnkwky9in0ew9	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	CREATE_FOLDER	DocumentFolder	cmq4pgw7m000bnkwki2qx0mpz	\N	{"id":"cmq4pgw7m000bnkwki2qx0mpz","projectId":"cmq4o4w27000bh8wkq961gh22","parentId":null,"name":"SubFolder Test","deletedAt":null,"createdAt":"2026-06-08T04:23:14.194Z","updatedAt":"2026-06-08T04:23:14.194Z"}	\N	\N	2026-06-08 04:23:14.197
cmq4ph254000dnkwko5l9i25y	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	SOFT_DELETE_DOCUMENT	Document	cmq4pgj5a0009nkwkqlhbot8z	{"id":"cmq4pgj5a0009nkwkqlhbot8z","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4o4w2d000ih8wkvwabcmi3","originalName":"434117417_1154596019233333_7399462298877532542_n.jpg","storedName":"434117417_1154596019233333_7399462298877532542_n_1780892577251_d9d8b072.jpg","mimeType":"image/jpeg","extension":".jpg","size":11463,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4o4w2d000ih8wkvwabcmi3\\\\434117417_1154596019233333_7399462298877532542_n_1780892577251_d9d8b072.jpg","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":null,"createdAt":"2026-06-08T04:22:57.262Z","updatedAt":"2026-06-08T04:22:57.262Z"}	{"id":"cmq4pgj5a0009nkwkqlhbot8z","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4o4w2d000ih8wkvwabcmi3","originalName":"434117417_1154596019233333_7399462298877532542_n.jpg","storedName":"434117417_1154596019233333_7399462298877532542_n_1780892577251_d9d8b072.jpg","mimeType":"image/jpeg","extension":".jpg","size":11463,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4o4w2d000ih8wkvwabcmi3\\\\434117417_1154596019233333_7399462298877532542_n_1780892577251_d9d8b072.jpg","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":"2026-06-08T04:23:21.874Z","createdAt":"2026-06-08T04:22:57.262Z","updatedAt":"2026-06-08T04:23:21.875Z"}	\N	\N	2026-06-08 04:23:21.88
cmq4pj2cj000fnkwkhk3yvyo7	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	UPLOAD_DOCUMENT	Document	cmq4pj2cc000enkwkwwdkl7bl	\N	{"id":"cmq4pj2cc000enkwkwwdkl7bl","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4pgw7m000bnkwki2qx0mpz","originalName":"Bảo vệ.doc","storedName":"B_o_v__1780892695449_e3afd5b2.doc","mimeType":"application/msword","extension":".doc","size":73728,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4pgw7m000bnkwki2qx0mpz\\\\B_o_v__1780892695449_e3afd5b2.doc","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":null,"createdAt":"2026-06-08T04:24:55.452Z","updatedAt":"2026-06-08T04:24:55.452Z"}	\N	\N	2026-06-08 04:24:55.459
cmq4pjrtm000hnkwktyum7nlp	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	UPLOAD_DOCUMENT	Document	cmq4pjrte000gnkwk4m6o77g6	\N	{"id":"cmq4pjrte000gnkwk4m6o77g6","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4o4w29000ch8wk5divaso2","originalName":"CHẾ TÀI PHẠT VI PHẠM AN NINH, AN TOÀN LAO ĐỘNG.xlsx","storedName":"CH__T_I_PH_T_VI_PH_M_AN_NINH__AN_TO_N_LAO___NG_1780892728463_8e1598dd.xlsx","mimeType":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","extension":".xlsx","size":21625,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4o4w29000ch8wk5divaso2\\\\CH__T_I_PH_T_VI_PH_M_AN_NINH__AN_TO_N_LAO___NG_1780892728463_8e1598dd.xlsx","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":null,"createdAt":"2026-06-08T04:25:28.467Z","updatedAt":"2026-06-08T04:25:28.467Z"}	\N	\N	2026-06-08 04:25:28.474
cmq4v5l870000a8wk158cgdhx	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	SOFT_DELETE_DOCUMENT	Document	cmq4pj2cc000enkwkwwdkl7bl	{"id":"cmq4pj2cc000enkwkwwdkl7bl","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4pgw7m000bnkwki2qx0mpz","originalName":"Bảo vệ.doc","storedName":"B_o_v__1780892695449_e3afd5b2.doc","mimeType":"application/msword","extension":".doc","size":73728,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4pgw7m000bnkwki2qx0mpz\\\\B_o_v__1780892695449_e3afd5b2.doc","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":null,"createdAt":"2026-06-08T04:24:55.452Z","updatedAt":"2026-06-08T04:24:55.452Z"}	{"id":"cmq4pj2cc000enkwkwwdkl7bl","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4pgw7m000bnkwki2qx0mpz","originalName":"Bảo vệ.doc","storedName":"B_o_v__1780892695449_e3afd5b2.doc","mimeType":"application/msword","extension":".doc","size":73728,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4pgw7m000bnkwki2qx0mpz\\\\B_o_v__1780892695449_e3afd5b2.doc","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":"2026-06-08T07:02:24.414Z","createdAt":"2026-06-08T04:24:55.452Z","updatedAt":"2026-06-08T07:02:24.418Z"}	\N	\N	2026-06-08 07:02:24.439
cmq4v5ohs0001a8wkfl3aln8a	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	SOFT_DELETE_FOLDER	DocumentFolder	cmq4pgw7m000bnkwki2qx0mpz	{"id":"cmq4pgw7m000bnkwki2qx0mpz","projectId":"cmq4o4w27000bh8wkq961gh22","parentId":null,"name":"SubFolder Test","deletedAt":null,"createdAt":"2026-06-08T04:23:14.194Z","updatedAt":"2026-06-08T04:23:14.194Z","_count":{"documents":0,"children":0}}	{"id":"cmq4pgw7m000bnkwki2qx0mpz","projectId":"cmq4o4w27000bh8wkq961gh22","parentId":null,"name":"SubFolder Test","deletedAt":"2026-06-08T07:02:28.668Z","createdAt":"2026-06-08T04:23:14.194Z","updatedAt":"2026-06-08T07:02:28.669Z"}	\N	\N	2026-06-08 07:02:28.672
cmq4v5so40002a8wk2a25he3q	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	SOFT_DELETE_DOCUMENT	Document	cmq4pjrte000gnkwk4m6o77g6	{"id":"cmq4pjrte000gnkwk4m6o77g6","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4o4w29000ch8wk5divaso2","originalName":"CHẾ TÀI PHẠT VI PHẠM AN NINH, AN TOÀN LAO ĐỘNG.xlsx","storedName":"CH__T_I_PH_T_VI_PH_M_AN_NINH__AN_TO_N_LAO___NG_1780892728463_8e1598dd.xlsx","mimeType":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","extension":".xlsx","size":21625,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4o4w29000ch8wk5divaso2\\\\CH__T_I_PH_T_VI_PH_M_AN_NINH__AN_TO_N_LAO___NG_1780892728463_8e1598dd.xlsx","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":null,"createdAt":"2026-06-08T04:25:28.467Z","updatedAt":"2026-06-08T04:25:28.467Z"}	{"id":"cmq4pjrte000gnkwk4m6o77g6","projectId":"cmq4o4w27000bh8wkq961gh22","folderId":"cmq4o4w29000ch8wk5divaso2","originalName":"CHẾ TÀI PHẠT VI PHẠM AN NINH, AN TOÀN LAO ĐỘNG.xlsx","storedName":"CH__T_I_PH_T_VI_PH_M_AN_NINH__AN_TO_N_LAO___NG_1780892728463_8e1598dd.xlsx","mimeType":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","extension":".xlsx","size":21625,"storagePath":"D:\\\\construction-erp-v2\\\\storage\\\\projects\\\\CT0011\\\\documents\\\\cmq4o4w29000ch8wk5divaso2\\\\CH__T_I_PH_T_VI_PH_M_AN_NINH__AN_TO_N_LAO___NG_1780892728463_8e1598dd.xlsx","uploadedById":"cmq4ljlku0000cwwkewrboncw","version":1,"deletedAt":"2026-06-08T07:02:34.080Z","createdAt":"2026-06-08T04:25:28.467Z","updatedAt":"2026-06-08T07:02:34.081Z"}	\N	\N	2026-06-08 07:02:34.084
cmq4z6gq20003dgwkg0z6hmmu	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	CREATE_SITE_REPORT_DRAFT	SiteReport	cmq4z6gp00000dgwkavkeljct	\N	{"id":"cmq4z6gp00000dgwkavkeljct","projectId":"cmq4oiw57000lh8wka1w5o232","title":"Xi măng","reportDate":"2026-06-08T00:00:00.000Z","weather":"","manpowerCount":null,"equipmentNote":"","generalNote":"","status":"DRAFT","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":null,"approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-08T08:55:03.684Z","updatedAt":"2026-06-08T08:55:03.684Z","deletedAt":null}	\N	\N	2026-06-08 08:55:03.722
cmq4zooeo0006dgwkd3dlzim5	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	SUBMIT_SITE_REPORT	SiteReport	cmq4z6gp00000dgwkavkeljct	{"id":"cmq4z6gp00000dgwkavkeljct","projectId":"cmq4oiw57000lh8wka1w5o232","title":"Xi măng","reportDate":"2026-06-08T00:00:00.000Z","weather":"","manpowerCount":null,"equipmentNote":"","generalNote":"","status":"DRAFT","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":null,"approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-08T08:55:03.684Z","updatedAt":"2026-06-08T08:55:03.684Z","deletedAt":null,"lines":[],"materialRequests":[{"id":"cmq4z6gpc0001dgwksdy3big7","projectId":"cmq4oiw57000lh8wka1w5o232","siteReportId":"cmq4z6gp00000dgwkavkeljct","requestedById":"cmq4ljlku0000cwwkewrboncw","requestDate":"2026-06-08T08:55:03.664Z","neededDate":null,"status":"DRAFT","priority":"MEDIUM","note":null,"createdAt":"2026-06-08T08:55:03.684Z","updatedAt":"2026-06-08T08:55:03.684Z","deletedAt":null,"items":[{"id":"cmq4z6gpf0002dgwk2g7g1360","materialRequestId":"cmq4z6gpc0001dgwksdy3big7","wbsItemId":null,"materialName":"","unit":"","requestedQuantity":"0","reason":"","note":"","createdAt":"2026-06-08T08:55:03.684Z","updatedAt":"2026-06-08T08:55:03.684Z","deletedAt":null}]}]}	{"id":"cmq4z6gp00000dgwkavkeljct","projectId":"cmq4oiw57000lh8wka1w5o232","title":"Xi măng","reportDate":"2026-06-08T00:00:00.000Z","weather":"","manpowerCount":null,"equipmentNote":"","generalNote":"","status":"SUBMITTED","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":"2026-06-08T09:09:13.474Z","approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-08T08:55:03.684Z","updatedAt":"2026-06-08T09:09:13.478Z","deletedAt":null}	\N	\N	2026-06-08 09:09:13.488
cmq4zorz60007dgwkm1ljf254	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	APPROVE_SITE_REPORT	SiteReport	cmq4z6gp00000dgwkavkeljct	{"id":"cmq4z6gp00000dgwkavkeljct","projectId":"cmq4oiw57000lh8wka1w5o232","title":"Xi măng","reportDate":"2026-06-08T00:00:00.000Z","weather":"","manpowerCount":null,"equipmentNote":"","generalNote":"","status":"SUBMITTED","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":"2026-06-08T09:09:13.474Z","approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-08T08:55:03.684Z","updatedAt":"2026-06-08T09:09:13.478Z","deletedAt":null}	{"id":"cmq4z6gp00000dgwkavkeljct","projectId":"cmq4oiw57000lh8wka1w5o232","title":"Xi măng","reportDate":"2026-06-08T00:00:00.000Z","weather":"","manpowerCount":null,"equipmentNote":"","generalNote":"","status":"APPROVED","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":"2026-06-08T09:09:13.474Z","approvedById":"cmq4ljlku0000cwwkewrboncw","approvedAt":"2026-06-08T09:09:18.109Z","rejectedReason":null,"createdAt":"2026-06-08T08:55:03.684Z","updatedAt":"2026-06-08T09:09:18.111Z","deletedAt":null}	\N	\N	2026-06-08 09:09:18.114
cmq51zc0h00000swkgrni1rqg	cmq4ljlku0000cwwkewrboncw	cmq508hob0000ucwkbc8nz9d4	SOFT_DELETE	Project	cmq508hob0000ucwkbc8nz9d4	{"id":"cmq508hob0000ucwkbc8nz9d4","code":"CT-QA-PROGRESS","name":"Công trình test tiến độ động","description":null,"investor":"Chủ đầu tư QA","location":"Hà Nội","status":"ACTIVE","startDate":null,"endDate":null,"budget":null,"deletedAt":null,"createdAt":"2026-06-08T09:24:37.883Z","updatedAt":"2026-06-08T09:24:37.883Z"}	{"id":"cmq508hob0000ucwkbc8nz9d4","code":"CT-QA-PROGRESS","name":"Công trình test tiến độ động","description":null,"investor":"Chủ đầu tư QA","location":"Hà Nội","status":"ACTIVE","startDate":null,"endDate":null,"budget":null,"deletedAt":"2026-06-08T10:13:29.847Z","createdAt":"2026-06-08T09:24:37.883Z","updatedAt":"2026-06-08T10:13:29.855Z"}	\N	\N	2026-06-08 10:13:29.873
cmq51zev300010swk99g30fx4	cmq4ljlku0000cwwkewrboncw	cmq4oiw57000lh8wka1w5o232	SOFT_DELETE	Project	cmq4oiw57000lh8wka1w5o232	{"id":"cmq4oiw57000lh8wka1w5o232","code":"123","name":"test12","description":"","investor":"Chủ đầu tư test12","location":"Hà Nội","status":"ACTIVE","startDate":"2026-06-01T00:00:00.000Z","endDate":"2026-11-20T00:00:00.000Z","budget":null,"deletedAt":null,"createdAt":"2026-06-08T03:56:47.803Z","updatedAt":"2026-06-08T03:56:47.803Z"}	{"id":"cmq4oiw57000lh8wka1w5o232","code":"123","name":"test12","description":"","investor":"Chủ đầu tư test12","location":"Hà Nội","status":"ACTIVE","startDate":"2026-06-01T00:00:00.000Z","endDate":"2026-11-20T00:00:00.000Z","budget":null,"deletedAt":"2026-06-08T10:13:33.563Z","createdAt":"2026-06-08T03:56:47.803Z","updatedAt":"2026-06-08T10:13:33.564Z"}	\N	\N	2026-06-08 10:13:33.567
cmq51zhaj00020swk2tn1buxz	cmq4ljlku0000cwwkewrboncw	cmq4o4w27000bh8wkq961gh22	SOFT_DELETE	Project	cmq4o4w27000bh8wkq961gh22	{"id":"cmq4o4w27000bh8wkq961gh22","code":"CT0011","name":"test1","description":"","investor":"Chủ đầu tư test1","location":"Hà Nội1","status":"ACTIVE","startDate":"2026-06-06T00:00:00.000Z","endDate":"2026-10-16T00:00:00.000Z","budget":null,"deletedAt":null,"createdAt":"2026-06-08T03:45:54.511Z","updatedAt":"2026-06-08T03:45:54.511Z"}	{"id":"cmq4o4w27000bh8wkq961gh22","code":"CT0011","name":"test1","description":"","investor":"Chủ đầu tư test1","location":"Hà Nội1","status":"ACTIVE","startDate":"2026-06-06T00:00:00.000Z","endDate":"2026-10-16T00:00:00.000Z","budget":null,"deletedAt":"2026-06-08T10:13:36.712Z","createdAt":"2026-06-08T03:45:54.511Z","updatedAt":"2026-06-08T10:13:36.712Z"}	\N	\N	2026-06-08 10:13:36.715
cmq52cri7000c0swkcry8nya3	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE	Project	cmq52crh500030swk5u8cc1vd	\N	{"id":"cmq52crh500030swk5u8cc1vd","code":"CT-001","name":"Du an Nguyen Trai","description":"","investor":"","location":"","status":"PLANNING","startDate":null,"endDate":null,"budget":null,"deletedAt":null,"createdAt":"2026-06-08T10:23:56.441Z","updatedAt":"2026-06-08T10:23:56.441Z"}	\N	\N	2026-06-08 10:23:56.479
cmq52eolu0001b4wkmj8l232v	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_TEMPLATE	FieldProgressTemplate	cmq52eolh0000b4wkd79yrh6m	\N	\N	\N	\N	2026-06-08 10:25:26.034
cmq52fakg0003b4wk82vllj1w	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq52fak90002b4wkidxzu9qg	\N	{"id":"cmq52fak90002b4wkidxzu9qg","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-08T10:25:54.489Z","updatedAt":"2026-06-08T10:25:54.489Z","deletedAt":null}	\N	\N	2026-06-08 10:25:54.496
cmq52for40004b4wkndvwf4e2	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq52fak90002b4wkidxzu9qg	\N	\N	\N	\N	2026-06-08 10:26:12.88
cmq5y9t3g0001m8wk3xfft8rq	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5y9t2y0000m8wkx0oq8jbh	\N	{"id":"cmq5y9t2y0000m8wkx0oq8jbh","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:17:26.267Z","updatedAt":"2026-06-09T01:17:26.267Z","deletedAt":null}	\N	\N	2026-06-09 01:17:26.284
cmq5yanvj0003m8wkazwn9o5m	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yanvc0002m8wkw96awura	\N	{"id":"cmq5yanvc0002m8wkw96awura","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5y9t2y0000m8wkx0oq8jbh","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:18:06.168Z","updatedAt":"2026-06-09T01:18:06.168Z","deletedAt":null}	\N	\N	2026-06-09 01:18:06.175
cmq5yawxh0004m8wke4h1d59q	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yanvc0002m8wkw96awura	\N	\N	\N	\N	2026-06-09 01:18:17.909
cmq5yazjm0005m8wkm2cgcz2v	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5y9t2y0000m8wkx0oq8jbh	\N	\N	\N	\N	2026-06-09 01:18:21.298
cmq5yb2k10007m8wknekwprz8	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yb2jy0006m8wkq8ehr2ni	\N	{"id":"cmq5yb2jy0006m8wkq8ehr2ni","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:18:25.198Z","updatedAt":"2026-06-09T01:18:25.198Z","deletedAt":null}	\N	\N	2026-06-09 01:18:25.201
cmq5ych9m0009m8wklcn7pcly	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ych9g0008m8wk1gnyk9ie	\N	{"id":"cmq5ych9g0008m8wk1gnyk9ie","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5yb2jy0006m8wkq8ehr2ni","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:19:30.916Z","updatedAt":"2026-06-09T01:19:30.916Z","deletedAt":null}	\N	\N	2026-06-09 01:19:30.922
cmq5ydr92000am8wkl5on253y	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ych9g0008m8wk1gnyk9ie	\N	\N	\N	\N	2026-06-09 01:20:30.518
cmq5ydt0a000bm8wk9u31gwt5	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yb2jy0006m8wkq8ehr2ni	\N	\N	\N	\N	2026-06-09 01:20:32.794
cmq5ykn3n000dm8wkwg00ro4b	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ykn3k000cm8wk9l46w7dq	\N	{"id":"cmq5ykn3k000cm8wk9l46w7dq","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:25:51.728Z","updatedAt":"2026-06-09T01:25:51.728Z","deletedAt":null}	\N	\N	2026-06-09 01:25:51.731
cmq5yl9zj000fm8wkxh698xn7	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yl9zc000em8wkjn1wgeq9	\N	{"id":"cmq5yl9zc000em8wkjn1wgeq9","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5ykn3k000cm8wk9l46w7dq","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:26:21.384Z","updatedAt":"2026-06-09T01:26:21.384Z","deletedAt":null}	\N	\N	2026-06-09 01:26:21.391
cmq5ylgrr000gm8wkxpicy11o	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yl9zc000em8wkjn1wgeq9	\N	\N	\N	\N	2026-06-09 01:26:30.184
cmq5yol21000im8wkxudp9kfr	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yol1x000hm8wk0cpvhkb1	\N	{"id":"cmq5yol1x000hm8wk0cpvhkb1","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":1,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:28:55.701Z","updatedAt":"2026-06-09T01:28:55.701Z","deletedAt":null}	\N	\N	2026-06-09 01:28:55.705
cmq5yoxpf000km8wkq1crf1x7	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yoxp9000jm8wk7mmhkuh6	\N	{"id":"cmq5yoxp9000jm8wk7mmhkuh6","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5ykn3k000cm8wk9l46w7dq","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:29:12.094Z","updatedAt":"2026-06-09T01:29:12.094Z","deletedAt":null}	\N	\N	2026-06-09 01:29:12.099
cmq5ypbno000mm8wkw3qdmzn2	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ypbnh000lm8wk1n0pnqh1	\N	{"id":"cmq5ypbnh000lm8wk1n0pnqh1","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5ykn3k000cm8wk9l46w7dq","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:29:30.173Z","updatedAt":"2026-06-09T01:29:30.173Z","deletedAt":null}	\N	\N	2026-06-09 01:29:30.18
cmq5zuvz6001dm8wk58kqqbi3	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5zuvyu001cm8wkqmz4uyab	\N	{"id":"cmq5zuvyu001cm8wkqmz4uyab","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:01:49.398Z","updatedAt":"2026-06-09T02:01:49.398Z","deletedAt":null}	\N	\N	2026-06-09 02:01:49.41
cmq5yqf8m000nm8wkb82ysmkc	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq5yoxp9000jm8wk7mmhkuh6","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5ykn3k000cm8wk9l46w7dq","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"ok","constructionCrew":"ok1","designQuantity":"333","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:29:12.094Z","updatedAt":"2026-06-09T01:29:12.094Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"0","rollupCumulative":"0","rollupPercent":null},{"id":"cmq5ypbnh000lm8wk1n0pnqh1","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5ykn3k000cm8wk9l46w7dq","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"ok","constructionCrew":"ok2","designQuantity":"144","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:29:30.173Z","updatedAt":"2026-06-09T01:29:30.173Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"0","rollupCumulative":"0","rollupPercent":null}]	\N	\N	2026-06-09 01:30:21.478
cmq5yrrtv000qm8wk4smra4c6	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq5yoxp9000jm8wk7mmhkuh6","code":null,"name":"ok","parentName":"Hạng mục mới","constructionCrew":"ok1","designQuantity":333,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"332","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5yoxp9000jm8wk7mmhkuh6"},{"id":"cmq5ypbnh000lm8wk1n0pnqh1","code":null,"name":"ok","parentName":"Hạng mục mới","constructionCrew":"ok2","designQuantity":144,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"111","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5ypbnh000lm8wk1n0pnqh1"}]	\N	\N	2026-06-09 01:31:24.451
cmq5yruv3000rm8wkx27gc3e7	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"itemId":"cmq5yoxp9000jm8wk7mmhkuh6","quantity":332,"issueNote":"","proposalNote":"","note":""},{"itemId":"cmq5ypbnh000lm8wk1n0pnqh1","quantity":111,"issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 01:31:28.383
cmq5ysgkc000sm8wkxhjmhrod	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yol1x000hm8wk0cpvhkb1	\N	\N	\N	\N	2026-06-09 01:31:56.508
cmq5ysin3000tm8wk3ba4e5un	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ypbnh000lm8wk1n0pnqh1	\N	\N	\N	\N	2026-06-09 01:31:59.199
cmq5ysl2o000um8wk8vkkwuew	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5yoxp9000jm8wk7mmhkuh6	\N	\N	\N	\N	2026-06-09 01:32:02.352
cmq5ysn3f000vm8wkgep4n8an	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ykn3k000cm8wk9l46w7dq	\N	\N	\N	\N	2026-06-09 01:32:04.971
cmq5ysoz7000xm8wkavsqqg3v	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ysoz5000wm8wkb3o7vz99	\N	{"id":"cmq5ysoz5000wm8wkb3o7vz99","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:32:07.409Z","updatedAt":"2026-06-09T01:32:07.409Z","deletedAt":null}	\N	\N	2026-06-09 01:32:07.411
cmq5ystfo000ym8wkb02mc5zx	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ysoz5000wm8wkb3o7vz99	\N	\N	\N	\N	2026-06-09 01:32:13.188
cmq5zcq7s0010m8wkns2eklvs	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5zcq7d000zm8wkfv2aagzz	\N	{"id":"cmq5zcq7d000zm8wkfv2aagzz","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:47:42.121Z","updatedAt":"2026-06-09T01:47:42.121Z","deletedAt":null}	\N	\N	2026-06-09 01:47:42.136
cmq5zd0jw0011m8wkpl5w365z	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5zcq7d000zm8wkfv2aagzz	\N	\N	\N	\N	2026-06-09 01:47:55.533
cmq5ze4e30013m8wk804awp5i	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ze4e00012m8wkwqcd6674	\N	{"id":"cmq5ze4e00012m8wkwqcd6674","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:48:47.160Z","updatedAt":"2026-06-09T01:48:47.160Z","deletedAt":null}	\N	\N	2026-06-09 01:48:47.163
cmq5ze7wz0014m8wkbvpp0ghu	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5ze4e00012m8wkwqcd6674	\N	\N	\N	\N	2026-06-09 01:48:51.731
cmq5zgv580016m8wkb5o7ar9l	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5zgv520015m8wkzm97aoae	\N	{"id":"cmq5zgv520015m8wkzm97aoae","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:50:55.142Z","updatedAt":"2026-06-09T01:50:55.142Z","deletedAt":null}	\N	\N	2026-06-09 01:50:55.148
cmq5zhqak0017m8wkn1nom4b9	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5zgv520015m8wkzm97aoae	\N	\N	\N	\N	2026-06-09 01:51:35.516
cmq5zhqiv0018m8wko4peuywi	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5zgv520015m8wkzm97aoae	\N	\N	\N	\N	2026-06-09 01:51:35.815
cmq5zjg12001am8wk35l0se9c	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5zjg0y0019m8wkf3a5zn1k	\N	{"id":"cmq5zjg0y0019m8wkf3a5zn1k","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T01:52:55.522Z","updatedAt":"2026-06-09T01:52:55.522Z","deletedAt":null}	\N	\N	2026-06-09 01:52:55.526
cmq5zjju1001bm8wkj8d0r61o	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq5zjg0y0019m8wkf3a5zn1k	\N	\N	\N	\N	2026-06-09 01:53:00.457
cmq604490001fm8wkd0ulbyuh	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60448j001em8wk72emazh1	\N	{"id":"cmq60448j001em8wk72emazh1","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":1,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hanghạng","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:09:00.019Z","updatedAt":"2026-06-09T02:09:00.019Z","deletedAt":null}	\N	\N	2026-06-09 02:09:00.036
cmq6044en001hm8wkzgw7xzb0	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq6044ek001gm8wke87j37vy	\N	{"id":"cmq6044ek001gm8wke87j37vy","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60448j001em8wk72emazh1","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"cv1","constructionCrew":null,"designQuantity":"444","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:09:00.236Z","updatedAt":"2026-06-09T02:09:00.236Z","deletedAt":null}	\N	\N	2026-06-09 02:09:00.239
cmq609il6001jm8wk7r55iz8q	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-05-10	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":218.6,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"100","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"}]	\N	\N	2026-06-09 02:13:11.898
cmq609vdv001km8wkr7dqnaqb	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq60448j001em8wk72emazh1","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":1,"level":0,"itemType":"GROUP","code":null,"categoryName":"ok1","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:09:00.019Z","updatedAt":"2026-06-09T02:09:00.019Z","deletedAt":null,"children":[{"id":"cmq6044ek001gm8wke87j37vy","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60448j001em8wk72emazh1","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"cv1","constructionCrew":null,"designQuantity":"444","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:09:00.236Z","updatedAt":"2026-06-09T02:09:00.236Z","deletedAt":null,"children":[]}],"displayLevel":0,"rollupDesignQuantity":"444","rollupCumulative":"0","rollupPercent":"0.00"}]	\N	\N	2026-06-09 02:13:28.483
cmq60cbq6001mm8wk0ykbad2i	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"itemId":"cmq6044ek001gm8wke87j37vy","quantity":"441","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 02:15:22.974
cmq60cjfo001nm8wko9nr4j4y	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"itemId":"cmq6044ek001gm8wke87j37vy","quantity":"441","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 02:15:32.964
cmq60ee0c001om8wkpbu9dbb1	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq60448j001em8wk72emazh1","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":1,"level":0,"itemType":"GROUP","code":null,"categoryName":"ok1","workContent":"edfff","constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:09:00.019Z","updatedAt":"2026-06-09T02:13:28.468Z","deletedAt":null,"children":[{"id":"cmq6044ek001gm8wke87j37vy","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60448j001em8wk72emazh1","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"cv1","constructionCrew":null,"designQuantity":"444","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:09:00.236Z","updatedAt":"2026-06-09T02:09:00.236Z","deletedAt":null,"children":[]}],"displayLevel":0,"rollupDesignQuantity":"444","rollupCumulative":"0","rollupPercent":"0.00"}]	\N	\N	2026-06-09 02:16:59.244
cmq60ejas001qm8wk1m0gen5k	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60ejaq001pm8wkxvqnodty	\N	{"id":"cmq60ejaq001pm8wkxvqnodty","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60448j001em8wk72emazh1","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:17:06.098Z","updatedAt":"2026-06-09T02:17:06.098Z","deletedAt":null}	\N	\N	2026-06-09 02:17:06.1
cmq60emep001rm8wkw9ra9nfk	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60448j001em8wk72emazh1	\N	\N	\N	\N	2026-06-09 02:17:10.129
cmq60fp9g001tm8wk323564w9	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-05-13	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":218.6,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"50","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"}]	\N	\N	2026-06-09 02:18:00.484
cmq60gck7001vm8wk2jin6lkb	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60gck0001um8wkk4693rz3	\N	{"id":"cmq60gck0001um8wkk4693rz3","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5zzdww0000zkwksx5du1he","sortOrder":5,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"công việc 1","constructionCrew":"dfg","designQuantity":"3333","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:18:30.672Z","updatedAt":"2026-06-09T02:18:30.672Z","deletedAt":null}	\N	\N	2026-06-09 02:18:30.679
cmq60gnic001xm8wk955vcmh7	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"itemId":"cmq60gck0001um8wkk4693rz3","quantity":"2222","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 02:18:44.868
cmq7gecjo00006owk0tmy3xjw	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-04	\N	[{"itemId":"cmq60gck0001um8wkk4693rz3","quantity":"222","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-10 02:32:37.38
cmq60gno60021m8wkb5m5z67e	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-05-13	\N	[{"id":"cmq5zzdx30002zkwklrgpdxzc","code":null,"name":"Cống hộp 2,5x2m","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":120,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"0","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx30002zkwklrgpdxzc"},{"id":"cmq5zzdx70003zkwkrbwjtbsv","code":null,"name":"Cống hộp 1,5x1,5m","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":80,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"0","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx70003zkwkrbwjtbsv"},{"id":"cmq5zzdx90004zkwkw1b5qx04","code":null,"name":"Cống tròn D1000","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":60,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"0","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx90004zkwkw1b5qx04"}]	\N	\N	2026-06-09 02:18:45.078
cmq60hg9y0023m8wkig8z3waa	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-04	\N	[{"itemId":"cmq60gck0001um8wkk4693rz3","quantity":"222","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 02:19:22.15
cmq60i3er0025m8wkwq9pkz21	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-05-15	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":218.6,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"68.4","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"}]	\N	\N	2026-06-09 02:19:52.131
cmq60rps40001awwk9gt7n8m4	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60rpry0000awwk3tj38xt2	\N	{"id":"cmq60rpry0000awwk3tj38xt2","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":1,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:27:21.022Z","updatedAt":"2026-06-09T02:27:21.022Z","deletedAt":null}	\N	\N	2026-06-09 02:27:21.028
cmq60s4n80003awwkd18eosiu	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60s4n30002awwk2i3vxps0	\N	{"id":"cmq60s4n30002awwk2i3vxps0","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:27:40.287Z","updatedAt":"2026-06-09T02:27:40.287Z","deletedAt":null}	\N	\N	2026-06-09 02:27:40.292
cmq60smjz0005awwk1kbz86r0	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60smju0004awwk1zzm102h	\N	{"id":"cmq60smju0004awwk1zzm102h","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:28:03.498Z","updatedAt":"2026-06-09T02:28:03.498Z","deletedAt":null}	\N	\N	2026-06-09 02:28:03.503
cmq60t0f00006awwk9rmw6jqj	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq60s4n30002awwk2i3vxps0","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":"222","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:27:40.287Z","updatedAt":"2026-06-09T02:27:40.287Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"0","rollupCumulative":"0","rollupPercent":null},{"id":"cmq60smju0004awwk1zzm102h","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":"333","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:28:03.498Z","updatedAt":"2026-06-09T02:28:03.498Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"0","rollupCumulative":"0","rollupPercent":null}]	\N	\N	2026-06-09 02:28:21.468
cmq60v2k20007awwknocyofpf	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq60s4n30002awwk2i3vxps0","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"lần 1","constructionCrew":"mũi 1","designQuantity":"222","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:27:40.287Z","updatedAt":"2026-06-09T02:28:21.462Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"222","rollupCumulative":"0","rollupPercent":"0.00"},{"id":"cmq60rpry0000awwk3tj38xt2","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":null,"sortOrder":1,"level":0,"itemType":"GROUP","code":null,"categoryName":"xây tường","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:27:21.022Z","updatedAt":"2026-06-09T02:27:21.022Z","deletedAt":null,"children":[{"id":"cmq60s4n30002awwk2i3vxps0","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":"222","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:27:40.287Z","updatedAt":"2026-06-09T02:28:21.462Z","deletedAt":null,"children":[]},{"id":"cmq60smju0004awwk1zzm102h","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":"333","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:28:03.498Z","updatedAt":"2026-06-09T02:28:21.465Z","deletedAt":null,"children":[]}],"displayLevel":0,"rollupDesignQuantity":"555","rollupCumulative":"0","rollupPercent":"0.00"},{"id":"cmq60smju0004awwk1zzm102h","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"lần 2","constructionCrew":"mũi 2","designQuantity":"333","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:28:03.498Z","updatedAt":"2026-06-09T02:28:21.465Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"333","rollupCumulative":"0","rollupPercent":"0.00"}]	\N	\N	2026-06-09 02:29:57.554
cmq60vu01000aawwkgk26xudx	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq60s4n30002awwk2i3vxps0","code":null,"name":"lần 1","parentName":"xây tường","constructionCrew":"mũi 1","designQuantity":222,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"50","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60s4n30002awwk2i3vxps0"},{"id":"cmq60smju0004awwk1zzm102h","code":null,"name":"lần 2","parentName":"xây tường","constructionCrew":"mũi 2","designQuantity":333,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"40","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60smju0004awwk1zzm102h"}]	\N	\N	2026-06-09 02:30:33.121
cmq60vx0j000bawwk56mtq4gv	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"itemId":"cmq60s4n30002awwk2i3vxps0","quantity":"50","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq60smju0004awwk1zzm102h","quantity":"40","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq60gck0001um8wkk4693rz3","quantity":"2222","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 02:30:37.027
cmq60wbdw000eawwk8gl3md10	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-10	\N	[{"id":"cmq60s4n30002awwk2i3vxps0","code":null,"name":"lần 1","parentName":"xây tường","constructionCrew":"mũi 1","designQuantity":222,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"33","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60s4n30002awwk2i3vxps0"},{"id":"cmq60smju0004awwk1zzm102h","code":null,"name":"lần 2","parentName":"xây tường","constructionCrew":"mũi 2","designQuantity":333,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"33","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60smju0004awwk1zzm102h"}]	\N	\N	2026-06-09 02:30:55.652
cmq63lqfn0000rswk6oczlqpo	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq60s4n30002awwk2i3vxps0","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq60rpry0000awwk3tj38xt2","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":"kkk","workContent":"lần 1","constructionCrew":"mũi 1","designQuantity":"222","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:27:40.287Z","updatedAt":"2026-06-09T02:29:57.535Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"222","rollupCumulative":"0","rollupPercent":"0.00"}]	\N	\N	2026-06-09 03:46:40.787
cmq63m91n0001rswkpq2jggyr	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60s4n30002awwk2i3vxps0	\N	\N	\N	\N	2026-06-09 03:47:04.907
cmq63tb5j0003rswk4hpz61ma	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":218.6,"unit":"m","cumulativeBefore":218.4,"todayEntry":null,"materials":[],"quantity":"1","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"}]	\N	\N	2026-06-09 03:52:34.231
cmq63u7xs0004rswkwlncbzwl	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":218.6,"unit":"m","cumulativeBefore":218.4,"todayEntry":{"id":"cmq63tb4u0002rswk0bop4s3r","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","itemId":"cmq5zzdx00001zkwkccfbnid7","entryDate":"2026-06-09T00:00:00.000Z","quantity":"1","issueNote":"","proposalNote":"","note":"","status":"DRAFT","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":null,"approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-09T03:52:34.206Z","updatedAt":"2026-06-09T03:52:34.206Z","deletedAt":null},"materials":[],"quantity":"0.1","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"}]	\N	\N	2026-06-09 03:53:16.72
cmq6413dv0005rswkggo9evtu	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5zzdww0000zkwksx5du1he","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Cống hộp 2,5x2,5m Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":"219.9","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:05:19.284Z","updatedAt":"2026-06-09T02:05:19.284Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"218.6","rollupCumulative":"218.4","rollupPercent":"99.91"}]	\N	\N	2026-06-09 03:58:37.411
cmq641e5k0006rswk8y4rzk8x	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","parentId":"cmq5zzdww0000zkwksx5du1he","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Cống hộp 2,5x2,5m Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":"222","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T02:05:19.284Z","updatedAt":"2026-06-09T03:58:37.405Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"219.9","rollupCumulative":"218.4","rollupPercent":"99.32"}]	\N	\N	2026-06-09 03:58:51.368
cmq644xqi0008rswk1s31rbgw	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq5zzdx30002zkwklrgpdxzc","code":null,"name":"Cống hộp 2,5x2m","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":120,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"22","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx30002zkwklrgpdxzc"}]	\N	\N	2026-06-09 04:01:36.714
cmq6dh8al0000pgwk8y6t63ay	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"itemId":"cmq5zzdx00001zkwkccfbnid7","quantity":"0.1","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq60smju0004awwk1zzm102h","quantity":"40","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq5zzdx30002zkwklrgpdxzc","quantity":"22","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq60gck0001um8wkk4693rz3","quantity":"2222","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 08:23:06.813
cmq6dktb10001pgwkxm2k09hy	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":222,"unit":"m","cumulativeBefore":218.4,"todayEntry":{"id":"cmq63tb4u0002rswk0bop4s3r","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","itemId":"cmq5zzdx00001zkwkccfbnid7","entryDate":"2026-06-09T00:00:00.000Z","quantity":"0.1","issueNote":"","proposalNote":"","note":"","status":"SUBMITTED","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":"2026-06-09T08:23:06.765Z","approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-09T03:52:34.206Z","updatedAt":"2026-06-09T08:23:06.785Z","deletedAt":null},"materials":[],"quantity":"0.1","issueNote":"ffdd","proposalNote":"","note":"","status":"SUBMITTED","itemId":"cmq5zzdx00001zkwkccfbnid7"}]	\N	\N	2026-06-09 08:25:54.013
cmq6dmfme0003pgwkgtugbxuj	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-03	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":222,"unit":"m","cumulativeBefore":218.4,"todayEntry":null,"materials":[],"quantity":"0","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"}]	\N	\N	2026-06-09 08:27:09.59
cmq6dn65k0008pgwk5soru4fb	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-03	\N	[{"id":"cmq60smju0004awwk1zzm102h","code":null,"name":"lần 2","parentName":"xây tường","constructionCrew":"mũi 2","designQuantity":333,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"222","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60smju0004awwk1zzm102h"},{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":222,"unit":"m","cumulativeBefore":218.4,"todayEntry":null,"materials":[],"quantity":"2","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"},{"id":"cmq5zzdx30002zkwklrgpdxzc","code":null,"name":"Cống hộp 2,5x2m","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":120,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"222","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx30002zkwklrgpdxzc"},{"id":"cmq5zzdx70003zkwkrbwjtbsv","code":null,"name":"Cống hộp 1,5x1,5m","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":80,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"22","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx70003zkwkrbwjtbsv"},{"id":"cmq5zzdx90004zkwkw1b5qx04","code":null,"name":"Cống tròn D1000","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":60,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"22","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx90004zkwkw1b5qx04"}]	\N	\N	2026-06-09 08:27:43.976
cmq6g418u0002n8wkeu1mkryb	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq5zzdx70003zkwkrbwjtbsv","code":null,"name":"Cống hộp 1,5x1,5m","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":80,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"22","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx70003zkwkrbwjtbsv"},{"id":"cmq5zzdx90004zkwkw1b5qx04","code":null,"name":"Cống tròn D1000","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":60,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"40","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx90004zkwkw1b5qx04"}]	\N	\N	2026-06-09 09:36:49.998
cmq6g43lg0003n8wk0hf7o950	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-10	\N	[{"id":"cmq60smju0004awwk1zzm102h","code":null,"name":"lần 2","parentName":"xây tường","constructionCrew":"mũi 2","designQuantity":333,"unit":"m","cumulativeBefore":0,"todayEntry":{"id":"cmq60wbdr000dawwkplzvwngb","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","itemId":"cmq60smju0004awwk1zzm102h","entryDate":"2026-06-10T00:00:00.000Z","quantity":"33","issueNote":"","proposalNote":"","note":"","status":"DRAFT","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":null,"approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-09T02:30:55.647Z","updatedAt":"2026-06-09T02:30:55.647Z","deletedAt":null},"materials":[],"quantity":"","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60smju0004awwk1zzm102h"}]	\N	\N	2026-06-09 09:36:53.044
cmq6g45hp0005n8wkrkdr0s7w	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-10	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":222,"unit":"m","cumulativeBefore":218.4,"todayEntry":null,"materials":[],"quantity":"5","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"},{"id":"cmq60smju0004awwk1zzm102h","code":null,"name":"lần 2","parentName":"xây tường","constructionCrew":"mũi 2","designQuantity":333,"unit":"m","cumulativeBefore":0,"todayEntry":{"id":"cmq60wbdr000dawwkplzvwngb","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","itemId":"cmq60smju0004awwk1zzm102h","entryDate":"2026-06-10T00:00:00.000Z","quantity":"0","issueNote":"","proposalNote":"","note":"","status":"DRAFT","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":null,"approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-09T02:30:55.647Z","updatedAt":"2026-06-09T09:36:53.039Z","deletedAt":null},"materials":[],"quantity":"10","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60smju0004awwk1zzm102h"}]	\N	\N	2026-06-09 09:36:55.501
cmq6g47tl0006n8wkneplurna	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"itemId":"cmq5zzdx00001zkwkccfbnid7","quantity":"0.1","issueNote":"ffdd","proposalNote":"","note":""},{"itemId":"cmq60smju0004awwk1zzm102h","quantity":"40","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq5zzdx30002zkwklrgpdxzc","quantity":"22","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq60gck0001um8wkk4693rz3","quantity":"2222","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 09:36:58.521
cmq6g80hd0007n8wkndraczka	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq5zzdx70003zkwkrbwjtbsv","code":null,"name":"Cống hộp 1,5x1,5m","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":80,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"22","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx70003zkwkrbwjtbsv"},{"id":"cmq5zzdx90004zkwkw1b5qx04","code":null,"name":"Cống tròn D1000","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":60,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"40","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx90004zkwkw1b5qx04"}]	\N	\N	2026-06-09 09:39:55.633
cmq6g82ti0008n8wkfc8lbn94	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-10	\N	[{"id":"cmq60smju0004awwk1zzm102h","code":null,"name":"lần 2","parentName":"xây tường","constructionCrew":"mũi 2","designQuantity":333,"unit":"m","cumulativeBefore":0,"todayEntry":{"id":"cmq60wbdr000dawwkplzvwngb","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","itemId":"cmq60smju0004awwk1zzm102h","entryDate":"2026-06-10T00:00:00.000Z","quantity":"10","issueNote":"","proposalNote":"","note":"","status":"DRAFT","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":null,"approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-09T02:30:55.647Z","updatedAt":"2026-06-09T09:36:55.499Z","deletedAt":null},"materials":[],"quantity":"","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60smju0004awwk1zzm102h"}]	\N	\N	2026-06-09 09:39:58.662
cmq6g84os0009n8wkednr8akh	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-10	\N	[{"id":"cmq5zzdx00001zkwkccfbnid7","code":null,"name":"Cống hộp 2,5x2,5m Nguyễn Trãi","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 1","designQuantity":222,"unit":"m","cumulativeBefore":218.4,"todayEntry":null,"materials":[],"quantity":"5","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx00001zkwkccfbnid7"},{"id":"cmq60smju0004awwk1zzm102h","code":null,"name":"lần 2","parentName":"xây tường","constructionCrew":"mũi 2","designQuantity":333,"unit":"m","cumulativeBefore":0,"todayEntry":{"id":"cmq60wbdr000dawwkplzvwngb","projectId":"cmq52crh500030swk5u8cc1vd","templateId":"cmq52eolh0000b4wkd79yrh6m","itemId":"cmq60smju0004awwk1zzm102h","entryDate":"2026-06-10T00:00:00.000Z","quantity":"0","issueNote":"","proposalNote":"","note":"","status":"DRAFT","createdById":"cmq4ljlku0000cwwkewrboncw","submittedAt":null,"approvedById":null,"approvedAt":null,"rejectedReason":null,"createdAt":"2026-06-09T02:30:55.647Z","updatedAt":"2026-06-09T09:39:58.661Z","deletedAt":null},"materials":[],"quantity":"10","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq60smju0004awwk1zzm102h"}]	\N	\N	2026-06-09 09:40:01.084
cmq6g8726000an8wkprpopm7c	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SUBMIT_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"itemId":"cmq5zzdx00001zkwkccfbnid7","quantity":"0.1","issueNote":"ffdd","proposalNote":"","note":""},{"itemId":"cmq60smju0004awwk1zzm102h","quantity":"40","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq5zzdx30002zkwklrgpdxzc","quantity":"22","issueNote":"","proposalNote":"","note":""},{"itemId":"cmq60gck0001um8wkk4693rz3","quantity":"2222","issueNote":"","proposalNote":"","note":""}]	\N	\N	2026-06-09 09:40:04.158
cmq6g8cq2000cn8wk2oslrnrr	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-10	\N	[{"id":"cmq5zzdx90004zkwkw1b5qx04","code":null,"name":"Cống tròn D1000","parentName":"Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi","constructionCrew":"Mũi 2","designQuantity":60,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"1000","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq5zzdx90004zkwkw1b5qx04"}]	\N	\N	2026-06-09 09:40:11.498
cmq6ho5ax000dn8wkp6ioy25i	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60smju0004awwk1zzm102h	\N	\N	\N	\N	2026-06-09 10:20:27.993
cmq6ho72h000en8wk0mh086km	cmq4ljlku0000cwwkewrboncw	cmq52crh500030swk5u8cc1vd	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq60rpry0000awwk3tj38xt2	\N	\N	\N	\N	2026-06-09 10:20:30.281
cmq6hstwu000on8wk9hgxcrvi	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	CREATE	Project	cmq6hstwf000fn8wkwhzoj472	\N	{"id":"cmq6hstwf000fn8wkwhzoj472","code":"ct_01","name":"Công Trình test","description":"","investor":"Chủ đầu tư test1","location":"Hà Nội","status":"ACTIVE","startDate":"2026-06-03T00:00:00.000Z","endDate":"2027-01-02T00:00:00.000Z","budget":null,"deletedAt":null,"createdAt":"2026-06-09T10:24:06.495Z","updatedAt":"2026-06-09T10:24:06.495Z"}	\N	\N	2026-06-09 10:24:06.51
cmq6hsxlv000qn8wksugo7s5d	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	CREATE_FIELD_PROGRESS_TEMPLATE	FieldProgressTemplate	cmq6hsxlo000pn8wk9wh099k5	\N	\N	\N	\N	2026-06-09 10:24:11.3
cmq6ht0x8000sn8wkjhiv5o9r	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq6ht0x4000rn8wkbx69t1am	\N	{"id":"cmq6ht0x4000rn8wkbx69t1am","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T10:24:15.592Z","updatedAt":"2026-06-09T10:24:15.592Z","deletedAt":null}	\N	\N	2026-06-09 10:24:15.596
cmq6ht3z0000un8wk0holb26j	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq6ht3yy000tn8wko3zl06pt	\N	{"id":"cmq6ht3yy000tn8wko3zl06pt","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":"cmq6ht0x4000rn8wkbx69t1am","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T10:24:19.546Z","updatedAt":"2026-06-09T10:24:19.546Z","deletedAt":null}	\N	\N	2026-06-09 10:24:19.548
cmq6hu3oe000vn8wko0cuvl6t	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq6ht0x4000rn8wkbx69t1am","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":null,"sortOrder":0,"level":0,"itemType":"GROUP","code":null,"categoryName":"Phần Cống","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T10:24:15.592Z","updatedAt":"2026-06-09T10:24:15.592Z","deletedAt":null,"children":[{"id":"cmq6ht3yy000tn8wko3zl06pt","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":"cmq6ht0x4000rn8wkbx69t1am","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T10:24:19.546Z","updatedAt":"2026-06-09T10:24:19.546Z","deletedAt":null,"children":[]}],"displayLevel":0,"rollupDesignQuantity":"0","rollupCumulative":"0","rollupPercent":null},{"id":"cmq6ht3yy000tn8wko3zl06pt","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":"cmq6ht0x4000rn8wkbx69t1am","sortOrder":0,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Móng cống","constructionCrew":"Mũi công việc đổ cống","designQuantity":"2234","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T10:24:19.546Z","updatedAt":"2026-06-09T10:24:19.546Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"0","rollupCumulative":"0","rollupPercent":null}]	\N	\N	2026-06-09 10:25:05.822
cmq6huo4p000xn8wkdk69mlpp	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-09	\N	[{"id":"cmq6ht3yy000tn8wko3zl06pt","code":null,"name":"Móng cống","parentName":"Phần Cống","constructionCrew":"Mũi công việc đổ cống","designQuantity":2234,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"333","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq6ht3yy000tn8wko3zl06pt"}]	\N	\N	2026-06-09 10:25:32.329
cmq6huwyy000zn8wkk2of4e5h	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-07	\N	[{"id":"cmq6ht3yy000tn8wko3zl06pt","code":null,"name":"Móng cống","parentName":"Phần Cống","constructionCrew":"Mũi công việc đổ cống","designQuantity":2234,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"444","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq6ht3yy000tn8wko3zl06pt"}]	\N	\N	2026-06-09 10:25:43.786
cmq6hv4pj0010n8wkfao8i0v5	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	UPDATE_FIELD_PROGRESS_ENTRY	FieldProgressEntry	2026-06-07	\N	[{"id":"cmq6ht3yy000tn8wko3zl06pt","code":null,"name":"Móng cống","parentName":"Phần Cống","constructionCrew":"Mũi công việc đổ cống","designQuantity":2234,"unit":"m","cumulativeBefore":0,"todayEntry":null,"materials":[],"quantity":"444","issueNote":"","proposalNote":"","note":"","status":"DRAFT","itemId":"cmq6ht3yy000tn8wko3zl06pt"}]	\N	\N	2026-06-09 10:25:53.815
cmq6hvs240012n8wky18xu20d	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq6hvs1q0011n8wkesr74qjw	\N	{"id":"cmq6hvs1q0011n8wkesr74qjw","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":"cmq6ht0x4000rn8wkbx69t1am","sortOrder":1,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc đào móng","constructionCrew":"Mũi 223","designQuantity":"4444","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-09T10:26:24.062Z","updatedAt":"2026-06-09T10:26:24.062Z","deletedAt":null}	\N	\N	2026-06-09 10:26:24.076
cmq7gyoie00046owke70gpk3n	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq7gyoi800036owkwlvrckq5	\N	{"id":"cmq7gyoi800036owkwlvrckq5","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":null,"sortOrder":1,"level":0,"itemType":"GROUP","code":null,"categoryName":"Hạng mục mới","workContent":null,"constructionCrew":null,"designQuantity":null,"unit":null,"status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-10T02:48:26.001Z","updatedAt":"2026-06-10T02:48:26.001Z","deletedAt":null}	\N	\N	2026-06-10 02:48:26.006
cmq7gyu0t00056owklkzu6dvn	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	SOFT_DELETE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq7gyoi800036owkwlvrckq5	\N	\N	\N	\N	2026-06-10 02:48:33.149
cmq7gyurl00076owk6lc2pd0u	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	CREATE_FIELD_PROGRESS_ITEM	FieldProgressItem	cmq7gyurj00066owk29np5qpd	\N	{"id":"cmq7gyurj00066owk29np5qpd","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":"cmq6ht0x4000rn8wkbx69t1am","sortOrder":2,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"Công việc mới","constructionCrew":null,"designQuantity":null,"unit":"Lần","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-10T02:48:34.111Z","updatedAt":"2026-06-10T02:48:34.111Z","deletedAt":null}	\N	\N	2026-06-10 02:48:34.113
cmq7gzo1900086owksslxknog	cmq4ljlku0000cwwkewrboncw	cmq6hstwf000fn8wkwhzoj472	BATCH_UPDATE_FIELD_PROGRESS_ITEMS	FieldProgressItem	BATCH	\N	[{"id":"cmq7gyurj00066owk29np5qpd","projectId":"cmq6hstwf000fn8wkwhzoj472","templateId":"cmq6hsxlo000pn8wk9wh099k5","parentId":"cmq6ht0x4000rn8wkbx69t1am","sortOrder":2,"level":1,"itemType":"WORK","code":null,"categoryName":null,"workContent":"đổ bên tông","constructionCrew":"Đổ móng lần 1","designQuantity":"2233","unit":"m","status":"PLANNED","isLocked":false,"note":null,"createdById":"cmq4ljlku0000cwwkewrboncw","createdAt":"2026-06-10T02:48:34.111Z","updatedAt":"2026-06-10T02:48:34.111Z","deletedAt":null,"children":[],"displayLevel":1,"rollupDesignQuantity":"0","rollupCumulative":"0","rollupPercent":null}]	\N	\N	2026-06-10 02:49:12.045
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatMessage" (id, "senderId", content, "createdAt") FROM stdin;
\.


--
-- Data for Name: Contract; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Contract" (id, "projectId", "supplierId", "contractNo", name, type, status, value, "signDate", "startDate", "endDate", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Document" (id, "folderId", "mimeType", size, version, "deletedAt", "createdAt", "updatedAt", extension, "originalName", "projectId", "storagePath", "storedName", "uploadedById") FROM stdin;
cmq4pa5op0000nkwkzjobvjt3	cmq4oiw5b000mh8wkrlwpdrih	application/msword	73728	1	2026-06-08 04:18:22.758	2026-06-08 04:17:59.881	2026-06-08 04:18:22.765	.doc	Bảo vệ.doc	cmq4oiw57000lh8wka1w5o232	D:\\construction-erp-v2\\storage\\projects\\123\\documents\\cmq4oiw5b000mh8wkrlwpdrih\\B_o_v__1780892279844_123fc78a.doc	B_o_v__1780892279844_123fc78a.doc	cmq4ljlku0000cwwkewrboncw
cmq4pgj5a0009nkwkqlhbot8z	cmq4o4w2d000ih8wkvwabcmi3	image/jpeg	11463	1	2026-06-08 04:23:21.874	2026-06-08 04:22:57.262	2026-06-08 04:23:21.875	.jpg	434117417_1154596019233333_7399462298877532542_n.jpg	cmq4o4w27000bh8wkq961gh22	D:\\construction-erp-v2\\storage\\projects\\CT0011\\documents\\cmq4o4w2d000ih8wkvwabcmi3\\434117417_1154596019233333_7399462298877532542_n_1780892577251_d9d8b072.jpg	434117417_1154596019233333_7399462298877532542_n_1780892577251_d9d8b072.jpg	cmq4ljlku0000cwwkewrboncw
cmq4pj2cc000enkwkwwdkl7bl	cmq4pgw7m000bnkwki2qx0mpz	application/msword	73728	1	2026-06-08 07:02:24.414	2026-06-08 04:24:55.452	2026-06-08 07:02:24.418	.doc	Bảo vệ.doc	cmq4o4w27000bh8wkq961gh22	D:\\construction-erp-v2\\storage\\projects\\CT0011\\documents\\cmq4pgw7m000bnkwki2qx0mpz\\B_o_v__1780892695449_e3afd5b2.doc	B_o_v__1780892695449_e3afd5b2.doc	cmq4ljlku0000cwwkewrboncw
cmq4pjrte000gnkwk4m6o77g6	cmq4o4w29000ch8wk5divaso2	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	21625	1	2026-06-08 07:02:34.08	2026-06-08 04:25:28.467	2026-06-08 07:02:34.081	.xlsx	CHẾ TÀI PHẠT VI PHẠM AN NINH, AN TOÀN LAO ĐỘNG.xlsx	cmq4o4w27000bh8wkq961gh22	D:\\construction-erp-v2\\storage\\projects\\CT0011\\documents\\cmq4o4w29000ch8wk5divaso2\\CH__T_I_PH_T_VI_PH_M_AN_NINH__AN_TO_N_LAO___NG_1780892728463_8e1598dd.xlsx	CH__T_I_PH_T_VI_PH_M_AN_NINH__AN_TO_N_LAO___NG_1780892728463_8e1598dd.xlsx	cmq4ljlku0000cwwkewrboncw
\.


--
-- Data for Name: DocumentFolder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentFolder" (id, "projectId", "parentId", name, "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmq4ntqxj0001h8wkbbcuff43	cmq4ntqx10000h8wkwqq0n50b	\N	01_Hợp đồng	2026-06-08 03:37:14.647	2026-06-08 03:37:14.647	\N
cmq4ntqxm0002h8wkrnp36bep	cmq4ntqx10000h8wkwqq0n50b	\N	02_Bản vẽ	2026-06-08 03:37:14.65	2026-06-08 03:37:14.65	\N
cmq4ntqxn0003h8wkbgl35vrg	cmq4ntqx10000h8wkwqq0n50b	\N	03_Dự toán	2026-06-08 03:37:14.651	2026-06-08 03:37:14.651	\N
cmq4ntqxo0004h8wknz1ercpm	cmq4ntqx10000h8wkwqq0n50b	\N	04_Nghiệm thu	2026-06-08 03:37:14.653	2026-06-08 03:37:14.653	\N
cmq4ntqxq0005h8wkcmc1j2nu	cmq4ntqx10000h8wkwqq0n50b	\N	05_Hóa đơn	2026-06-08 03:37:14.654	2026-06-08 03:37:14.654	\N
cmq4ntqxr0006h8wkuv6sokzl	cmq4ntqx10000h8wkwqq0n50b	\N	06_Thanh toán	2026-06-08 03:37:14.655	2026-06-08 03:37:14.655	\N
cmq4ntqxs0007h8wkkpuka6ci	cmq4ntqx10000h8wkwqq0n50b	\N	07_Hình ảnh hiện trường	2026-06-08 03:37:14.656	2026-06-08 03:37:14.656	\N
cmq4ntqxu0008h8wk5xhmq77v	cmq4ntqx10000h8wkwqq0n50b	\N	08_Báo cáo ngày	2026-06-08 03:37:14.658	2026-06-08 03:37:14.658	\N
cmq4o4w29000ch8wk5divaso2	cmq4o4w27000bh8wkq961gh22	\N	01_Hợp đồng	2026-06-08 03:45:54.513	2026-06-08 03:45:54.513	\N
cmq4o4w2a000dh8wkffiudjch	cmq4o4w27000bh8wkq961gh22	\N	02_Bản vẽ	2026-06-08 03:45:54.514	2026-06-08 03:45:54.514	\N
cmq4o4w2a000eh8wklqj55grj	cmq4o4w27000bh8wkq961gh22	\N	03_Dự toán	2026-06-08 03:45:54.514	2026-06-08 03:45:54.514	\N
cmq4o4w2b000fh8wkt5eqk664	cmq4o4w27000bh8wkq961gh22	\N	04_Nghiệm thu	2026-06-08 03:45:54.515	2026-06-08 03:45:54.515	\N
cmq4o4w2b000gh8wku23eg3kh	cmq4o4w27000bh8wkq961gh22	\N	05_Hóa đơn	2026-06-08 03:45:54.515	2026-06-08 03:45:54.515	\N
cmq4o4w2c000hh8wk47d2u2pu	cmq4o4w27000bh8wkq961gh22	\N	06_Thanh toán	2026-06-08 03:45:54.516	2026-06-08 03:45:54.516	\N
cmq4o4w2d000ih8wkvwabcmi3	cmq4o4w27000bh8wkq961gh22	\N	07_Hình ảnh hiện trường	2026-06-08 03:45:54.517	2026-06-08 03:45:54.517	\N
cmq4o4w2d000jh8wk2wgziizt	cmq4o4w27000bh8wkq961gh22	\N	08_Báo cáo ngày	2026-06-08 03:45:54.517	2026-06-08 03:45:54.517	\N
cmq4oiw5b000mh8wkrlwpdrih	cmq4oiw57000lh8wka1w5o232	\N	01_Hợp đồng	2026-06-08 03:56:47.807	2026-06-08 03:56:47.807	\N
cmq4oiw5c000nh8wkt8kysu71	cmq4oiw57000lh8wka1w5o232	\N	02_Bản vẽ	2026-06-08 03:56:47.808	2026-06-08 03:56:47.808	\N
cmq4oiw5d000oh8wkba1qfsje	cmq4oiw57000lh8wka1w5o232	\N	03_Dự toán	2026-06-08 03:56:47.809	2026-06-08 03:56:47.809	\N
cmq4oiw5e000ph8wku9gjtslp	cmq4oiw57000lh8wka1w5o232	\N	04_Nghiệm thu	2026-06-08 03:56:47.81	2026-06-08 03:56:47.81	\N
cmq4oiw5e000qh8wkoxfyp188	cmq4oiw57000lh8wka1w5o232	\N	05_Hóa đơn	2026-06-08 03:56:47.811	2026-06-08 03:56:47.811	\N
cmq4oiw5f000rh8wk98aaccde	cmq4oiw57000lh8wka1w5o232	\N	06_Thanh toán	2026-06-08 03:56:47.811	2026-06-08 03:56:47.811	\N
cmq4oiw5g000sh8wk6blkk1p5	cmq4oiw57000lh8wka1w5o232	\N	07_Hình ảnh hiện trường	2026-06-08 03:56:47.812	2026-06-08 03:56:47.812	\N
cmq4oiw5g000th8wkgpxcyvgd	cmq4oiw57000lh8wka1w5o232	\N	08_Báo cáo ngày	2026-06-08 03:56:47.812	2026-06-08 03:56:47.812	\N
cmq4ot5o1000wh8wkdqlnvygr	cmq4ot5nu000vh8wk7g4edmxw	\N	01_Hợp đồng	2026-06-08 04:04:46.705	2026-06-08 04:04:46.705	\N
cmq4ot5o8000xh8wk84ea7pbr	cmq4ot5nu000vh8wk7g4edmxw	\N	02_Bản vẽ	2026-06-08 04:04:46.712	2026-06-08 04:04:46.712	\N
cmq4ot5ob000yh8wkbv9goeni	cmq4ot5nu000vh8wk7g4edmxw	\N	03_Dự toán	2026-06-08 04:04:46.715	2026-06-08 04:04:46.715	\N
cmq4ot5od000zh8wkkteayt2v	cmq4ot5nu000vh8wk7g4edmxw	\N	04_Nghiệm thu	2026-06-08 04:04:46.717	2026-06-08 04:04:46.717	\N
cmq4ot5oe0010h8wkryxo37lm	cmq4ot5nu000vh8wk7g4edmxw	\N	05_Hóa đơn	2026-06-08 04:04:46.719	2026-06-08 04:04:46.719	\N
cmq4ot5of0011h8wklmaftrre	cmq4ot5nu000vh8wk7g4edmxw	\N	06_Thanh toán	2026-06-08 04:04:46.719	2026-06-08 04:04:46.719	\N
cmq4ot5og0012h8wk306jtm6b	cmq4ot5nu000vh8wk7g4edmxw	\N	07_Hình ảnh hiện trường	2026-06-08 04:04:46.72	2026-06-08 04:04:46.72	\N
cmq4ot5oh0013h8wkfqfdcstc	cmq4ot5nu000vh8wk7g4edmxw	\N	08_Báo cáo ngày	2026-06-08 04:04:46.721	2026-06-08 04:04:46.721	\N
cmq4pb8zx0003nkwktoomlma9	cmq4oiw57000lh8wka1w5o232	cmq4oiw5b000mh8wkrlwpdrih	ok	2026-06-08 04:18:50.829	2026-06-08 04:18:50.829	\N
cmq4pbt6g0005nkwkz8v1w6l0	cmq4oiw57000lh8wka1w5o232	cmq4oiw5b000mh8wkrlwpdrih	SubFolder Test	2026-06-08 04:19:16.984	2026-06-08 04:19:16.984	\N
cmq4pfpa10007nkwk6542lp5k	cmq4o4w27000bh8wkq961gh22	cmq4o4w29000ch8wk5divaso2	SubFolder Test	2026-06-08 04:22:18.553	2026-06-08 04:22:18.553	\N
cmq4pgw7m000bnkwki2qx0mpz	cmq4o4w27000bh8wkq961gh22	\N	SubFolder Test	2026-06-08 04:23:14.194	2026-06-08 07:02:28.669	2026-06-08 07:02:28.668
cmq52crhl00040swkcehtwror	cmq52crh500030swk5u8cc1vd	\N	01_Hợp đồng	2026-06-08 10:23:56.457	2026-06-08 10:23:56.457	\N
cmq52crhw00050swkmlirr3ui	cmq52crh500030swk5u8cc1vd	\N	02_Bản vẽ	2026-06-08 10:23:56.468	2026-06-08 10:23:56.468	\N
cmq52crhx00060swkh1pxcnfh	cmq52crh500030swk5u8cc1vd	\N	03_Dự toán	2026-06-08 10:23:56.469	2026-06-08 10:23:56.469	\N
cmq52crhy00070swk68x7e03d	cmq52crh500030swk5u8cc1vd	\N	04_Nghiệm thu	2026-06-08 10:23:56.47	2026-06-08 10:23:56.47	\N
cmq52crhz00080swk7pmvb85a	cmq52crh500030swk5u8cc1vd	\N	05_Hóa đơn	2026-06-08 10:23:56.471	2026-06-08 10:23:56.471	\N
cmq52crhz00090swkjkfvzfn1	cmq52crh500030swk5u8cc1vd	\N	06_Thanh toán	2026-06-08 10:23:56.471	2026-06-08 10:23:56.471	\N
cmq52cri0000a0swkvr6uhl6q	cmq52crh500030swk5u8cc1vd	\N	07_Hình ảnh hiện trường	2026-06-08 10:23:56.472	2026-06-08 10:23:56.472	\N
cmq52cri0000b0swk7ss19a7c	cmq52crh500030swk5u8cc1vd	\N	08_Báo cáo ngày	2026-06-08 10:23:56.472	2026-06-08 10:23:56.472	\N
cmq6hstwm000gn8wki5ea2fea	cmq6hstwf000fn8wkwhzoj472	\N	01_Hợp đồng	2026-06-09 10:24:06.502	2026-06-09 10:24:06.502	\N
cmq6hstwp000hn8wkqoyq2rtw	cmq6hstwf000fn8wkwhzoj472	\N	02_Bản vẽ	2026-06-09 10:24:06.505	2026-06-09 10:24:06.505	\N
cmq6hstwq000in8wkng9zq0e2	cmq6hstwf000fn8wkwhzoj472	\N	03_Dự toán	2026-06-09 10:24:06.506	2026-06-09 10:24:06.506	\N
cmq6hstwq000jn8wk8pordk2k	cmq6hstwf000fn8wkwhzoj472	\N	04_Nghiệm thu	2026-06-09 10:24:06.506	2026-06-09 10:24:06.506	\N
cmq6hstwr000kn8wkkswbdt8j	cmq6hstwf000fn8wkwhzoj472	\N	05_Hóa đơn	2026-06-09 10:24:06.507	2026-06-09 10:24:06.507	\N
cmq6hstwr000ln8wkesq37c5m	cmq6hstwf000fn8wkwhzoj472	\N	06_Thanh toán	2026-06-09 10:24:06.507	2026-06-09 10:24:06.507	\N
cmq6hstwr000mn8wke4srzjnp	cmq6hstwf000fn8wkwhzoj472	\N	07_Hình ảnh hiện trường	2026-06-09 10:24:06.507	2026-06-09 10:24:06.507	\N
cmq6hstws000nn8wk52u8x0pe	cmq6hstwf000fn8wkwhzoj472	\N	08_Báo cáo ngày	2026-06-09 10:24:06.508	2026-06-09 10:24:06.508	\N
\.


--
-- Data for Name: FieldMaterialRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FieldMaterialRequest" (id, "projectId", "templateId", "itemId", "entryId", "requestDate", "neededDate", "requestedById", status, priority, note, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: FieldMaterialRequestItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FieldMaterialRequestItem" (id, "requestId", "materialName", unit, "requestedQuantity", reason, note, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: FieldProgressEntry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FieldProgressEntry" (id, "projectId", "templateId", "itemId", "entryDate", quantity, "issueNote", "proposalNote", note, status, "createdById", "submittedAt", "approvedById", "approvedAt", "rejectedReason", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmq5yrrtj000om8wkkm2zrva4	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5yoxp9000jm8wk7mmhkuh6	2026-06-09 00:00:00	332.0000				SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:31:28.374	\N	\N	\N	2026-06-09 01:31:24.439	2026-06-09 01:31:28.379	\N
cmq5yrrts000pm8wkqnu99jfh	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5ypbnh000lm8wk1n0pnqh1	2026-06-09 00:00:00	111.0000				SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:31:28.374	\N	\N	\N	2026-06-09 01:31:24.448	2026-06-09 01:31:28.38	\N
cmq60cbpa001lm8wk1np95ehd	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq6044ek001gm8wke87j37vy	2026-06-09 00:00:00	441.0000				SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:15:32.953	\N	\N	\N	2026-06-09 02:15:22.943	2026-06-09 02:15:32.957	\N
cmq60gno1001ym8wk9o0vawtt	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx30002zkwklrgpdxzc	2026-05-13 00:00:00	0.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 02:18:45.073	2026-06-09 02:18:45.073	\N
cmq60gno2001zm8wkvisz9j50	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx70003zkwkrbwjtbsv	2026-05-13 00:00:00	0.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 02:18:45.074	2026-06-09 02:18:45.074	\N
cmq60gno30020m8wkzepqlqap	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx90004zkwkw1b5qx04	2026-05-13 00:00:00	0.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 02:18:45.075	2026-06-09 02:18:45.075	\N
cmq609ikd001im8wkm7sh064x	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-05-10 00:00:00	100.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 02:13:11.869	2026-06-09 02:22:31.643	2026-06-09 02:22:31.637
cmq60fp8v001sm8wk595qgg3p	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-05-13 00:00:00	50.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 02:18:00.463	2026-06-09 02:22:31.643	2026-06-09 02:22:31.637
cmq60i3e70024m8wknjxqcaw8	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-05-15 00:00:00	68.4000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 02:19:52.111	2026-06-09 02:22:31.643	2026-06-09 02:22:31.637
cmq60lihz000018wk5g24qkst	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-05-10 00:00:00	100.0000	\N	\N	\N	APPROVED	cmq4ljlku0000cwwkewrboncw	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:22:31.651	\N	2026-06-09 02:22:31.656	2026-06-09 02:22:31.656	\N
cmq60lii6000118wklczc898y	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-05-13 00:00:00	50.0000	\N	\N	\N	APPROVED	cmq4ljlku0000cwwkewrboncw	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:22:31.66	\N	2026-06-09 02:22:31.662	2026-06-09 02:22:31.662	\N
cmq60liia000218wkgns69rk8	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-05-15 00:00:00	68.4000	\N	\N	\N	APPROVED	cmq4ljlku0000cwwkewrboncw	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:22:31.663	\N	2026-06-09 02:22:31.666	2026-06-09 02:22:31.666	\N
cmq60vtz30008awwkqnmp5n90	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60s4n30002awwk2i3vxps0	2026-06-09 00:00:00	50.0000				SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:30:37.003	\N	\N	\N	2026-06-09 02:30:33.087	2026-06-09 02:30:37.011	\N
cmq6dn65c0005pgwksh5eivt1	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx30002zkwklrgpdxzc	2026-06-03 00:00:00	222.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 08:27:43.969	2026-06-10 04:38:43.321	\N
cmq6dn65f0006pgwk10nkk5fe	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx70003zkwkrbwjtbsv	2026-06-03 00:00:00	22.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 08:27:43.971	2026-06-10 04:38:43.327	\N
cmq644xq90007rswksc0c7vf4	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx30002zkwklrgpdxzc	2026-06-09 00:00:00	22.0000				SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-09 09:40:04.151	\N	\N	\N	2026-06-09 04:01:36.705	2026-06-09 09:40:04.154	\N
cmq6dn65g0007pgwkdl9c7y53	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx90004zkwkw1b5qx04	2026-06-03 00:00:00	22.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 08:27:43.972	2026-06-10 04:38:43.329	\N
cmq60gnhz001wm8wk3yh3r6a2	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60gck0001um8wkk4693rz3	2026-06-09 00:00:00	2222.0000				SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-09 09:40:04.151	\N	\N	\N	2026-06-09 02:18:44.855	2026-06-09 09:40:04.154	\N
cmq6g8cq0000bn8wkxwihmzu6	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx90004zkwkw1b5qx04	2026-06-10 00:00:00	1000.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 09:40:11.496	2026-06-10 04:38:43.333	\N
cmq60hg9r0022m8wkb05rye3m	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60gck0001um8wkk4693rz3	2026-06-04 00:00:00	222.0000				SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-10 02:32:37.337	\N	\N	\N	2026-06-09 02:19:22.143	2026-06-10 02:32:37.357	\N
cmq7gj1ig00016owks4occ1oa	cmq6hstwf000fn8wkwhzoj472	cmq6hsxlo000pn8wk9wh099k5	cmq6hvs1q0011n8wkesr74qjw	2026-06-06 00:00:00	2222.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-10 02:36:16.36	2026-06-10 02:36:16.36	\N
cmq6dmfm50002pgwkqzfln756	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-06-03 00:00:00	2.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 08:27:09.581	2026-06-10 04:38:43.313	\N
cmq63tb4u0002rswk0bop4s3r	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-06-09 00:00:00	0.1000	ffdd			SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-09 09:40:04.151	\N	\N	\N	2026-06-09 03:52:34.206	2026-06-09 09:40:04.152	\N
cmq60vtzq0009awwkmcvl2jnp	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60smju0004awwk1zzm102h	2026-06-09 00:00:00	40.0000				SUBMITTED	cmq4ljlku0000cwwkewrboncw	2026-06-09 09:40:04.151	\N	\N	\N	2026-06-09 02:30:33.11	2026-06-09 09:40:04.153	\N
cmq6g418f0000n8wk2d7gvsqw	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx70003zkwkrbwjtbsv	2026-06-09 00:00:00	22.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 09:36:49.983	2026-06-10 04:38:43.323	\N
cmq6g45hm0004n8wkfpn7mwme	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx00001zkwkccfbnid7	2026-06-10 00:00:00	5.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 09:36:55.498	2026-06-10 04:38:43.324	\N
cmq6huwyv000yn8wkccul8ozd	cmq6hstwf000fn8wkwhzoj472	cmq6hsxlo000pn8wk9wh099k5	cmq6ht3yy000tn8wko3zl06pt	2026-06-07 00:00:00	444.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 10:25:43.783	2026-06-10 04:38:43.331	\N
cmq6huo4h000wn8wkd1tkv45o	cmq6hstwf000fn8wkwhzoj472	cmq6hsxlo000pn8wk9wh099k5	cmq6ht3yy000tn8wko3zl06pt	2026-06-09 00:00:00	333.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 10:25:32.322	2026-06-10 04:38:43.335	\N
cmq6dn6530004pgwkl078b7mh	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60smju0004awwk1zzm102h	2026-06-02 17:00:00	222.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 08:27:43.959	2026-06-10 04:38:43.341	2026-06-10 04:38:43.338
cmq60wbd8000cawwksph2zy2b	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60s4n30002awwk2i3vxps0	2026-06-10 00:00:00	33.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 02:30:55.629	2026-06-10 04:38:43.343	2026-06-10 04:38:43.343
cmq60wbdr000dawwkplzvwngb	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60smju0004awwk1zzm102h	2026-06-10 00:00:00	10.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 02:30:55.647	2026-06-10 04:38:43.346	2026-06-10 04:38:43.345
cmq6g418p0001n8wksy5kectv	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdx90004zkwkw1b5qx04	2026-06-09 00:00:00	40.0000				DRAFT	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	2026-06-09 09:36:49.993	2026-06-10 04:48:02.713	\N
\.


--
-- Data for Name: FieldProgressItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FieldProgressItem" (id, "projectId", "templateId", "parentId", "sortOrder", level, "itemType", code, "categoryName", "workContent", "constructionCrew", "designQuantity", unit, status, "isLocked", note, "createdById", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmq52fak90002b4wkidxzu9qg	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-08 10:25:54.489	2026-06-08 10:26:12.854	2026-06-08 10:26:12.849
cmq5zgv520015m8wkzm97aoae	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:50:55.142	2026-06-09 01:51:35.804	2026-06-09 01:51:35.802
cmq5y9t2y0000m8wkx0oq8jbh	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:17:26.267	2026-06-09 01:18:21.292	2026-06-09 01:18:21.291
cmq5yanvc0002m8wkw96awura	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5y9t2y0000m8wkx0oq8jbh	0	1	WORK	\N	\N	Công việc mới	\N	\N	Lần	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:18:06.168	2026-06-09 01:18:21.295	2026-06-09 01:18:21.294
cmq5yb2jy0006m8wkq8ehr2ni	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:18:25.198	2026-06-09 01:20:32.788	2026-06-09 01:20:32.787
cmq5ych9g0008m8wk1gnyk9ie	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5yb2jy0006m8wkq8ehr2ni	0	1	WORK	\N	\N	Công việc mới	\N	\N	Lần	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:19:30.916	2026-06-09 01:20:32.792	2026-06-09 01:20:32.791
cmq5zjg0y0019m8wkf3a5zn1k	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:52:55.522	2026-06-09 01:53:00.45	2026-06-09 01:53:00.45
cmq5zuvyu001cm8wkqmz4uyab	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:01:49.398	2026-06-09 02:05:19.27	2026-06-09 02:05:19.264
cmq5yol1x000hm8wk0cpvhkb1	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	1	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:28:55.701	2026-06-09 01:31:56.502	2026-06-09 01:31:56.501
cmq5zzdww0000zkwksx5du1he	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:05:19.28	2026-06-09 02:05:19.28	\N
cmq5ykn3k000cm8wk9l46w7dq	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:25:51.728	2026-06-09 01:32:04.965	2026-06-09 01:32:04.963
cmq5yl9zc000em8wkjn1wgeq9	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5ykn3k000cm8wk9l46w7dq	0	1	WORK	\N	\N	Công việc mới	\N	\N	Lần	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:26:21.384	2026-06-09 01:32:04.969	2026-06-09 01:32:04.967
cmq5yoxp9000jm8wk7mmhkuh6	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5ykn3k000cm8wk9l46w7dq	0	1	WORK	\N	\N	ok	ok1	333.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:29:12.094	2026-06-09 01:32:04.969	2026-06-09 01:32:04.967
cmq5ypbnh000lm8wk1n0pnqh1	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5ykn3k000cm8wk9l46w7dq	1	1	WORK	\N	\N	ok	ok2	144.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:29:30.173	2026-06-09 01:32:04.969	2026-06-09 01:32:04.967
cmq5ysoz5000wm8wkb3o7vz99	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:32:07.409	2026-06-09 01:32:13.183	2026-06-09 01:32:13.182
cmq5zcq7d000zm8wkfv2aagzz	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:47:42.121	2026-06-09 01:47:55.522	2026-06-09 01:47:55.522
cmq5ze4e00012m8wkwqcd6674	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	0	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 01:48:47.16	2026-06-09 01:48:51.728	2026-06-09 01:48:51.727
cmq5zzdx30002zkwklrgpdxzc	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdww0000zkwksx5du1he	2	1	WORK	\N	\N	Cống hộp 2,5x2m	Mũi 1	120.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:05:19.287	2026-06-09 02:05:19.287	\N
cmq5zzdx70003zkwkrbwjtbsv	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdww0000zkwksx5du1he	3	1	WORK	\N	\N	Cống hộp 1,5x1,5m	Mũi 2	80.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:05:19.291	2026-06-09 02:05:19.291	\N
cmq5zzdx90004zkwkw1b5qx04	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdww0000zkwksx5du1he	4	1	WORK	\N	\N	Cống tròn D1000	Mũi 2	60.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:05:19.293	2026-06-09 02:05:19.293	\N
cmq6ht3yy000tn8wko3zl06pt	cmq6hstwf000fn8wkwhzoj472	cmq6hsxlo000pn8wk9wh099k5	cmq6ht0x4000rn8wkbx69t1am	0	1	WORK	\N	\N	Móng cống	Mũi công việc đổ cống	2234.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 10:24:19.546	2026-06-09 10:25:05.819	\N
cmq60448j001em8wk72emazh1	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	1	0	GROUP	\N	ok1	edfff	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:09:00.019	2026-06-09 02:17:10.124	2026-06-09 02:17:10.124
cmq6044ek001gm8wke87j37vy	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60448j001em8wk72emazh1	0	1	WORK	\N	\N	cv1	\N	444.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:09:00.236	2026-06-09 02:17:10.127	2026-06-09 02:17:10.126
cmq60ejaq001pm8wkxvqnodty	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60448j001em8wk72emazh1	1	1	WORK	\N	\N	Công việc mới	\N	\N	Lần	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:17:06.098	2026-06-09 02:17:10.127	2026-06-09 02:17:10.126
cmq60gck0001um8wkk4693rz3	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdww0000zkwksx5du1he	5	1	WORK	\N	\N	công việc 1	dfg	3333.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:18:30.672	2026-06-09 02:18:30.672	\N
cmq60s4n30002awwk2i3vxps0	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60rpry0000awwk3tj38xt2	0	1	WORK	\N	kkk	lần 1	mũi 1	222.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:27:40.287	2026-06-09 10:20:30.279	2026-06-09 10:20:30.279
cmq5zzdx00001zkwkccfbnid7	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq5zzdww0000zkwksx5du1he	1	1	WORK	\N	\N	Cống hộp 2,5x2,5m Nguyễn Trãi	Mũi 1	222.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:05:19.284	2026-06-09 03:58:51.364	\N
cmq60smju0004awwk1zzm102h	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	cmq60rpry0000awwk3tj38xt2	1	1	WORK	\N	\N	lần 2	mũi 2	333.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:28:03.498	2026-06-09 10:20:30.279	2026-06-09 10:20:30.279
cmq6hvs1q0011n8wkesr74qjw	cmq6hstwf000fn8wkwhzoj472	cmq6hsxlo000pn8wk9wh099k5	cmq6ht0x4000rn8wkbx69t1am	1	1	WORK	\N	\N	Công việc đào móng	Mũi 223	4444.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 10:26:24.062	2026-06-09 10:26:24.062	\N
cmq60rpry0000awwk3tj38xt2	cmq52crh500030swk5u8cc1vd	cmq52eolh0000b4wkd79yrh6m	\N	1	0	GROUP	\N	xây tường	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 02:27:21.022	2026-06-09 10:20:30.278	2026-06-09 10:20:30.277
cmq6ht0x4000rn8wkbx69t1am	cmq6hstwf000fn8wkwhzoj472	cmq6hsxlo000pn8wk9wh099k5	\N	0	0	GROUP	\N	Phần Cống	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-09 10:24:15.592	2026-06-09 10:25:05.816	\N
cmq7gyoi800036owkwlvrckq5	cmq6hstwf000fn8wkwhzoj472	cmq6hsxlo000pn8wk9wh099k5	\N	1	0	GROUP	\N	Hạng mục mới	\N	\N	\N	\N	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-10 02:48:26.001	2026-06-10 02:48:33.132	2026-06-10 02:48:33.131
cmq7gyurj00066owk29np5qpd	cmq6hstwf000fn8wkwhzoj472	cmq6hsxlo000pn8wk9wh099k5	cmq6ht0x4000rn8wkbx69t1am	2	1	WORK	\N	\N	đổ bên tông	Đổ móng lần 1	2233.0000	m	PLANNED	f	\N	cmq4ljlku0000cwwkewrboncw	2026-06-10 02:48:34.111	2026-06-10 02:49:12.041	\N
\.


--
-- Data for Name: FieldProgressTemplate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FieldProgressTemplate" (id, "projectId", name, description, status, "createdById", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmq52eolh0000b4wkd79yrh6m	cmq52crh500030swk5u8cc1vd	Bảng khối lượng hiện trường	\N	ACTIVE	cmq4ljlku0000cwwkewrboncw	2026-06-08 10:25:26.021	2026-06-08 10:25:26.021	\N
cmq6hsxlo000pn8wk9wh099k5	cmq6hstwf000fn8wkwhzoj472	Bảng khối lượng hiện trường	\N	ACTIVE	cmq4ljlku0000cwwkewrboncw	2026-06-09 10:24:11.292	2026-06-09 10:24:11.292	\N
\.


--
-- Data for Name: MaterialItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MaterialItem" (id, code, name, unit, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MaterialMovement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MaterialMovement" (id, "projectId", "materialItemId", type, quantity, "unitPrice", "movementDate", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MaterialRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MaterialRequest" (id, "projectId", "siteReportId", "requestedById", "requestDate", "neededDate", status, priority, note, "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmq4zooeh0004dgwkifsggbn5	cmq4oiw57000lh8wka1w5o232	cmq4z6gp00000dgwkavkeljct	cmq4ljlku0000cwwkewrboncw	2026-06-08 09:09:13.474	\N	SUBMITTED	MEDIUM	\N	2026-06-08 09:09:13.478	2026-06-08 09:09:13.478	\N
cmq50b03x0003ukwkgytt53z2	cmq508hob0000ucwkbc8nz9d4	cmq50b03u0000ukwkdqi85vxd	cmq4ljlku0000cwwkewrboncw	2026-06-08 09:26:35.067	\N	SUBMITTED	HIGH	\N	2026-06-08 09:26:35.082	2026-06-08 09:26:35.082	\N
\.


--
-- Data for Name: MaterialRequestItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MaterialRequestItem" (id, "materialRequestId", "wbsItemId", "materialName", unit, "requestedQuantity", reason, note, "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmq4zooel0005dgwkv0ql7009	cmq4zooeh0004dgwkifsggbn5	\N			0.0000			2026-06-08 09:09:13.478	2026-06-08 09:09:13.478	\N
cmq50b0400004ukwkfswfwd66	cmq50b03x0003ukwkgytt53z2	cmq508hoy0002ucwkkb0j9m97	Xi măng PCB40	Bao	200.0000	Chuẩn bị lót	\N	2026-06-08 09:26:35.082	2026-06-08 09:26:35.082	\N
\.


--
-- Data for Name: PaymentPlan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaymentPlan" (id, "projectId", "contractId", name, amount, "plannedDate", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PaymentRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaymentRecord" (id, "projectId", "paymentPlanId", amount, "paymentDate", "referenceNo", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Project" (id, code, name, description, status, "startDate", "endDate", budget, "deletedAt", "createdAt", "updatedAt", location, investor) FROM stdin;
cmq4ntqx10000h8wkwqq0n50b	CT001	CT test		ACTIVE	2026-06-03 00:00:00	2027-02-27 00:00:00	\N	2026-06-08 03:39:34.21	2026-06-08 03:37:14.63	2026-06-08 03:39:34.214	Hà Nội	Chủ đầu tư test
cmq4ot5nu000vh8wk7g4edmxw	QA-TEST-001	Test Project		PLANNING	\N	\N	\N	2026-06-08 11:05:32.232	2026-06-08 04:04:46.699	2026-06-08 04:04:46.699		
cmq508hob0000ucwkbc8nz9d4	CT-QA-PROGRESS	Công trình test tiến độ động	\N	ACTIVE	\N	\N	\N	2026-06-08 10:13:29.847	2026-06-08 09:24:37.883	2026-06-08 10:13:29.855	Hà Nội	Chủ đầu tư QA
cmq4oiw57000lh8wka1w5o232	123	test12		ACTIVE	2026-06-01 00:00:00	2026-11-20 00:00:00	\N	2026-06-08 10:13:33.563	2026-06-08 03:56:47.803	2026-06-08 10:13:33.564	Hà Nội	Chủ đầu tư test12
cmq4o4w27000bh8wkq961gh22	CT0011	test1		ACTIVE	2026-06-06 00:00:00	2026-10-16 00:00:00	\N	2026-06-08 10:13:36.712	2026-06-08 03:45:54.511	2026-06-08 10:13:36.712	Hà Nội1	Chủ đầu tư test1
cmq52crh500030swk5u8cc1vd	CT-001	Du an Nguyen Trai		PLANNING	\N	\N	\N	\N	2026-06-08 10:23:56.441	2026-06-08 10:23:56.441		
cmq6hstwf000fn8wkwhzoj472	ct_01	Công Trình test		ACTIVE	2026-06-03 00:00:00	2027-01-02 00:00:00	\N	\N	2026-06-09 10:24:06.495	2026-06-09 10:24:06.495	Hà Nội	Chủ đầu tư test1
\.


--
-- Data for Name: ProjectMember; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProjectMember" (id, "projectId", "userId", role, "joinedAt", "leftAt") FROM stdin;
\.


--
-- Data for Name: SiteReport; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SiteReport" (id, "projectId", "reportDate", weather, status, "createdAt", "updatedAt", "approvedAt", "approvedById", "createdById", "deletedAt", "equipmentNote", "generalNote", "manpowerCount", "rejectedReason", "submittedAt", title) FROM stdin;
cmq4z6gp00000dgwkavkeljct	cmq4oiw57000lh8wka1w5o232	2026-06-08 00:00:00		APPROVED	2026-06-08 08:55:03.684	2026-06-08 09:09:18.111	2026-06-08 09:09:18.109	cmq4ljlku0000cwwkewrboncw	cmq4ljlku0000cwwkewrboncw	\N			\N	\N	2026-06-08 09:09:13.474	Xi măng
cmq50b03u0000ukwkdqi85vxd	cmq508hob0000ucwkbc8nz9d4	2026-06-08 00:00:00	\N	APPROVED	2026-06-08 09:26:35.082	2026-06-08 09:26:35.082	\N	cmq4ljlku0000cwwkewrboncw	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	\N	\N	Báo cáo ngày 1
cmq50b0460005ukwkouejqezl	cmq508hob0000ucwkbc8nz9d4	2026-06-09 00:00:00	\N	APPROVED	2026-06-08 09:26:35.094	2026-06-08 09:26:35.094	\N	cmq4ljlku0000cwwkewrboncw	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	\N	\N	Báo cáo ngày 2
cmq50b04a0008ukwkhh0090oe	cmq508hob0000ucwkbc8nz9d4	2026-06-10 00:00:00	\N	DRAFT	2026-06-08 09:26:35.098	2026-06-08 09:26:35.098	\N	\N	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	\N	\N	Báo cáo ngày 3
cmq50b04e000aukwk9s1rgsbx	cmq508hob0000ucwkbc8nz9d4	2026-06-11 00:00:00	\N	APPROVED	2026-06-08 09:26:35.102	2026-06-08 09:26:35.102	\N	cmq4ljlku0000cwwkewrboncw	cmq4ljlku0000cwwkewrboncw	\N	\N	\N	\N	\N	\N	Báo cáo ngày 4 (Vượt KL)
\.


--
-- Data for Name: SiteReportLine; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SiteReportLine" (id, "siteReportId", "projectId", "wbsItemId", "workContent", "constructionCrew", unit, "designQuantity", "quantityToday", "quantityBefore", "quantityCumulative", "progressPercent", note, "createdAt", "updatedAt", "deletedAt", "issueNote", "proposalNote") FROM stdin;
cmq50b03w0001ukwkhhutm179	cmq50b03u0000ukwkdqi85vxd	cmq508hob0000ucwkbc8nz9d4	cmq508hop0001ucwkyfjmijud	Đào móng trục A-B	Mũi 1	m3	100.0000	20.0000	0.0000	20.0000	20.00	Hoàn thành một phần	2026-06-08 09:26:35.082	2026-06-08 09:26:35.082	\N	Đất ẩm, thi công chậm	Bổ sung bạt che
cmq50b03w0002ukwkigu2rexf	cmq50b03u0000ukwkdqi85vxd	cmq508hob0000ucwkbc8nz9d4	cmq508hoy0002ucwkkb0j9m97	Chuẩn bị bê tông	Mũi 2	m3	200.0000	30.0000	0.0000	30.0000	15.00	Chuẩn bị thi công	2026-06-08 09:26:35.082	2026-06-08 09:26:35.082	\N	Chờ vật tư	Cấp thêm xi măng
cmq50b0470006ukwkafzaiku8	cmq50b0460005ukwkouejqezl	cmq508hob0000ucwkbc8nz9d4	cmq508hop0001ucwkyfjmijud	Đào móng trục C-D	Mũi 1	m3	100.0000	30.0000	20.0000	50.0000	50.00	Tiến độ ổn	2026-06-08 09:26:35.094	2026-06-08 09:26:35.094	\N	\N	\N
cmq50b0470007ukwk88fgucju	cmq50b0460005ukwkouejqezl	cmq508hob0000ucwkbc8nz9d4	cmq508hoy0002ucwkkb0j9m97	Đổ bê tông	Mũi 2	m3	200.0000	40.0000	30.0000	70.0000	35.00	\N	2026-06-08 09:26:35.094	2026-06-08 09:26:35.094	\N	Xe muộn	Điều phối sớm
cmq50b04a0009ukwk6h75m78d	cmq50b04a0008ukwkhh0090oe	cmq508hob0000ucwkbc8nz9d4	cmq508hop0001ucwkyfjmijud	Đào tiếp	Mũi 1	m3	100.0000	10.0000	50.0000	60.0000	60.00	\N	2026-06-08 09:26:35.098	2026-06-08 09:26:35.098	\N	\N	\N
cmq50b04f000bukwkpewsy0o7	cmq50b04e000aukwk9s1rgsbx	cmq508hob0000ucwkbc8nz9d4	cmq508hop0001ucwkyfjmijud	Đào nốt	Mũi 1	m3	100.0000	70.0000	50.0000	120.0000	120.00	Đã hoàn thành vượt mức	2026-06-08 09:26:35.102	2026-06-08 09:26:35.102	\N	\N	\N
\.


--
-- Data for Name: SiteReportPhoto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SiteReportPhoto" (id, "reportId", "storageKey", description, "createdAt") FROM stdin;
\.


--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Supplier" (id, code, name, "taxCode", address, phone, email, "contactPerson", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, password, name, role, phone, avatar, "isActive", "deletedAt", "createdAt", "updatedAt") FROM stdin;
cmq4ljlku0000cwwkewrboncw	admin@construction.local	$2b$10$Wl94PimfQqCdEq41c7V5F.NXeFplK8ewXjtiJOrWWz0pBEwxtE6gu	Admin (Dev)	ADMIN	\N	\N	t	\N	2026-06-08 02:33:21.918	2026-06-08 02:40:56.988
\.


--
-- Data for Name: WBSItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."WBSItem" (id, "projectId", "parentId", code, name, description, progress, budget, "createdAt", "updatedAt", "createdById", "deletedAt", "designQuantity", note, "plannedEndDate", "plannedStartDate", status, unit) FROM stdin;
cmq508hop0001ucwkyfjmijud	cmq508hob0000ucwkbc8nz9d4	\N	WBS-QA-001	Đào đất móng QA	\N	0.00	\N	2026-06-08 09:24:37.897	2026-06-08 09:24:37.897	cmq4ljlku0000cwwkewrboncw	\N	100.0000	\N	\N	\N	IN_PROGRESS	m3
cmq508hoy0002ucwkkb0j9m97	cmq508hob0000ucwkbc8nz9d4	\N	WBS-QA-002	Bê tông lót móng QA	\N	0.00	\N	2026-06-08 09:24:37.906	2026-06-08 09:24:37.906	cmq4ljlku0000cwwkewrboncw	\N	200.0000	\N	\N	\N	IN_PROGRESS	m3
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c93e2f01-7a28-4072-96b0-6337352db682	0ddaed567bb07de680979dd584d4a5880ba6b2d07780cf4ce6d38caf29ac240d	2026-06-08 09:29:28.730293+07	20260608022928_init_core_schema	\N	\N	2026-06-08 09:29:28.517836+07	1
00f5a613-7256-47f2-a2a4-b4188f777f5e	ebf17c6980c401ad51567e02c41afa3c24e25733ae57c18f5559774d9b75b441	2026-06-08 09:55:14.198865+07	20260608025514_add_project_owner_location	\N	\N	2026-06-08 09:55:14.1767+07	1
313e48df-732f-4dc8-806f-06e07e225817	6c6eb07d3b212d908c68a82fadc7346d1b42ce81eb8c743bec1acdfb40cf1487	2026-06-08 10:32:26.216662+07	20260608033226_rename_project_owner_to_investor	\N	\N	2026-06-08 10:32:26.212901+07	1
5d91d313-46ef-4af4-875e-423c93458584	380072e0f3acf6934c489806e2c725ada9df5bffaad244731b24268b568f5467	2026-06-08 11:12:10.527671+07	20260608041210_update_document_schema	\N	\N	2026-06-08 11:12:10.474221+07	1
c9763c59-9130-404b-b091-d344dda897e6	950808b53ccf99c78a077b657c9042c2a511ea02296200b462ed09092b4c39b2	2026-06-08 15:29:19.454519+07	20260608082919_add_site_progress_reports	\N	\N	2026-06-08 15:29:19.340657+07	1
eaf141a0-17e9-4812-aa36-cf2c70f07d7f	7e876d8fb8d8e25c02e094e65985df7f4f426775634b34ba4688c7843df4b334	2026-06-08 16:11:27.144854+07	20260608091127_add_site_report_line_issue_proposal_notes	\N	\N	2026-06-08 16:11:27.133158+07	1
30c016f1-5793-4d12-a970-a55c445348ae	13ad5d3946f7865c4511e622da24f25f9b2a226ec22d8c87c8a9910a2561b6c5	2026-06-08 17:15:14.570224+07	20260608101514_add_field_progress_excel_module	\N	\N	2026-06-08 17:15:14.434554+07	1
\.


--
-- Name: ApprovalRequest ApprovalRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: Contract Contract_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_pkey" PRIMARY KEY (id);


--
-- Name: DocumentFolder DocumentFolder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentFolder"
    ADD CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: FieldMaterialRequestItem FieldMaterialRequestItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldMaterialRequestItem"
    ADD CONSTRAINT "FieldMaterialRequestItem_pkey" PRIMARY KEY (id);


--
-- Name: FieldMaterialRequest FieldMaterialRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldMaterialRequest"
    ADD CONSTRAINT "FieldMaterialRequest_pkey" PRIMARY KEY (id);


--
-- Name: FieldProgressEntry FieldProgressEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressEntry"
    ADD CONSTRAINT "FieldProgressEntry_pkey" PRIMARY KEY (id);


--
-- Name: FieldProgressItem FieldProgressItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressItem"
    ADD CONSTRAINT "FieldProgressItem_pkey" PRIMARY KEY (id);


--
-- Name: FieldProgressTemplate FieldProgressTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressTemplate"
    ADD CONSTRAINT "FieldProgressTemplate_pkey" PRIMARY KEY (id);


--
-- Name: MaterialItem MaterialItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialItem"
    ADD CONSTRAINT "MaterialItem_pkey" PRIMARY KEY (id);


--
-- Name: MaterialMovement MaterialMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialMovement"
    ADD CONSTRAINT "MaterialMovement_pkey" PRIMARY KEY (id);


--
-- Name: MaterialRequestItem MaterialRequestItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialRequestItem"
    ADD CONSTRAINT "MaterialRequestItem_pkey" PRIMARY KEY (id);


--
-- Name: MaterialRequest MaterialRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialRequest"
    ADD CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY (id);


--
-- Name: PaymentPlan PaymentPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentPlan"
    ADD CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY (id);


--
-- Name: PaymentRecord PaymentRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentRecord"
    ADD CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY (id);


--
-- Name: ProjectMember ProjectMember_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectMember"
    ADD CONSTRAINT "ProjectMember_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: SiteReportLine SiteReportLine_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReportLine"
    ADD CONSTRAINT "SiteReportLine_pkey" PRIMARY KEY (id);


--
-- Name: SiteReportPhoto SiteReportPhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReportPhoto"
    ADD CONSTRAINT "SiteReportPhoto_pkey" PRIMARY KEY (id);


--
-- Name: SiteReport SiteReport_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReport"
    ADD CONSTRAINT "SiteReport_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WBSItem WBSItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WBSItem"
    ADD CONSTRAINT "WBSItem_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ApprovalRequest_approverId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ApprovalRequest_approverId_idx" ON public."ApprovalRequest" USING btree ("approverId");


--
-- Name: ApprovalRequest_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON public."ApprovalRequest" USING btree ("entityType", "entityId");


--
-- Name: ApprovalRequest_requesterId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ApprovalRequest_requesterId_idx" ON public."ApprovalRequest" USING btree ("requesterId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_entityType_entityId_idx" ON public."AuditLog" USING btree ("entityType", "entityId");


--
-- Name: AuditLog_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_projectId_idx" ON public."AuditLog" USING btree ("projectId");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: ChatMessage_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessage_createdAt_idx" ON public."ChatMessage" USING btree ("createdAt");


--
-- Name: ChatMessage_senderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessage_senderId_idx" ON public."ChatMessage" USING btree ("senderId");


--
-- Name: Contract_contractNo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Contract_contractNo_idx" ON public."Contract" USING btree ("contractNo");


--
-- Name: Contract_contractNo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Contract_contractNo_key" ON public."Contract" USING btree ("contractNo");


--
-- Name: Contract_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Contract_projectId_idx" ON public."Contract" USING btree ("projectId");


--
-- Name: Contract_supplierId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Contract_supplierId_idx" ON public."Contract" USING btree ("supplierId");


--
-- Name: DocumentFolder_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DocumentFolder_parentId_idx" ON public."DocumentFolder" USING btree ("parentId");


--
-- Name: DocumentFolder_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DocumentFolder_projectId_idx" ON public."DocumentFolder" USING btree ("projectId");


--
-- Name: Document_folderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Document_folderId_idx" ON public."Document" USING btree ("folderId");


--
-- Name: Document_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Document_projectId_idx" ON public."Document" USING btree ("projectId");


--
-- Name: Document_uploadedById_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Document_uploadedById_idx" ON public."Document" USING btree ("uploadedById");


--
-- Name: FieldMaterialRequestItem_requestId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldMaterialRequestItem_requestId_idx" ON public."FieldMaterialRequestItem" USING btree ("requestId");


--
-- Name: FieldMaterialRequest_entryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldMaterialRequest_entryId_idx" ON public."FieldMaterialRequest" USING btree ("entryId");


--
-- Name: FieldMaterialRequest_itemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldMaterialRequest_itemId_idx" ON public."FieldMaterialRequest" USING btree ("itemId");


--
-- Name: FieldMaterialRequest_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldMaterialRequest_projectId_idx" ON public."FieldMaterialRequest" USING btree ("projectId");


--
-- Name: FieldMaterialRequest_templateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldMaterialRequest_templateId_idx" ON public."FieldMaterialRequest" USING btree ("templateId");


--
-- Name: FieldProgressEntry_entryDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressEntry_entryDate_idx" ON public."FieldProgressEntry" USING btree ("entryDate");


--
-- Name: FieldProgressEntry_itemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressEntry_itemId_idx" ON public."FieldProgressEntry" USING btree ("itemId");


--
-- Name: FieldProgressEntry_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressEntry_projectId_idx" ON public."FieldProgressEntry" USING btree ("projectId");


--
-- Name: FieldProgressEntry_templateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressEntry_templateId_idx" ON public."FieldProgressEntry" USING btree ("templateId");


--
-- Name: FieldProgressItem_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressItem_parentId_idx" ON public."FieldProgressItem" USING btree ("parentId");


--
-- Name: FieldProgressItem_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressItem_projectId_idx" ON public."FieldProgressItem" USING btree ("projectId");


--
-- Name: FieldProgressItem_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressItem_sortOrder_idx" ON public."FieldProgressItem" USING btree ("sortOrder");


--
-- Name: FieldProgressItem_templateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressItem_templateId_idx" ON public."FieldProgressItem" USING btree ("templateId");


--
-- Name: FieldProgressTemplate_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FieldProgressTemplate_projectId_idx" ON public."FieldProgressTemplate" USING btree ("projectId");


--
-- Name: MaterialItem_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialItem_code_idx" ON public."MaterialItem" USING btree (code);


--
-- Name: MaterialItem_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "MaterialItem_code_key" ON public."MaterialItem" USING btree (code);


--
-- Name: MaterialMovement_materialItemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialMovement_materialItemId_idx" ON public."MaterialMovement" USING btree ("materialItemId");


--
-- Name: MaterialMovement_movementDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialMovement_movementDate_idx" ON public."MaterialMovement" USING btree ("movementDate");


--
-- Name: MaterialMovement_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialMovement_projectId_idx" ON public."MaterialMovement" USING btree ("projectId");


--
-- Name: MaterialRequestItem_materialRequestId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialRequestItem_materialRequestId_idx" ON public."MaterialRequestItem" USING btree ("materialRequestId");


--
-- Name: MaterialRequestItem_wbsItemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialRequestItem_wbsItemId_idx" ON public."MaterialRequestItem" USING btree ("wbsItemId");


--
-- Name: MaterialRequest_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialRequest_projectId_idx" ON public."MaterialRequest" USING btree ("projectId");


--
-- Name: MaterialRequest_requestedById_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialRequest_requestedById_idx" ON public."MaterialRequest" USING btree ("requestedById");


--
-- Name: MaterialRequest_siteReportId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MaterialRequest_siteReportId_idx" ON public."MaterialRequest" USING btree ("siteReportId");


--
-- Name: PaymentPlan_contractId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentPlan_contractId_idx" ON public."PaymentPlan" USING btree ("contractId");


--
-- Name: PaymentPlan_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentPlan_projectId_idx" ON public."PaymentPlan" USING btree ("projectId");


--
-- Name: PaymentRecord_paymentPlanId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentRecord_paymentPlanId_idx" ON public."PaymentRecord" USING btree ("paymentPlanId");


--
-- Name: PaymentRecord_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentRecord_projectId_idx" ON public."PaymentRecord" USING btree ("projectId");


--
-- Name: ProjectMember_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProjectMember_projectId_idx" ON public."ProjectMember" USING btree ("projectId");


--
-- Name: ProjectMember_projectId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON public."ProjectMember" USING btree ("projectId", "userId");


--
-- Name: ProjectMember_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProjectMember_userId_idx" ON public."ProjectMember" USING btree ("userId");


--
-- Name: Project_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_code_idx" ON public."Project" USING btree (code);


--
-- Name: Project_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Project_code_key" ON public."Project" USING btree (code);


--
-- Name: Project_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_createdAt_idx" ON public."Project" USING btree ("createdAt");


--
-- Name: Project_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_status_idx" ON public."Project" USING btree (status);


--
-- Name: SiteReportLine_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SiteReportLine_projectId_idx" ON public."SiteReportLine" USING btree ("projectId");


--
-- Name: SiteReportLine_siteReportId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SiteReportLine_siteReportId_idx" ON public."SiteReportLine" USING btree ("siteReportId");


--
-- Name: SiteReportLine_wbsItemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SiteReportLine_wbsItemId_idx" ON public."SiteReportLine" USING btree ("wbsItemId");


--
-- Name: SiteReportPhoto_reportId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SiteReportPhoto_reportId_idx" ON public."SiteReportPhoto" USING btree ("reportId");


--
-- Name: SiteReport_createdById_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SiteReport_createdById_idx" ON public."SiteReport" USING btree ("createdById");


--
-- Name: SiteReport_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SiteReport_projectId_idx" ON public."SiteReport" USING btree ("projectId");


--
-- Name: SiteReport_reportDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SiteReport_reportDate_idx" ON public."SiteReport" USING btree ("reportDate");


--
-- Name: Supplier_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Supplier_code_idx" ON public."Supplier" USING btree (code);


--
-- Name: Supplier_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Supplier_code_key" ON public."Supplier" USING btree (code);


--
-- Name: User_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_createdAt_idx" ON public."User" USING btree ("createdAt");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: WBSItem_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "WBSItem_parentId_idx" ON public."WBSItem" USING btree ("parentId");


--
-- Name: WBSItem_projectId_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "WBSItem_projectId_code_key" ON public."WBSItem" USING btree ("projectId", code);


--
-- Name: WBSItem_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "WBSItem_projectId_idx" ON public."WBSItem" USING btree ("projectId");


--
-- Name: ApprovalRequest ApprovalRequest_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ApprovalRequest ApprovalRequest_requesterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatMessage ChatMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Contract Contract_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Contract Contract_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DocumentFolder DocumentFolder_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentFolder"
    ADD CONSTRAINT "DocumentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."DocumentFolder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DocumentFolder DocumentFolder_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentFolder"
    ADD CONSTRAINT "DocumentFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Document Document_folderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public."DocumentFolder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Document Document_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Document Document_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FieldMaterialRequestItem FieldMaterialRequestItem_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldMaterialRequestItem"
    ADD CONSTRAINT "FieldMaterialRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."FieldMaterialRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldMaterialRequest FieldMaterialRequest_entryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldMaterialRequest"
    ADD CONSTRAINT "FieldMaterialRequest_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES public."FieldProgressEntry"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldMaterialRequest FieldMaterialRequest_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldMaterialRequest"
    ADD CONSTRAINT "FieldMaterialRequest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."FieldProgressItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldMaterialRequest FieldMaterialRequest_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldMaterialRequest"
    ADD CONSTRAINT "FieldMaterialRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldMaterialRequest FieldMaterialRequest_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldMaterialRequest"
    ADD CONSTRAINT "FieldMaterialRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FieldMaterialRequest FieldMaterialRequest_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldMaterialRequest"
    ADD CONSTRAINT "FieldMaterialRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."FieldProgressTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldProgressEntry FieldProgressEntry_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressEntry"
    ADD CONSTRAINT "FieldProgressEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldProgressEntry FieldProgressEntry_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressEntry"
    ADD CONSTRAINT "FieldProgressEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FieldProgressEntry FieldProgressEntry_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressEntry"
    ADD CONSTRAINT "FieldProgressEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."FieldProgressItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldProgressEntry FieldProgressEntry_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressEntry"
    ADD CONSTRAINT "FieldProgressEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldProgressEntry FieldProgressEntry_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressEntry"
    ADD CONSTRAINT "FieldProgressEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."FieldProgressTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldProgressItem FieldProgressItem_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressItem"
    ADD CONSTRAINT "FieldProgressItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FieldProgressItem FieldProgressItem_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressItem"
    ADD CONSTRAINT "FieldProgressItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."FieldProgressItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldProgressItem FieldProgressItem_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressItem"
    ADD CONSTRAINT "FieldProgressItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldProgressItem FieldProgressItem_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressItem"
    ADD CONSTRAINT "FieldProgressItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."FieldProgressTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldProgressTemplate FieldProgressTemplate_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressTemplate"
    ADD CONSTRAINT "FieldProgressTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FieldProgressTemplate FieldProgressTemplate_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FieldProgressTemplate"
    ADD CONSTRAINT "FieldProgressTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MaterialMovement MaterialMovement_materialItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialMovement"
    ADD CONSTRAINT "MaterialMovement_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES public."MaterialItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MaterialMovement MaterialMovement_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialMovement"
    ADD CONSTRAINT "MaterialMovement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MaterialRequestItem MaterialRequestItem_materialRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialRequestItem"
    ADD CONSTRAINT "MaterialRequestItem_materialRequestId_fkey" FOREIGN KEY ("materialRequestId") REFERENCES public."MaterialRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MaterialRequestItem MaterialRequestItem_wbsItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialRequestItem"
    ADD CONSTRAINT "MaterialRequestItem_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES public."WBSItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MaterialRequest MaterialRequest_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialRequest"
    ADD CONSTRAINT "MaterialRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MaterialRequest MaterialRequest_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialRequest"
    ADD CONSTRAINT "MaterialRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MaterialRequest MaterialRequest_siteReportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaterialRequest"
    ADD CONSTRAINT "MaterialRequest_siteReportId_fkey" FOREIGN KEY ("siteReportId") REFERENCES public."SiteReport"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentPlan PaymentPlan_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentPlan"
    ADD CONSTRAINT "PaymentPlan_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."Contract"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentPlan PaymentPlan_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentPlan"
    ADD CONSTRAINT "PaymentPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentRecord PaymentRecord_paymentPlanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentRecord"
    ADD CONSTRAINT "PaymentRecord_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES public."PaymentPlan"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentRecord PaymentRecord_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentRecord"
    ADD CONSTRAINT "PaymentRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectMember ProjectMember_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectMember"
    ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectMember ProjectMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectMember"
    ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SiteReportLine SiteReportLine_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReportLine"
    ADD CONSTRAINT "SiteReportLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SiteReportLine SiteReportLine_siteReportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReportLine"
    ADD CONSTRAINT "SiteReportLine_siteReportId_fkey" FOREIGN KEY ("siteReportId") REFERENCES public."SiteReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SiteReportLine SiteReportLine_wbsItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReportLine"
    ADD CONSTRAINT "SiteReportLine_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES public."WBSItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SiteReportPhoto SiteReportPhoto_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReportPhoto"
    ADD CONSTRAINT "SiteReportPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public."SiteReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SiteReport SiteReport_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReport"
    ADD CONSTRAINT "SiteReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SiteReport SiteReport_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReport"
    ADD CONSTRAINT "SiteReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SiteReport SiteReport_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteReport"
    ADD CONSTRAINT "SiteReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WBSItem WBSItem_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WBSItem"
    ADD CONSTRAINT "WBSItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WBSItem WBSItem_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WBSItem"
    ADD CONSTRAINT "WBSItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."WBSItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WBSItem WBSItem_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WBSItem"
    ADD CONSTRAINT "WBSItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict i0oBdMLxkc8DQDBiRlhOGXOom0rcuoJTZzVftre53cISMidOP7UG1n6BmlXqNVA

