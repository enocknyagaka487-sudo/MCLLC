import { db } from './index.ts';
import { users, tradingAccounts, botSettings } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
        },
      })
      .returning();

    const user = result[0];

    // Ensure user has default trading account
    const accounts = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.userId, user.id));

    if (accounts.length === 0) {
      await db.insert(tradingAccounts).values({
        userId: user.id,
        balance: 10000.0,
        equity: 10000.0,
        targetProfitPercent: 0.10,
        liquidationsCount: 0,
        riskLiquidationsCount: 0,
        totalRealizedProfit: 0.0,
      });
    }

    // Ensure user has default bot settings
    const settings = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.userId, user.id));

    if (settings.length === 0) {
      await db.insert(botSettings).values({
        userId: user.id,
        pollIntervalSec: 30,
        defaultLotSize: 0.05,
        maxSubTrades: 4,
        targetProfitPercent: 0.10,
        magicNumber: 998877,
        autoExecute: true,
        soundAlerts: true,
      });
    }

    return user;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Database operation failed for user record', { cause: error });
  }
}
