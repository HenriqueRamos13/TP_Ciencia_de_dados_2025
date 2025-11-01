export interface ProductCheckData {
  price?: number;
  originalPrice?: number;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  additionalData?: Record<string, any>;
}

export class ProductCheck {
  public readonly productUrl: string;
  public readonly price: number | null;
  public readonly originalPrice: number | null;
  public readonly hasPromotion: boolean;
  public readonly discountPercentage: number | null;
  public readonly inStock: boolean;
  public readonly rating: number | null;
  public readonly reviewCount: number | null;
  public readonly additionalData: Record<string, any>;
  public readonly checkedAt: Date;

  constructor(productUrl: string, data: ProductCheckData) {
    this.productUrl = productUrl;
    this.price = data.price ?? null;
    this.originalPrice = data.originalPrice ?? null;
    this.hasPromotion = !!(data.originalPrice && data.price && data.price < data.originalPrice);
    this.discountPercentage = this.calculateDiscountPercentage();
    this.inStock = data.inStock ?? true;
    this.rating = data.rating ?? null;
    this.reviewCount = data.reviewCount ?? null;
    this.additionalData = data.additionalData ?? {};
    this.checkedAt = new Date();
  }

  private calculateDiscountPercentage(): number | null {
    if (!this.hasPromotion || !this.price || !this.originalPrice) {
      return null;
    }
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }

  toJSON() {
    return {
      productUrl: this.productUrl,
      checkedAt: this.checkedAt.toISOString(),
      price: this.price,
      originalPrice: this.originalPrice,
      hasPromotion: this.hasPromotion,
      discountPercentage: this.discountPercentage,
      inStock: this.inStock,
      rating: this.rating,
      reviewCount: this.reviewCount,
      additionalData: this.additionalData
    };
  }
}
