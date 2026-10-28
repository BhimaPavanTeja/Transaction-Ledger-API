const supabase = require('../supabase');
const { isValidUuid, sendError } = require('./helpers');

async function createAccount(req, res) {
  try {
    const { name } = req.body || {};

    if (typeof name !== 'string' || name.trim().length === 0) {
      return sendError(res, 400, 'Account name is required');
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert({ name: name.trim() })
      .select('id, name, balance, created_at')
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    console.error('Create account failed:', error.message);
    return sendError(res, 500, 'Failed to create account');
  }
}

async function getAccountBalance(req, res) {
  const { id } = req.params;

  if (!isValidUuid(id)) {
    return sendError(res, 400, 'Invalid account ID');
  }

  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, balance')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return sendError(res, 404, 'Account not found');
    }

    return res.json({
      account_id: data.id,
      balance: data.balance
    });
  } catch (error) {
    console.error('Get balance failed:', error.message);
    return sendError(res, 500, 'Failed to retrieve account balance');
  }
}

async function getAccountTransactions(req, res) {
  const { id } = req.params;

  if (!isValidUuid(id)) {
    return sendError(res, 400, 'Invalid account ID');
  }

  const type = req.query.type;

  if (
    type !== undefined &&
    type !== 'credit' &&
    type !== 'debit'
  ) {
    return sendError(res, 400, 'Type must be credit or debit');
  }

  const pageRaw = req.query.page ?? '1';
  const limitRaw = req.query.limit ?? '10';

  if (
    !/^[1-9]\d*$/.test(pageRaw) ||
    !/^[1-9]\d*$/.test(limitRaw)
  ) {
    return sendError(
      res,
      400,
      'Page and limit must be positive integers'
    );
  }

  const page = Number(pageRaw);
  const limit = Number(limitRaw);

  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    limit > 100 ||
    (page - 1) * limit > Number.MAX_SAFE_INTEGER
  ) {
    return sendError(
      res,
      400,
      'Invalid pagination values; limit cannot exceed 100'
    );
  }

  try {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (accountError) throw accountError;

    if (!account) {
      return sendError(res, 404, 'Account not found');
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from('transactions')
      .select(
        'id, account_id, type, amount, description, reference_id, created_at',
        { count: 'exact' }
      )
      .eq('account_id', id);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({
      account_id: id,
      transactions: data,
      pagination: {
        current_page: page,
        page_size: limit,
        total_records: count,
        total_pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get transaction history failed:', error.message);
    return sendError(res, 500, 'Failed to retrieve transaction history');
  }
}

module.exports = {
  createAccount,
  getAccountBalance,
  getAccountTransactions
};
