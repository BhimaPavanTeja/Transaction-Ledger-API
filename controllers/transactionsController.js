const supabase = require('../supabase');
const { isValidUuid, sendError } = require('./helpers');

function transactionErrorResponse(error, res) {
  const message = error.message || '';

  const knownErrors = {
    INVALID_TYPE: [400, 'Transaction type must be credit or debit'],
    INVALID_AMOUNT: [400, 'Amount must be greater than zero and within the allowed limit'],
    INVALID_REFERENCE: [400, 'Reference ID is required'],
    INVALID_DESCRIPTION: [400, 'Description is required'],
    ACCOUNT_NOT_FOUND: [404, 'Account not found'],
    DUPLICATE_TRANSACTION: [409, 'Transaction reference already exists for this account'],
    INSUFFICIENT_BALANCE: [409, 'Insufficient account balance']
  };

  for (const [key, [status, description]] of Object.entries(knownErrors)) {
    if (message.includes(key)) {
      return sendError(res, status, description);
    }
  }

  console.error('Transaction database error:', message);

  return sendError(res, 500, 'Failed to process transaction');
}

async function createTransaction(req, res) {
  const body = req.body || {};
  const {
    account_id,
    type,
    amount,
    description,
    reference_id
  } = body;

  if (!isValidUuid(account_id)) {
    return sendError(res, 400, 'A valid account_id UUID is required');
  }

  if (type !== 'credit' && type !== 'debit') {
    return sendError(res, 400, 'Type must be credit or debit');
  }

  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 9999999999999.99 ||
    Math.round(amount * 100) !== amount * 100
  ) {
    return sendError(
      res,
      400,
      'Amount must be a positive number with at most two decimal places'
    );
  }

  if (typeof description !== 'string' || !description.trim()) {
    return sendError(res, 400, 'Description is required');
  }

  if (typeof reference_id !== 'string' || !reference_id.trim()) {
    return sendError(res, 400, 'Reference ID is required');
  }

  try {
    const { data, error } = await supabase.rpc(
      'create_ledger_transaction',
      {
        p_account_id: account_id,
        p_type: type,
        p_amount: amount,
        p_description: description.trim(),
        p_reference_id: reference_id.trim()
      }
    );

    if (error) {
      return transactionErrorResponse(error, res);
    }

    return res.status(201).json({
      message: 'Transaction created successfully',
      transaction: data.transaction,
      balance: data.balance
    });
  } catch (error) {
    console.error('Create transaction failed:', error.message);
    return sendError(res, 500, 'Failed to process transaction');
  }
}

module.exports = { createTransaction };
