revoke all on table public.clothes_user_roles from authenticated;
revoke all on table public.clothes_profiles from authenticated;
revoke all on table public.clothes_wardrobe_items from authenticated;
revoke all on table public.clothes_liked_outfits from authenticated;
revoke all on table public.clothes_recommendation_records from authenticated;
revoke all on table public.clothes_user_settings from authenticated;

grant select on table public.clothes_user_roles to authenticated;
grant select, insert, update on table public.clothes_profiles to authenticated;
grant select, insert, update, delete on table public.clothes_wardrobe_items to authenticated;
grant select, insert, update, delete on table public.clothes_liked_outfits to authenticated;
grant select, insert, update, delete on table public.clothes_recommendation_records to authenticated;
grant select, insert, update, delete on table public.clothes_user_settings to authenticated;
