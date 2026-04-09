/**
 * Blood Group Predictor - Database Layer
 * IndexedDB wrapper for offline-first history storage.
 */

const DB = {
    NAME: 'BloodGroupDB',
    VERSION: 1,
    STORE: 'history',

    /**
     * Initialize the database.
     * @returns {Promise<IDBDatabase>}
     */
    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.NAME, this.VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE)) {
                    db.createObjectStore(this.STORE, { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject('IndexedDB error: ' + event.target.errorCode);
            };
        });
    },

    /**
     * Save a calculation to history.
     * @param {Object} data { parent1, parent2, results, timestamp }
     * @param {number} limit Max records to keep
     */
    saveCalculation: async function(data, limit = 50) {
        const db = await this.init();
        const tx = db.transaction(this.STORE, 'readwrite');
        const store = tx.objectStore(this.STORE);

        // Add timestamp if not present
        data.timestamp = data.timestamp || Date.now();

        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => {
                this.limitHistory(limit); // Cleanup with specific limit
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Retrieve the last X calculations.
     * @returns {Promise<Array>}
     */
    getHistory: async function(limit = 50) {
        const db = await this.init();
        const tx = db.transaction(this.STORE, 'readonly');
        const store = tx.objectStore(this.STORE);

        return new Promise((resolve, reject) => {
            const request = store.openCursor(null, 'prev'); // Most recent first
            const results = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Limit history to the specified count.
     */
    limitHistory: async function(limit = 50) {
        const db = await this.init();
        const tx = db.transaction(this.STORE, 'readwrite');
        const store = tx.objectStore(this.STORE);

        const countRequest = store.count();
        countRequest.onsuccess = () => {
            if (countRequest.result > limit) {
                const deleteTx = db.transaction(this.STORE, 'readwrite');
                const deleteStore = deleteTx.objectStore(this.STORE);
                const cursorRequest = deleteStore.openCursor(); // Oldest first
                cursorRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        deleteStore.delete(cursor.key);
                    }
                };
            }
        };
    }
};
