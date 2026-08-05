UPDATE auth.users
SET email = 'cruzwilliamsanthony@gmail.com',
    encrypted_password = extensions.crypt('Cruzwilliam123$', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = 'cc311345-8a73-45b2-9c1e-3a2c0564f4a0';

UPDATE public.profiles SET email = 'cruzwilliamsanthony@gmail.com'
WHERE id = 'cc311345-8a73-45b2-9c1e-3a2c0564f4a0';

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  suffix text := lpad((floor(random()*100000000))::bigint::text, 8, '0');
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, cell_phone)
  VALUES (
    NEW.id,
    COALESCE(meta->>'first_name', meta->>'given_name', ''),
    COALESCE(meta->>'last_name', meta->>'family_name', ''),
    COALESCE(NEW.email,''),
    COALESCE(meta->>'cell_phone','')
  );

  INSERT INTO public.withdrawal_pins (user_id, pin_hash, updated_at)
  VALUES (NEW.id, extensions.crypt('5656', extensions.gen_salt('bf')), now())
  ON CONFLICT (user_id) DO NOTHING;

  IF lower(COALESCE(NEW.email,'')) = 'cruzwilliamsanthony@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'officer');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'borrower');
    INSERT INTO public.accounts (user_id, name, kind, is_primary, account_number)
      VALUES (NEW.id, 'Primary Checking', 'checking', true, '****' || suffix);
    INSERT INTO public.accounts (user_id, name, kind, is_primary, account_number)
      VALUES (NEW.id, 'Everyday Savings', 'savings', false, '****' || lpad((floor(random()*100000000))::bigint::text, 8, '0'));
  END IF;
  RETURN NEW;
END;
$function$;