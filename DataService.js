/**
 * Facility Repair System (FRS)
 * DataService.gs
 * Version 2.3.03
 *
 * Phase 1 performance foundation:
 * - Execution-level Spreadsheet/Sheet/Header/Row cache
 * - Runtime indexes for key-based lookup
 * - Optional short-lived Script Cache for master data
 * - Automatic cache invalidation after writes
 * - Grouped row deletion to reduce Spreadsheet service calls
 */

const DataService = {
  _runtime: {
    spreadsheet: null,
    sheets: Object.create(null),
    headers: Object.create(null),
    rows: Object.create(null),
    indexes: Object.create(null),
    diagnostics: {
      spreadsheetOpens: 0,
      sheetLookups: 0,
      sheetReads: 0,
      runtimeRowHits: 0,
      scriptCacheHits: 0,
      scriptCacheMisses: 0,
      indexBuilds: 0,
      indexHits: 0,
      writes: 0,
      deleteBatches: 0
    }
  },

  ss() {
    if (this._runtime.spreadsheet) return this._runtime.spreadsheet;

    const id = APP_CONFIG.SPREADSHEET_ID;
    if (!id || id === 'PUT_YOUR_SPREADSHEET_ID_HERE') {
      throw new Error('ยังไม่ได้ตั้งค่า SPREADSHEET_ID ในไฟล์ Config.gs');
    }

    this._runtime.spreadsheet = SpreadsheetApp.openById(id);
    this._runtime.diagnostics.spreadsheetOpens++;
    return this._runtime.spreadsheet;
  },

  sheet(sheetName) {
    const key = String(sheetName || '');
    if (this._runtime.sheets[key]) return this._runtime.sheets[key];

    const sh = this.ss().getSheetByName(key);
    this._runtime.diagnostics.sheetLookups++;
    if (!sh) throw new Error('ไม่พบ Sheet: ' + key + ' กรุณารัน setupInitialDatabase()');

    this._runtime.sheets[key] = sh;
    return sh;
  },

  getHeaders(sheetName) {
    const key = String(sheetName || '');
    if (this._runtime.headers[key]) return this._runtime.headers[key].slice();

    const sh = this.sheet(key);
    const lastCol = sh.getLastColumn();
    const headers = lastCol === 0
      ? []
      : sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(String);

    this._runtime.headers[key] = headers;
    return headers.slice();
  },

  getRows(sheetName, options) {
    return this._cloneRows_(this._getCanonicalRows_(sheetName, options || {}));
  },

  getRowsCached(sheetName) {
    return this.getRows(sheetName, { useScriptCache: true });
  },

  findOne(sheetName, keyField, keyValue) {
    const row = this._findOneInternal_(sheetName, keyField, keyValue, false, {});
    return row ? this._cloneRow_(row) : null;
  },

  findOneCached(sheetName, keyField, keyValue) {
    const row = this._findOneInternal_(sheetName, keyField, keyValue, false, { useScriptCache: true });
    return row ? this._cloneRow_(row) : null;
  },

  findOneCaseInsensitive(sheetName, keyField, keyValue) {
    const row = this._findOneInternal_(sheetName, keyField, keyValue, true, {});
    return row ? this._cloneRow_(row) : null;
  },

  findAll(sheetName, keyField, keyValue) {
    return this._cloneRows_(this._findAllInternal_(sheetName, keyField, keyValue, false, {}));
  },

  findAllCaseInsensitive(sheetName, keyField, keyValue) {
    return this._cloneRows_(this._findAllInternal_(sheetName, keyField, keyValue, true, {}));
  },

  appendRow(sheetName, object) {
    const sh = this.sheet(sheetName);
    const headers = this.getHeaders(sheetName);
    const source = object || {};
    const row = headers.map(function(header) {
      const value = source[header] !== undefined ? source[header] : '';
      return Utils.sanitizeSheetValue(value);
    });

    const rowNumber = sh.getLastRow() + 1;
    sh.getRange(rowNumber, 1, 1, row.length).setValues([row]);
    this._runtime.diagnostics.writes++;
    this._appendRuntimeRows_(sheetName, headers, [row], rowNumber);
    this._removeScriptCache_(sheetName);
    return row;
  },

  appendRows(sheetName, objects) {
    if (!objects || objects.length === 0) return 0;

    const sh = this.sheet(sheetName);
    const headers = this.getHeaders(sheetName);
    const rows = objects.map(function(object) {
      const source = object || {};
      return headers.map(function(header) {
        const value = source[header] !== undefined ? source[header] : '';
        return Utils.sanitizeSheetValue(value);
      });
    });

    const startRow = sh.getLastRow() + 1;
    sh.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
    this._runtime.diagnostics.writes++;
    this._appendRuntimeRows_(sheetName, headers, rows, startRow);
    this._removeScriptCache_(sheetName);
    return rows.length;
  },

  updateRowByKey(sheetName, keyField, keyValue, patchObject) {
    const headers = this.getHeaders(sheetName);
    const keyIndex = headers.indexOf(keyField);
    if (keyIndex === -1) throw new Error('ไม่พบ keyField: ' + keyField);

    // Writes always refresh from the sheet when the runtime has not loaded the table yet.
    // This prevents a stale cross-execution master cache from being used as a write base.
    const runtimeKey = String(sheetName || '');
    const rows = this._isCacheableSheet_(runtimeKey)
      ? this._readRowsFromSheet_(sheetName)
      : (this._runtime.rows[runtimeKey] || this._readRowsFromSheet_(sheetName));

    const target = rows.find(function(row) {
      return String(row[keyField]) === String(keyValue);
    });
    if (!target) return false;

    const patch = patchObject || {};
    const values = headers.map(function(header) {
      return target[header] === undefined ? '' : target[header];
    });

    Object.keys(patch).forEach(function(field) {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1) values[colIndex] = Utils.sanitizeSheetValue(patch[field]);
    });

    this.sheet(sheetName).getRange(target._rowNumber, 1, 1, headers.length).setValues([values]);
    this._runtime.diagnostics.writes++;

    headers.forEach(function(header, i) {
      target[header] = values[i];
    });
    this._invalidateIndexes_(sheetName);
    this._removeScriptCache_(sheetName);
    return true;
  },

  deleteRowsWhere(sheetName, predicate) {
    const sh = this.sheet(sheetName);
    const rows = this._readRowsFromSheet_(sheetName).filter(predicate);
    if (rows.length === 0) return 0;

    const rowNumbers = rows.map(function(row) { return row._rowNumber; }).sort(function(a, b) { return b - a; });
    const groups = this._groupDescendingRows_(rowNumbers);

    groups.forEach(function(group) {
      sh.deleteRows(group.start, group.count);
      DataService._runtime.diagnostics.deleteBatches++;
    });

    this._runtime.diagnostics.writes++;
    this.invalidate(sheetName);
    return rows.length;
  },

  invalidate(sheetName) {
    const key = String(sheetName || '');
    delete this._runtime.headers[key];
    delete this._runtime.rows[key];
    delete this._runtime.sheets[key];
    this._invalidateIndexes_(key);
    this._removeScriptCache_(key);
  },

  invalidateAll() {
    const masterSheets = this._cacheableSheets_();
    this._runtime.spreadsheet = null;
    this._runtime.sheets = Object.create(null);
    this._runtime.headers = Object.create(null);
    this._runtime.rows = Object.create(null);
    this._runtime.indexes = Object.create(null);
    masterSheets.forEach(function(sheetName) {
      DataService._removeScriptCache_(sheetName);
    });
  },

  resetRuntimeForTest_() {
    this._runtime.spreadsheet = null;
    this._runtime.sheets = Object.create(null);
    this._runtime.headers = Object.create(null);
    this._runtime.rows = Object.create(null);
    this._runtime.indexes = Object.create(null);
  },

  getDiagnostics() {
    return Object.assign({}, this._runtime.diagnostics);
  },

  _getCanonicalRows_(sheetName, options) {
    const key = String(sheetName || '');
    if (this._runtime.rows[key]) {
      this._runtime.diagnostics.runtimeRowHits++;
      return this._runtime.rows[key];
    }

    const useScriptCache = Boolean(options && options.useScriptCache) && this._isCacheableSheet_(key);
    if (useScriptCache) {
      const cached = this._readScriptCache_(key);
      if (cached) {
        this._runtime.rows[key] = cached;
        this._runtime.diagnostics.scriptCacheHits++;
        return cached;
      }
      this._runtime.diagnostics.scriptCacheMisses++;
    }

    const rows = this._readRowsFromSheet_(key);
    if (useScriptCache) this._writeScriptCache_(key, rows);
    return rows;
  },

  _readRowsFromSheet_(sheetName) {
    const key = String(sheetName || '');
    const sh = this.sheet(key);
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();

    if (lastRow <= 1 || lastCol === 0) {
      this._runtime.rows[key] = [];
      this._runtime.headers[key] = lastCol ? this.getHeaders(key) : [];
      this._runtime.diagnostics.sheetReads++;
      this._invalidateIndexes_(key);
      return this._runtime.rows[key];
    }

    const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = values[0].map(String);
    const rows = [];

    for (let r = 1; r < values.length; r++) {
      const sourceRow = values[r];
      const hasData = sourceRow.some(function(cell) {
        return cell !== '' && cell !== null;
      });
      if (!hasData) continue;

      const obj = { _rowNumber: r + 1 };
      headers.forEach(function(header, i) {
        obj[header] = sourceRow[i];
      });
      rows.push(obj);
    }

    this._runtime.headers[key] = headers;
    this._runtime.rows[key] = rows;
    this._runtime.diagnostics.sheetReads++;
    this._invalidateIndexes_(key);
    return rows;
  },

  _findOneInternal_(sheetName, keyField, keyValue, caseInsensitive, options) {
    const key = String(sheetName || '');
    const rows = this._getCanonicalRows_(key, options || {});
    const indexKey = [key, keyField, caseInsensitive ? 'CI' : 'CS'].join('|');
    let index = this._runtime.indexes[indexKey];

    if (!index) {
      index = Object.create(null);
      rows.forEach(function(row) {
        const raw = row[keyField];
        const normalized = caseInsensitive
          ? String(raw === undefined || raw === null ? '' : raw).toLowerCase()
          : String(raw === undefined || raw === null ? '' : raw);
        if (!Object.prototype.hasOwnProperty.call(index, normalized)) index[normalized] = row;
      });
      this._runtime.indexes[indexKey] = index;
      this._runtime.diagnostics.indexBuilds++;
    } else {
      this._runtime.diagnostics.indexHits++;
    }

    const lookup = caseInsensitive ? String(keyValue || '').toLowerCase() : String(keyValue);
    return Object.prototype.hasOwnProperty.call(index, lookup) ? index[lookup] : null;
  },

  _findAllInternal_(sheetName, keyField, keyValue, caseInsensitive, options) {
    const key = String(sheetName || '');
    const rows = this._getCanonicalRows_(key, options || {});
    const indexKey = [key, keyField, caseInsensitive ? 'ALL_CI' : 'ALL_CS'].join('|');
    let index = this._runtime.indexes[indexKey];

    if (!index) {
      index = Object.create(null);
      rows.forEach(function(row) {
        const raw = row[keyField];
        const normalized = caseInsensitive
          ? String(raw === undefined || raw === null ? '' : raw).toLowerCase()
          : String(raw === undefined || raw === null ? '' : raw);
        if (!index[normalized]) index[normalized] = [];
        index[normalized].push(row);
      });
      this._runtime.indexes[indexKey] = index;
      this._runtime.diagnostics.indexBuilds++;
    } else {
      this._runtime.diagnostics.indexHits++;
    }

    const lookup = caseInsensitive ? String(keyValue || '').toLowerCase() : String(keyValue);
    return index[lookup] || [];
  },

  _appendRuntimeRows_(sheetName, headers, rows, startRow) {
    const key = String(sheetName || '');
    if (!this._runtime.rows[key]) return;

    rows.forEach(function(values, offset) {
      const obj = { _rowNumber: startRow + offset };
      headers.forEach(function(header, i) { obj[header] = values[i]; });
      DataService._runtime.rows[key].push(obj);
    });
    this._invalidateIndexes_(key);
  },

  _invalidateIndexes_(sheetName) {
    const prefix = String(sheetName || '') + '|';
    Object.keys(this._runtime.indexes).forEach(function(key) {
      if (key.indexOf(prefix) === 0) delete DataService._runtime.indexes[key];
    });
  },

  _cloneRows_(rows) {
    return (rows || []).map(this._cloneRow_);
  },

  _cloneRow_(row) {
    return Object.assign({}, row || {});
  },

  _groupDescendingRows_(rowNumbers) {
    if (!rowNumbers.length) return [];
    const groups = [];
    let high = rowNumbers[0];
    let low = high;

    for (let i = 1; i < rowNumbers.length; i++) {
      const current = rowNumbers[i];
      if (current === low - 1) {
        low = current;
      } else {
        groups.push({ start: low, count: high - low + 1 });
        high = current;
        low = current;
      }
    }
    groups.push({ start: low, count: high - low + 1 });
    return groups;
  },

  _cacheableSheets_() {
    const performance = APP_CONFIG.PERFORMANCE || {};
    if (Array.isArray(performance.CACHEABLE_SHEETS) && performance.CACHEABLE_SHEETS.length) {
      return performance.CACHEABLE_SHEETS;
    }

    // Safe defaults allow the upgrade package to work without replacing Config.gs.
    const sheets = APP_CONFIG.SHEETS || {};
    return [
      sheets.MASTER_STATUS,
      sheets.MASTER_SLA,
      sheets.MASTER_SYSTEMS,
      sheets.MASTER_LOCATIONS,
      sheets.MASTER_DEPARTMENTS
    ].filter(Boolean);
  },

  _isCacheableSheet_(sheetName) {
    const performance = APP_CONFIG.PERFORMANCE || {};
    return performance.ENABLE_SCRIPT_CACHE !== false && this._cacheableSheets_().indexOf(sheetName) !== -1;
  },

  _scriptCacheKey_(sheetName) {
    const performance = APP_CONFIG.PERFORMANCE || {};
    const prefix = performance.CACHE_KEY_PREFIX || 'FRS_DATA_';
    return prefix + String(sheetName || '');
  },

  _readScriptCache_(sheetName) {
    try {
      if (typeof CacheService === 'undefined') return null;
      const raw = CacheService.getScriptCache().get(this._scriptCacheKey_(sheetName));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      console.warn('FRS Script Cache read failed: ' + err.message);
      return null;
    }
  },

  _writeScriptCache_(sheetName, rows) {
    try {
      if (typeof CacheService === 'undefined') return;
      const performance = APP_CONFIG.PERFORMANCE || {};
      const ttl = Number(performance.MASTER_CACHE_SECONDS || 300);
      const maxChars = Number(performance.MAX_CACHE_JSON_CHARS || 90000);
      const serialized = JSON.stringify(rows || []);
      if (serialized.length > maxChars) return;
      CacheService.getScriptCache().put(this._scriptCacheKey_(sheetName), serialized, ttl);
    } catch (err) {
      console.warn('FRS Script Cache write failed: ' + err.message);
    }
  },

  _removeScriptCache_(sheetName) {
    try {
      if (typeof CacheService === 'undefined') return;
      CacheService.getScriptCache().remove(this._scriptCacheKey_(sheetName));
    } catch (err) {
      console.warn('FRS Script Cache invalidation failed: ' + err.message);
    }
  }
};
