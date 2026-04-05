export type MenuCategory = {
  id: string;
  name: string;
  /**
   * When false, category is omitted from the public QR menu only.
   * Admin menu still lists it so staff can manage internal buckets.
   */
  visibleOnPublicMenu?: boolean;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  available: boolean;
};

