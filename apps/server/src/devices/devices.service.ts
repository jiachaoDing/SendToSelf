import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { devices } from '../database/schema';

@Injectable()
export class DevicesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async register(name: string) {
    const existing = await this.db.query.devices.findFirst({
      where: eq(devices.name, name),
    });

    if (existing) {
      const [updated] = await this.db
        .update(devices)
        .set({ lastSeenAt: new Date() })
        .where(eq(devices.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(devices)
      .values({ name, lastSeenAt: new Date() })
      .returning();

    return created;
  }

  async touch(deviceId: number) {
    await this.db
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.id, deviceId));
  }

  async bumpAuthVersion(deviceId: number) {
    const device = await this.getById(deviceId);

    if (!device) {
      return null;
    }

    const [updated] = await this.db
      .update(devices)
      .set({
        authVersion: device.authVersion + 1,
        lastSeenAt: new Date(),
      })
      .where(eq(devices.id, deviceId))
      .returning();

    return updated;
  }

  async getById(deviceId: number) {
    return this.db.query.devices.findFirst({
      where: eq(devices.id, deviceId),
    });
  }
}
