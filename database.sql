CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    reference_id TEXT NOT NULL CHECK (length(trim(reference_id)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_account_reference
        UNIQUE (account_id, reference_id)
);

CREATE OR REPLACE FUNCTION public.create_ledger_transaction(
    p_account_id UUID,
    p_type TEXT,
    p_amount NUMERIC,
    p_description TEXT,
    p_reference_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_account public.accounts%ROWTYPE;
    v_transaction public.transactions%ROWTYPE;
BEGIN
    IF p_type IS NULL OR p_type NOT IN ('credit', 'debit') THEN
        RAISE EXCEPTION 'INVALID_TYPE';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0
       OR p_amount::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
        RAISE EXCEPTION 'INVALID_AMOUNT';
    END IF;

    IF p_amount > 9999999999999.99 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT';
    END IF;

    IF p_reference_id IS NULL OR length(trim(p_reference_id)) = 0 THEN
        RAISE EXCEPTION 'INVALID_REFERENCE';
    END IF;

    IF p_description IS NULL OR length(trim(p_description)) = 0 THEN
        RAISE EXCEPTION 'INVALID_DESCRIPTION';
    END IF;

    
    SELECT *
    INTO v_account
    FROM public.accounts
    WHERE id = p_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ACCOUNT_NOT_FOUND';
    END IF;

    
    IF EXISTS (
        SELECT 1
        FROM public.transactions
        WHERE account_id = p_account_id
          AND reference_id = trim(p_reference_id)
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_TRANSACTION';
    END IF;

    IF p_type = 'debit' AND v_account.balance < p_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
    END IF;

    IF p_type = 'credit' THEN
        UPDATE public.accounts
        SET balance = balance + p_amount
        WHERE id = p_account_id;
    ELSE
        UPDATE public.accounts
        SET balance = balance - p_amount
        WHERE id = p_account_id;
    END IF;

    INSERT INTO public.transactions (
        account_id,
        type,
        amount,
        description,
        reference_id
    )
    VALUES (
        p_account_id,
        p_type,
        p_amount,
        trim(p_description),
        trim(p_reference_id)
    )
    RETURNING * INTO v_transaction;

    RETURN jsonb_build_object(
        'transaction', to_jsonb(v_transaction),
        'balance', (
            SELECT balance
            FROM public.accounts
            WHERE id = p_account_id
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_ledger_transaction(
    UUID, TEXT, NUMERIC, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_ledger_transaction(
    UUID, TEXT, NUMERIC, TEXT, TEXT
) TO service_role;
