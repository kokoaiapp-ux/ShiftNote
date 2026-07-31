interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPicture {
  readonly window: Window | null;
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
}

interface Window {
  readonly documentPictureInPicture?: DocumentPictureInPicture;
}
