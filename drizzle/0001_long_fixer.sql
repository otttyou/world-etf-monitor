CREATE TABLE `etf_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(10) NOT NULL,
	`name` text,
	`price` varchar(20),
	`d1` varchar(20),
	`d5` varchar(20),
	`ytd` varchar(20),
	`aum` varchar(20),
	`pe` varchar(20),
	`yld` varchar(20),
	`signal` varchar(20),
	`rsi` int,
	`vol` varchar(20),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `etf_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `etf_prices_ticker_unique` UNIQUE(`ticker`)
);
--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pair` varchar(20) NOT NULL,
	`rate` varchar(20),
	`d1` varchar(20),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fx_rates_id` PRIMARY KEY(`id`),
	CONSTRAINT `fx_rates_pair_unique` UNIQUE(`pair`)
);
--> statement-breakpoint
CREATE TABLE `regional_indices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`d1` varchar(20),
	`region` varchar(20),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regional_indices_id` PRIMARY KEY(`id`),
	CONSTRAINT `regional_indices_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sector_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sector` varchar(20) NOT NULL,
	`value` varchar(20),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sector_data_id` PRIMARY KEY(`id`),
	CONSTRAINT `sector_data_sector_unique` UNIQUE(`sector`)
);
