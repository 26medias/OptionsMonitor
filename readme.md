# Options Monitor

Monitor options on a watchlist

Requires ThetaTerminal: `java -jar ThetaTerminal.jar email password`

Tracks:
- OHLCV
- MarketCYcle
- RSI
- News
- Reddit
- Options

Data tracking:
- Stock Data: Historical
- News
- Reddit: Historical
- Options

Logic:

- On timer:
    - Refresh news
    - Refresh reddit
- For each symbol in watchlist
    - Refresh stock data
    - Refresh options
    - Merge data
        - ticker
        - close
        - rsi
        - marketcycle
        - news_count
        - positive_news_count
        - negative_news_count
        - reddit_rank
        - reddit_rank_change
        - reddit_mentions
        - reddit_mentions_change
        - reddit_upvotes
        - cheapest_call
    - Save to file


Questions it needs to answer:

- [x] What is the state of the market right now? (`node scan --refresh --day 100 --week 40 --month 40 --price 1000`)
    - [x] Stock data
    - [x] Indicator data
    - [x] Cheapest options
- [x] What are the cheap options for a symbol
- [~] Symbol snapshop (`node snapshot {ticker}`)
    - Needs:
        - [x] Stock data
        - [x] Indicator data
        - [x] Reddit data
        - [x] News
        - [x] Options
    - Displays:
        - [x] Price
        - [x] Indicators
        - [ ] Price context (week change, ...)
        - [~] Reddit stats `buggy when no data`
        - [x] News stats
        - [ ] News summary
        - [x] Cheapest options
- [ ] Symbol analysis (Symbol snapshop via GPT)

Add:
- [ ] avgPercentPerDayLasy6Months
- [ ] server
- [ ] scan cli -> endpoint
- [ ] Web UI with refresh