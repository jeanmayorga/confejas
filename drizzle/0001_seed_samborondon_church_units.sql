INSERT INTO "stakes" ("id", "name", "slug")
VALUES (1, 'Samborondón', 'samborondon');
--> statement-breakpoint
INSERT INTO "wards" ("id", "stake_id", "name", "slug")
VALUES
	(1, 1, 'La Aurora', 'la-aurora'),
	(2, 1, 'La Joya', 'la-joya'),
	(3, 1, 'Metrópolis', 'metropolis'),
	(4, 1, 'Panorama', 'panorama'),
	(5, 1, 'Pascuales', 'pascuales'),
	(6, 1, 'Samborondón', 'samborondon'),
	(7, 1, 'Villa del Rey', 'villa-del-rey');
