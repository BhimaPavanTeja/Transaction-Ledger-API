const supabase = require('../supabase');
const { sendError } = require('./helpers');

async function checkDatabase(req, res) {
  try {
    const { error } = await supabase
      .from('accounts')
      .select('id')
      .limit(1);

    if (error) throw error;

    return res.json({
      status: 'success',
      message: 'Supabase database connection is working'
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    return sendError(res, 500, 'Database query failed');
  }
}

module.exports = { checkDatabase };
