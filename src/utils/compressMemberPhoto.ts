import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 800;
const TARGET_MAX_BYTES = 350 * 1024;

export async function compressMemberPhoto(uri: string): Promise<string> {
  let quality = 0.85;
  let result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  while (result.base64 && base64ByteSize(result.base64) > TARGET_MAX_BYTES && quality > 0.45) {
    quality -= 0.1;
    result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
  }

  if (!result.base64) {
    throw new Error('Could not compress the photo.');
  }

  return `data:image/jpeg;base64,${result.base64}`;
}

function base64ByteSize(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}
