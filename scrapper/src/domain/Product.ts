export class Product {
  constructor(
    public readonly url: string,
    public readonly title: string,
    public readonly removedAt: Date | null = null
  ) {}

  static fromScrapedData(data: { url: string; title: string }): Product {
    return new Product(data.url, data.title, null);
  }

  toJSON() {
    return {
      url: this.url,
      title: this.title,
      removedAt: this.removedAt
    };
  }

  isAvailable(): boolean {
    return this.removedAt === null;
  }
}
