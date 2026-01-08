const axios = require('axios');

/**
 * Stock Market API Utility
 * Fetches real-time stock data for investment advice
 */

class StockMarketAPI {
  constructor() {
    // Using Yahoo Finance unofficial API (no key needed, unlimited)
    this.yahooBaseURL = 'https://query1.finance.yahoo.com/v8/finance/chart';
    this.quoteURL = 'https://query1.finance.yahoo.com/v6/finance/quote';
    
    // Common stock symbol mappings
    this.symbolMap = {
      // US Stocks
      'nvidia': 'NVDA',
      'nvda': 'NVDA',
      'apple': 'AAPL',
      'aapl': 'AAPL',
      'google': 'GOOGL',
      'googl': 'GOOGL',
      'microsoft': 'MSFT',
      'msft': 'MSFT',
      'amazon': 'AMZN',
      'amzn': 'AMZN',
      'meta': 'META',
      'facebook': 'META',
      'tesla': 'TSLA',
      'tsla': 'TSLA',
      'netflix': 'NFLX',
      'nflx': 'NFLX',
      
      // Indian Stocks (NSE)
      'reliance': 'RELIANCE.NS',
      'tcs': 'TCS.NS',
      'infosys': 'INFY.NS',
      'infy': 'INFY.NS',
      'hdfc': 'HDFCBANK.NS',
      'hdfc bank': 'HDFCBANK.NS',
      'hdfcbank': 'HDFCBANK.NS',
      'icici': 'ICICIBANK.NS',
      'icici bank': 'ICICIBANK.NS',
      'sbi': 'SBIN.NS',
      'state bank': 'SBIN.NS',
      'wipro': 'WIPRO.NS',
      'bharti airtel': 'BHARTIARTL.NS',
      'airtel': 'BHARTIARTL.NS',
      'hcl': 'HCLTECH.NS',
      'hcl tech': 'HCLTECH.NS',
      'itc': 'ITC.NS',
      'kotak': 'KOTAKBANK.NS',
      'kotak bank': 'KOTAKBANK.NS',
      'axis bank': 'AXISBANK.NS',
      'axis': 'AXISBANK.NS',
      'bajaj finance': 'BAJFINANCE.NS',
      'maruti': 'MARUTI.NS',
      'maruti suzuki': 'MARUTI.NS',
      'tata motors': 'TATAMOTORS.NS',
      'tata steel': 'TATASTEEL.NS',
      'adani': 'ADANIENT.NS',
      'adani enterprises': 'ADANIENT.NS',
      'zomato': 'ZOMATO.NS',
      'paytm': 'PAYTM.NS'
    };

    console.log('📈 Stock Market API initialized');
  }

  /**
   * Resolve stock name to symbol
   */
  resolveSymbol(query) {
    const normalized = query.toLowerCase().trim();
    
    // Direct match
    if (this.symbolMap[normalized]) {
      return this.symbolMap[normalized];
    }
    
    // Partial match
    for (const [key, symbol] of Object.entries(this.symbolMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return symbol;
      }
    }
    
    // If already looks like a symbol, return as-is
    if (normalized.toUpperCase() === normalized || normalized.includes('.')) {
      return query.toUpperCase();
    }
    
    return null;
  }

  /**
   * Fetch stock quote from Yahoo Finance
   */
  async getStockQuote(symbolOrName) {
    try {
      const symbol = this.resolveSymbol(symbolOrName) || symbolOrName.toUpperCase();
      
      console.log(`📊 Fetching stock data for: ${symbol}`);
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            interval: '1d',
            range: '5d'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        }
      );

      const result = response.data?.chart?.result?.[0];
      if (!result) {
        return null;
      }

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      const closes = quote?.close || [];
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose || closes[closes.length - 2];
      const change = currentPrice - previousClose;
      const changePercent = ((change / previousClose) * 100).toFixed(2);

