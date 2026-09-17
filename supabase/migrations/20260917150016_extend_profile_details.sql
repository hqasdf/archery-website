begin;

alter table public.profiles
  add column club_or_team text,
  add column division text,
  add column shooting_hand text,
  add column experience_level text,
  add column bio text,
  add constraint profiles_club_or_team_valid check (
    club_or_team is null or (
      char_length(club_or_team) between 1 and 120
      and club_or_team = btrim(club_or_team)
    )
  ),
  add constraint profiles_division_valid check (
    division is null or division in ('Recurve', 'Compound', 'Barebow', 'Other')
  ),
  add constraint profiles_shooting_hand_valid check (
    shooting_hand is null or shooting_hand in ('Left', 'Right')
  ),
  add constraint profiles_experience_level_valid check (
    experience_level is null or experience_level in ('Beginner', 'Intermediate', 'Advanced')
  ),
  add constraint profiles_bio_valid check (
    bio is null or (
      char_length(bio) between 1 and 500
      -- ECMAScript String.trim whitespace; internal whitespace is preserved.
      and bio = btrim(bio, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    )
  );

grant update (club_or_team, division, shooting_hand, experience_level, bio)
on public.profiles to authenticated;

commit;
