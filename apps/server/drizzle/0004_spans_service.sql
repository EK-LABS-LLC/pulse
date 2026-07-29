ALTER TABLE `spans` ADD `service` text;--> statement-breakpoint
CREATE INDEX `spans_project_service_idx` ON `spans` (`project_id`,`service`);