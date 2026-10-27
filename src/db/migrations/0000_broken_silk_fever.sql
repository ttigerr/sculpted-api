CREATE TABLE "compass_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"virtue1" text,
	"virtue2" text,
	"virtue3" text,
	"virtue1_score" integer,
	"virtue2_score" integer,
	"virtue3_score" integer,
	"virtue1_note" text,
	"virtue2_note" text,
	"virtue3_note" text,
	"overall_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compass_entries_user_date_key" UNIQUE("user_id","entry_date"),
	CONSTRAINT "compass_entries_virtue1_score_range" CHECK ("compass_entries"."virtue1_score" IS NULL OR ("compass_entries"."virtue1_score" BETWEEN 0 AND 10)),
	CONSTRAINT "compass_entries_virtue2_score_range" CHECK ("compass_entries"."virtue2_score" IS NULL OR ("compass_entries"."virtue2_score" BETWEEN 0 AND 10)),
	CONSTRAINT "compass_entries_virtue3_score_range" CHECK ("compass_entries"."virtue3_score" IS NULL OR ("compass_entries"."virtue3_score" BETWEEN 0 AND 10)),
	CONSTRAINT "compass_entries_overall_score_range" CHECK ("compass_entries"."overall_score" IS NULL OR ("compass_entries"."overall_score" BETWEEN 0 AND 10))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"b2c_sub" text NOT NULL,
	"email" text,
	"name" text,
	"gender" text,
	"birthday" date,
	"timezone" text DEFAULT 'Asia/Vientiane' NOT NULL,
	"reminder_time" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_b2c_sub_unique" UNIQUE("b2c_sub")
);
--> statement-breakpoint
CREATE TABLE "user_virtues" (
	"user_id" uuid NOT NULL,
	"virtue" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "user_virtues_user_id_position_pk" PRIMARY KEY("user_id","position")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compass_entries" ADD CONSTRAINT "compass_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_virtues" ADD CONSTRAINT "user_virtues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;