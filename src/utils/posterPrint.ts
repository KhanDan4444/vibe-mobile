import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import {
  EncodingType,
  StorageAccessFramework,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function sanitizeFilenamePart(value: string, maxLen = 32) {
  return String(value || '')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, maxLen);
}

function dataUrlToBase64(dataUrl: string) {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/** Persist a QR data URL as a PNG in cache; returns a file:// URI for print HTML. */
export function cacheQrDataUrl(dataUrl: string, prefix = 'qr') {
  const file = new File(Paths.cache, `${prefix}-${Date.now()}.png`);
  file.create();
  file.write(dataUrlToBase64(dataUrl), { encoding: 'base64' });
  return file.uri;
}

type DownloadPdfOptions = {
  /** Called after the PDF is generated, before saving to the device. */
  onPdfReady?: () => void;
};

async function savePdfToAndroidDownloads(pdfUri: string, filename: string) {
  const base64 = await readAsStringAsync(pdfUri, { encoding: EncodingType.Base64 });
  const downloadsRoot = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsRoot);
  if (!permissions.granted) {
    throw new Error('Download permission denied');
  }
  const destUri = await StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    filename,
    'application/pdf'
  );
  await writeAsStringAsync(destUri, base64, { encoding: EncodingType.Base64 });
}

async function savePdfOnIos(pdfUri: string, filename: string) {
  const dest = new File(Paths.cache, filename);
  if (dest.exists) dest.delete();
  dest.create();
  new File(pdfUri).copy(dest);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Saving is not available on this device');
  }
  // iOS has no silent Downloads folder — user picks "Save to Files" in the sheet.
  await Sharing.shareAsync(dest.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: filename,
  });
}

/** Save a generated PDF like the web download (Downloads on Android, Save to Files on iOS). */
export async function downloadPdfFile(pdfUri: string, filename: string) {
  if (Platform.OS === 'android') {
    await savePdfToAndroidDownloads(pdfUri, filename);
    return;
  }
  await savePdfOnIos(pdfUri, filename);
}

export async function downloadHtmlAsPdf(html: string, filename: string, options?: DownloadPdfOptions) {
  const { uri } = await Print.printToFileAsync({ html });
  options?.onPdfReady?.();
  await downloadPdfFile(uri, filename);
}

export function gymQrPosterFilename(gymName: string, branchName: string) {
  const gym = sanitizeFilenamePart(gymName) || 'poster';
  const branch = sanitizeFilenamePart(branchName, 20);
  return branch ? `gym-qr-${gym}-${branch}.pdf` : `gym-qr-${gym}.pdf`;
}

export function memberPassFilename(memberName: string) {
  const safe = sanitizeFilenamePart(memberName, 40) || 'member';
  return `member-pass-${safe}.pdf`;
}
