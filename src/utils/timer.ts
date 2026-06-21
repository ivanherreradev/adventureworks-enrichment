export class Timer {
  private startMs: number;

  constructor() {
    this.startMs = Date.now();
  }

  public elapsedMs(): number {
    return Date.now() - this.startMs;
  }

  public reset(): void {
    this.startMs = Date.now();
  }
}
