-- EA FC changes its year every season. The game is simply "EAFC"; every competition points at this row by id, so all of them follow.
UPDATE game_titles SET name = 'EAFC', slug = 'eafc', short_code = 'EAFC' WHERE slug = 'fc-26';
UPDATE news_tags SET name = 'EAFC', slug = 'eafc' WHERE slug = 'fc-26';