      // Determine currency
      const isIndian = symbol.includes('.NS') || symbol.includes('.BO');
      const currency = isIndian ? '₹' : '$';
      const currencyCode = isIndian ? 'INR' : 'USD';

      return {
        symbol: symbol,
        name: meta.shortName || meta.symbol,
        exchange: meta.exchangeName,
        currency: currency,
        currencyCode: currencyCode,
        currentPrice: currentPrice,
        previousClose: previousClose,
        change: change,
        changePercent: parseFloat(changePercent),
        isUp: change >= 0,
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        marketCap: meta.marketCap,
        volume: meta.regularMarketVolume,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Stock API error:', error.message);
      return null;
    }
  }

  /**
   * Check if message is asking about stocks/investments
   */
  isStockQuery(message) {
    const stockKeywords = [
      'stock', 'share', 'invest', 'buy', 'sell',
      'nvidia', 'nvda', 'apple', 'google', 'microsoft', 'amazon', 'tesla', 'meta',
      'reliance', 'tcs', 'infosys', 'hdfc', 'icici', 'sbi', 'wipro', 'airtel',
      'market price', 'stock price', 'share price', 'current price',
      'should i invest', 'good investment', 'bad investment',
      'nifty', 'sensex', 'nasdaq', 'dow jones'
    ];
    
    const lowerMessage = message.toLowerCase();
    return stockKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Extract stock names from message
   */
  extractStockNames(message) {
    const stocks = [];
    const lowerMessage = message.toLowerCase();
    
    for (const [name, symbol] of Object.entries(this.symbolMap)) {
      if (lowerMessage.includes(name)) {
        stocks.push({ name, symbol });
      }
    }
    
    return stocks;
  }

  /**
   * Get investment context with stock data
   */
  async getInvestmentContext(message) {
    if (!this.isStockQuery(message)) {
      return null;
    }

    const stocks = this.extractStockNames(message);
    if (stocks.length === 0) {
      return null;
    }

    // Fetch data for mentioned stocks
    const stockData = [];
    for (const stock of stocks.slice(0, 3)) { // Max 3 stocks
      const data = await this.getStockQuote(stock.symbol);
      if (data) {
        stockData.push(data);
      }
    }

    if (stockData.length === 0) {
      return null;
    }

    return {
      stocks: stockData,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Format stock data for AI context
   */
  formatStockContext(stockData) {
    if (!stockData || !stockData.stocks || stockData.stocks.length === 0) {
      return '';
    }

    let context = '\n\n## 📈 REAL-TIME STOCK DATA (Just fetched):\n';
    
    for (const stock of stockData.stocks) {
      const direction = stock.isUp ? '📈' : '📉';
      const sign = stock.isUp ? '+' : '';
      
      context += `\n**${stock.name} (${stock.symbol})**\n`;
      context += `- Current Price: ${stock.currency}${stock.currentPrice.toLocaleString('en-IN')}\n`;
      context += `- Today's Change: ${sign}${stock.currency}${stock.change.toFixed(2)} (${sign}${stock.changePercent}%) ${direction}\n`;
      context += `- Day Range: ${stock.currency}${stock.dayLow?.toLocaleString('en-IN')} - ${stock.currency}${stock.dayHigh?.toLocaleString('en-IN')}\n`;
      context += `- 52-Week Range: ${stock.currency}${stock.fiftyTwoWeekLow?.toLocaleString('en-IN')} - ${stock.currency}${stock.fiftyTwoWeekHigh?.toLocaleString('en-IN')}\n`;
      context += `- Exchange: ${stock.exchange}\n`;
    }

    context += `\n**Data fetched at:** ${new Date().toLocaleString('en-IN')}\n`;
    context += `\n**IMPORTANT:** Use this REAL price data when answering investment questions. Calculate actual share quantities and amounts.\n`;
    
    return context;
  }
}

// Export singleton
module.exports = new StockMarketAPI();
