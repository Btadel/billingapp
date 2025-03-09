
class HashTable {
    constructor(size = 50) {
        this.buckets = new Array(size);
        this.size = size;
    }

    _hash(key) {
        let hash = 5381;
        for (let i = 0; i < key.length; i++) {
            hash = (hash * 33) + key.charCodeAt(i);
        }
        return hash % this.size;
    }

    set(key, value) {
        const index = this._hash(key);
        if (!this.buckets[index]) {
            this.buckets[index] = [];
        }
        this.buckets[index].push([key, value]);
    }

    get(key) {
        const index = this._hash(key);
        if (!this.buckets[index]) return undefined;

        for (const bucket of this.buckets[index]) {
            if (bucket[0] === key) {
                return bucket[1];
            }
        }
        return undefined;

    } 
    entries() {
        const allEntries = [];
        for (const bucket of this.buckets) {
          if (bucket) {
            for (const pair of bucket) {
              allEntries.push(pair);
            }
          }
        }
        return allEntries;
      }

    remove(key) {
        const index = this._hash(key);
        if (!this.buckets[index]) return false;

        for (let i = 0; i < this.buckets[index].length; i++) {
            if (this.buckets[index][i][0] === key) {
                this.buckets[index].splice(i, 1);
                return true;
            }
        }
        return false;
    }
}


export default HashTable;
