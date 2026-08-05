CREATE OR REPLACE FUNCTION public.decide_loan(_application_id uuid, _approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app public.loan_applications%ROWTYPE;
  checking public.accounts%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'officer') THEN
    RAISE EXCEPTION 'Only loan officers can decide applications';
  END IF;

  SELECT * INTO app FROM public.loan_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF app.status = 'approved' THEN RAISE EXCEPTION 'Application already approved and disbursed'; END IF;

  IF _approve THEN
    IF app.amount <= 0 THEN RAISE EXCEPTION 'Loan amount must be greater than zero'; END IF;

    SELECT * INTO checking FROM public.accounts
      WHERE user_id = app.user_id AND kind = 'checking' ORDER BY is_primary DESC LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.accounts (user_id, name, kind, is_primary, account_number)
      VALUES (
        app.user_id, 'Primary Checking', 'checking', true,
        '****' || lpad((floor(random()*100000000))::bigint::text, 8, '0')
      )
      RETURNING * INTO checking;
    END IF;

    UPDATE public.accounts SET balance = balance + app.amount WHERE id = checking.id;
    INSERT INTO public.transactions (user_id, account_id, category, description, amount, direction, status)
      VALUES (app.user_id, checking.id, 'disbursement', 'Loan disbursement - personal loan', app.amount, 'credit', 'completed');
    UPDATE public.loan_applications
      SET status = 'approved', decided_at = now(), disbursed_at = now() WHERE id = app.id;
  ELSE
    UPDATE public.loan_applications
      SET status = 'declined', decided_at = now() WHERE id = app.id;
  END IF;
END;
$function$;