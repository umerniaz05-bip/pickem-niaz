-- Seed all 32 NFL teams. id == the abbreviation used across the app.
-- Logo URLs are ESPN's public 500px team logos (see CLAUDE.md section 35).
-- Idempotent: re-running updates names/logos without creating duplicates.

insert into public.teams (id, name, city, abbreviation, logo_url, conference, division) values
  ('ARI', 'Cardinals',   'Arizona',        'ARI', 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', 'NFC', 'West'),
  ('ATL', 'Falcons',     'Atlanta',        'ATL', 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', 'NFC', 'South'),
  ('BAL', 'Ravens',      'Baltimore',      'BAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', 'AFC', 'North'),
  ('BUF', 'Bills',       'Buffalo',        'BUF', 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', 'AFC', 'East'),
  ('CAR', 'Panthers',    'Carolina',       'CAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', 'NFC', 'South'),
  ('CHI', 'Bears',       'Chicago',        'CHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', 'NFC', 'North'),
  ('CIN', 'Bengals',     'Cincinnati',     'CIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', 'AFC', 'North'),
  ('CLE', 'Browns',      'Cleveland',      'CLE', 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', 'AFC', 'North'),
  ('DAL', 'Cowboys',     'Dallas',         'DAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', 'NFC', 'East'),
  ('DEN', 'Broncos',     'Denver',         'DEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', 'AFC', 'West'),
  ('DET', 'Lions',       'Detroit',        'DET', 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', 'NFC', 'North'),
  ('GB',  'Packers',     'Green Bay',      'GB',  'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',  'NFC', 'North'),
  ('HOU', 'Texans',      'Houston',        'HOU', 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', 'AFC', 'South'),
  ('IND', 'Colts',       'Indianapolis',   'IND', 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', 'AFC', 'South'),
  ('JAX', 'Jaguars',     'Jacksonville',   'JAX', 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', 'AFC', 'South'),
  ('KC',  'Chiefs',      'Kansas City',    'KC',  'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',  'AFC', 'West'),
  ('LAC', 'Chargers',    'Los Angeles',    'LAC', 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', 'AFC', 'West'),
  ('LAR', 'Rams',        'Los Angeles',    'LAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', 'NFC', 'West'),
  ('LV',  'Raiders',     'Las Vegas',      'LV',  'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',  'AFC', 'West'),
  ('MIA', 'Dolphins',    'Miami',          'MIA', 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', 'AFC', 'East'),
  ('MIN', 'Vikings',     'Minnesota',      'MIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', 'NFC', 'North'),
  ('NE',  'Patriots',    'New England',    'NE',  'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',  'AFC', 'East'),
  ('NO',  'Saints',      'New Orleans',    'NO',  'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',  'NFC', 'South'),
  ('NYG', 'Giants',      'New York',       'NYG', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', 'NFC', 'East'),
  ('NYJ', 'Jets',        'New York',       'NYJ', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', 'AFC', 'East'),
  ('PHI', 'Eagles',      'Philadelphia',   'PHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', 'NFC', 'East'),
  ('PIT', 'Steelers',    'Pittsburgh',     'PIT', 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', 'AFC', 'North'),
  ('SEA', 'Seahawks',    'Seattle',        'SEA', 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', 'NFC', 'West'),
  ('SF',  '49ers',       'San Francisco',  'SF',  'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',  'NFC', 'West'),
  ('TB',  'Buccaneers',  'Tampa Bay',      'TB',  'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',  'NFC', 'South'),
  ('TEN', 'Titans',      'Tennessee',      'TEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', 'AFC', 'South'),
  ('WAS', 'Commanders',  'Washington',     'WAS', 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', 'NFC', 'East')
on conflict (id) do update set
  name         = excluded.name,
  city         = excluded.city,
  abbreviation = excluded.abbreviation,
  logo_url     = excluded.logo_url,
  conference   = excluded.conference,
  division     = excluded.division;
