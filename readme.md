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

API:
    - get

Questions it needs to answer:
- What is the state of the market right now?
- What are the cheap options for a symbol
- Symbol snapshop
- Symbol analysis