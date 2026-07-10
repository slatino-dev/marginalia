CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text,
	`ts` integer NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE INDEX `admin_audit_ts_idx` ON `admin_audit` (`ts`);--> statement-breakpoint
CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`query_id` text NOT NULL,
	`text` text NOT NULL,
	`model` text NOT NULL,
	`config_hash` text NOT NULL,
	`citations_json` text NOT NULL,
	`ttft_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`query_id`) REFERENCES `queries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `answers_query_id_idx` ON `answers` (`query_id`);--> statement-breakpoint
CREATE TABLE `chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`seq` integer NOT NULL,
	`section_path` text NOT NULL,
	`page_start` integer NOT NULL,
	`page_end` integer NOT NULL,
	`text` text NOT NULL,
	`structural_header` text,
	`token_count` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chunks_document_id_idx` ON `chunks` (`document_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`sha256` text NOT NULL,
	`pages` integer NOT NULL,
	`license_note` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `eval_results` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`question_id` text NOT NULL,
	`scores_json` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `eval_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `golden_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `eval_results_run_id_idx` ON `eval_results` (`run_id`);--> statement-breakpoint
CREATE TABLE `eval_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`ran_at` integer NOT NULL,
	`suite` text NOT NULL,
	`config_hash` text NOT NULL,
	`metrics_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `eval_runs_ran_at_idx` ON `eval_runs` (`ran_at`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`query_id` text NOT NULL,
	`marker` text NOT NULL,
	`verdict` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`query_id`) REFERENCES `queries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `feedback_query_id_idx` ON `feedback` (`query_id`);--> statement-breakpoint
CREATE TABLE `golden_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`expected_chunk_ids` text,
	`expected_answer_notes` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `queries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_hash` text NOT NULL,
	`question` text NOT NULL,
	`mode` text NOT NULL,
	`plan_json` text,
	`latency_ms` integer,
	`neurons_est` integer,
	`outcome` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `queries_created_at_idx` ON `queries` (`created_at`);--> statement-breakpoint
CREATE TABLE `rerank_results` (
	`id` text PRIMARY KEY NOT NULL,
	`query_id` text NOT NULL,
	`chunk_id` text NOT NULL,
	`score` real NOT NULL,
	`kept` integer NOT NULL,
	FOREIGN KEY (`query_id`) REFERENCES `queries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rerank_results_query_id_idx` ON `rerank_results` (`query_id`);--> statement-breakpoint
CREATE TABLE `retrieval_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`query_id` text NOT NULL,
	`step_n` integer NOT NULL,
	`sub_query` text NOT NULL,
	`lane` text NOT NULL,
	`rank` integer NOT NULL,
	`chunk_id` text NOT NULL,
	`score` real NOT NULL,
	FOREIGN KEY (`query_id`) REFERENCES `queries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `retrieval_steps_query_id_idx` ON `retrieval_steps` (`query_id`);--> statement-breakpoint
CREATE TABLE `schema_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
