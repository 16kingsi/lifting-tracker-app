// Hands a file to the phone's share sheet (Drive, email, Files and so on), or
// downloads it where sharing files isn't possible, such as on most computers.

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

export async function shareOrDownload(name: string, text: string, type: string): Promise<ShareResult> {
  // Chrome on Android only shares some kinds of file, and JSON may not be one of
  // them. A .txt copy of the same text is, and the app imports it all the same.
  const candidates = [
    new File([text], name, { type }),
    new File([text], name.replace(/\.\w+$/, '.txt'), { type: 'text/plain' }),
  ];

  for (const file of candidates) {
    if (!navigator.canShare?.({ files: [file] })) continue;
    try {
      await navigator.share({ files: [file], title: file.name });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      break; // sharing failed for some other reason, so download instead
    }
  }

  download(name, text, type);
  return 'downloaded';
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
