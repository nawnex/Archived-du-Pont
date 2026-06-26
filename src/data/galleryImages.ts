export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  year?: number;
}

// No local images fallback - strictly dynamic from Google Drive
export const galleryImages: GalleryImage[] = [];
