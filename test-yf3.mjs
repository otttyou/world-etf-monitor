import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

const ALL_TICKERS = ['SPY', 'QQQ', 'IWM', 'ACWI', 'EFA', 'EEM', 'EWJ', 'MCHI', 'INDA', 'EWZ', 'EWG', 'EWU', 'TLT', 'GLD'];
const FX_TICKERS  = ['EURUSD=X', 'GBPUSD=X', 'JPY=X', 'CNH=X', 'INR=X', 'BRL=X', 'TRY=X', 'DX-Y.NYB'];

async function test() {
  console.log('=== ETFs ===');
  try {
    const results = await yf.quote(ALL_TICKERS, {}, { validateResult: false });
    const arr = Array.isArray(results) ? results : [results];
    arr.forEach(q => {
      const chg = q.regularMarketChangePercent != null
        ? (q.regularMarketChangePercent * 100).toFixed(2) + '%'
        : 'N/A';
      console.log(`  ${q.symbol}: $${q.regularMarketPrice?.toFixed(2)} (${chg})`);
    });
  } catch(e) {
    console.error('ETF Error:', e.message);
  }

  console.log('\n=== FX ===');
  try {
    const results = await yf.quote(FX_TICKERS, {}, { validateResult: false });
    const arr = Array.isArray(results) ? results : [results];
    arr.forEach(q => {
      const chg = q.regularMarketChangePercent != null
        ? (q.regularMarketChangePercent * 100).toFixed(2) + '%'
        : 'N/A';
      console.log(`  ${q.symbol}: ${q.regularMarketPrice?.toFixed(4)} (${chg})`);
    });
  } catch(e) {
    console.error('FX Error:', e.message);
  }
}

test();
