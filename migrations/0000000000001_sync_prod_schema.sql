create sequence "public"."payments_id_seq";

create sequence "public"."stripe_webhook_events_id_seq";

alter table "public"."orders" drop constraint "orders_payment_status_check";

alter table "public"."orders" drop constraint "orders_shipment_status_check";

create table "public"."payments" (
    "id" bigint not null default nextval('payments_id_seq'::regclass),
    "order_id" bigint,
    "stripe_payment_intent_id" text not null,
    "stripe_checkout_session_id" text,
    "stripe_customer_id" text,
    "stripe_charge_id" text,
    "status" text not null,
    "amount" integer not null,
    "currency" text not null,
    "customer_email" text,
    "failure_code" text,
    "failure_message" text,
    "paid_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."stripe_checkout_sessions" (
    "stripe_session_id" text not null,
    "user_id" bigint,
    "order_id" bigint,
    "payload" jsonb not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone
);


create table "public"."stripe_webhook_events" (
    "id" bigint not null default nextval('stripe_webhook_events_id_seq'::regclass),
    "stripe_event_id" text not null,
    "event_type" text not null,
    "stripe_payment_intent_id" text,
    "stripe_checkout_session_id" text,
    "order_id" bigint,
    "raw_payload" jsonb not null,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


alter sequence "public"."payments_id_seq" owned by "public"."payments"."id";

alter sequence "public"."stripe_webhook_events_id_seq" owned by "public"."stripe_webhook_events"."id";

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);

CREATE INDEX idx_payments_payment_intent ON public.payments USING btree (stripe_payment_intent_id);

CREATE INDEX idx_webhook_event_type ON public.stripe_webhook_events USING btree (event_type);

CREATE INDEX idx_webhook_payment_intent ON public.stripe_webhook_events USING btree (stripe_payment_intent_id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX payments_stripe_payment_intent_id_key ON public.payments USING btree (stripe_payment_intent_id);

CREATE UNIQUE INDEX stripe_checkout_sessions_pkey ON public.stripe_checkout_sessions USING btree (stripe_session_id);

CREATE UNIQUE INDEX stripe_webhook_events_pkey ON public.stripe_webhook_events USING btree (id);

CREATE UNIQUE INDEX stripe_webhook_events_stripe_event_id_key ON public.stripe_webhook_events USING btree (stripe_event_id);

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."stripe_checkout_sessions" add constraint "stripe_checkout_sessions_pkey" PRIMARY KEY using index "stripe_checkout_sessions_pkey";

alter table "public"."stripe_webhook_events" add constraint "stripe_webhook_events_pkey" PRIMARY KEY using index "stripe_webhook_events_pkey";

alter table "public"."payments" add constraint "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_order_id_fkey";

alter table "public"."payments" add constraint "payments_stripe_checkout_session_id_fkey" FOREIGN KEY (stripe_checkout_session_id) REFERENCES stripe_checkout_sessions(stripe_session_id) not valid;

alter table "public"."payments" validate constraint "payments_stripe_checkout_session_id_fkey";

alter table "public"."payments" add constraint "payments_stripe_payment_intent_id_key" UNIQUE using index "payments_stripe_payment_intent_id_key";

alter table "public"."stripe_checkout_sessions" add constraint "stripe_checkout_sessions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL not valid;

alter table "public"."stripe_checkout_sessions" validate constraint "stripe_checkout_sessions_order_id_fkey";

alter table "public"."stripe_checkout_sessions" add constraint "stripe_checkout_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."stripe_checkout_sessions" validate constraint "stripe_checkout_sessions_user_id_fkey";

alter table "public"."stripe_webhook_events" add constraint "stripe_webhook_events_stripe_event_id_key" UNIQUE using index "stripe_webhook_events_stripe_event_id_key";

alter table "public"."orders" add constraint "orders_payment_status_check" CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))) not valid;

alter table "public"."orders" validate constraint "orders_payment_status_check";

alter table "public"."orders" add constraint "orders_shipment_status_check" CHECK (((shipment_status)::text = ANY ((ARRAY['unshipped'::character varying, 'shipped'::character varying, 'received by customer'::character varying, 'returned on the way'::character varying, 'return received'::character varying])::text[]))) not valid;

alter table "public"."orders" validate constraint "orders_shipment_status_check";


