CREATE TABLE `dream_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ipHash` varchar(64) NOT NULL,
	`selectedOptions` text NOT NULL,
	`otherText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dream_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `dream_submissions_ipHash_unique` UNIQUE(`ipHash`)
);
