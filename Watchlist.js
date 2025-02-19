const fs = require('fs');
const path = require('path');

class Watchlist {
    /**
     * @param {string} dataDir - Directory to store JSON data
     */
    constructor(dataDir) {
        this.dataDir = dataDir;

        // Ensure the data directory exists
        fs.mkdirSync(this.dataDir, { recursive: true });
    }

    /**
     * Internal helper to compute the JSON file path
     * @returns {string} - The path to the watchlist.json file
     */
    _getFilePath() {
        return path.join(this.dataDir, 'watchlist.json');
    }

    /**
     * Internal helper to read data from the JSON file
     * @returns {object} - The watchlist data (ticker: note)
     */
    _readData() {
        try {
            const rawData = fs.readFileSync(this._getFilePath(), 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            // If file doesn't exist or invalid JSON, return empty object
            return {};
        }
    }

    /**
     * Internal helper to write data to the JSON file
     * @param {object} data - The watchlist data to be written
     */
    _writeData(data) {
        fs.writeFileSync(
            this._getFilePath(),
            JSON.stringify(data, null, 2),
            'utf8'
        );
    }

    /**
     * Add a ticker with a note to the watchlist
     * @param {string} ticker - The ticker symbol
     * @param {string} note - Additional information or notes about the ticker
     */
    add(ticker, note) {
        const data = this._readData();
        data[ticker] = note;
        this._writeData(data);
    }

    /**
     * Remove a ticker from the watchlist
     * @param {string} ticker - The ticker symbol
     */
    remove(ticker) {
        const data = this._readData();
        if (data.hasOwnProperty(ticker)) {
            delete data[ticker];
            this._writeData(data);
        }
    }

    /**
     * Check if a ticker exists in the watchlist
     * @param {string} ticker - The ticker symbol
     * @returns {boolean} - True if ticker is in the watchlist, false otherwise
     */
    exists(ticker) {
        const data = this._readData();
        return data.hasOwnProperty(ticker);
    }

    /**
     * List all tickers in the watchlist
     * @returns {object} - The complete watchlist data (ticker: note)
     */
    list() {
        return this._readData();
    }
}

module.exports = Watchlist;
