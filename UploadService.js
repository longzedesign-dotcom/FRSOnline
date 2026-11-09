/**
 * Facility Repair System (FRS)
 * UploadService.gs
 * Version 2.3.03
 */

const UploadService = {
  saveBase64Image(base64Data, requestId, imageType) {
    if (!base64Data) return null;

    const rootFolder = this.getRootFolder_();
    const matches = String(base64Data).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!matches) throw new Error('รูปแบบไฟล์รูปภาพไม่ถูกต้อง');

    const mimeType = String(matches[1]).toLowerCase();
    const encoded = matches[2];
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];

    if (allowed.indexOf(mimeType) === -1) {
      throw new Error('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG และ WEBP');
    }

    const bytes = Utilities.base64Decode(encoded);
    if (bytes.length > APP_CONFIG.MAX_UPLOAD_BYTES) {
      throw new Error('รูปภาพหลังย่อมีขนาดเกินที่ระบบกำหนด กรุณาเลือกรูปใหม่');
    }

    const extensionMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    const folder = this.getRequestFolder_(rootFolder, requestId);
    const safeType = String(imageType || 'request').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'request';
    const filename = requestId + '_' + safeType + '_' + Utils.formatDate(new Date(), 'yyyyMMdd_HHmmss') + '.' + extensionMap[mimeType];
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const file = folder.createFile(blob);

    return {
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: file.getName(),
      mimeType: mimeType,
      sizeBytes: bytes.length
    };
  },

  trashFile(fileId) {
    if (!fileId) return;
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (err) {
      console.error('TRASH_FILE_ERROR', err);
    }
  },

  getRootFolder_() {
    const folderId = APP_CONFIG.UPLOAD_FOLDER_ID;
    if (!folderId || folderId === 'PUT_YOUR_UPLOAD_FOLDER_ID_HERE') {
      throw new Error('ยังไม่ได้ตั้งค่า UPLOAD_FOLDER_ID ในไฟล์ Config.gs');
    }
    return DriveApp.getFolderById(folderId);
  },

  getRequestFolder_(rootFolder, requestId) {
    const year = Utils.formatDate(new Date(), 'yyyy');
    const month = Utils.formatDate(new Date(), 'MM');
    const yearFolder = this.getOrCreateFolder_(rootFolder, year);
    const monthFolder = this.getOrCreateFolder_(yearFolder, month);
    return this.getOrCreateFolder_(monthFolder, requestId);
  },

  getOrCreateFolder_(parent, name) {
    const iterator = parent.getFoldersByName(name);
    return iterator.hasNext() ? iterator.next() : parent.createFolder(name);
  }
};
