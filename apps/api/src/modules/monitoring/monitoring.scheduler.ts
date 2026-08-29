import type { MonitoringService } from './monitoring.service.js';

export class MonitoringScheduler {
  private timer: NodeJS.Timeout | null = null; private running = false;
  constructor(private readonly service: MonitoringService, private readonly intervalMinutes: number, private readonly batchSize: number, private readonly onError: (error: unknown) => void) {}
  start() { if (this.timer) return; void this.tick(); this.timer = setInterval(() => void this.tick(), this.intervalMinutes * 60_000); this.timer.unref(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  private async tick() { if (this.running) return; this.running = true; try { await this.service.runDue(this.batchSize); } catch (error) { this.onError(error); } finally { this.running = false; } }
}
